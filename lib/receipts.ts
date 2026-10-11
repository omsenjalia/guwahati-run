"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, extFor, type DocEdit, type DocRow, type DocUpload } from "@/lib/documents";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";

/**
 * Receipts and documents on the phone:
 *   prepareFile   photos shrunk to 1600 px JPEG (~75%), location data
 *                 stripped, under 2 MB; PDFs as they are (max 20 MB)
 *   queueUpload   saved in IndexedDB first, so nothing is lost on a train
 *                 with no signal; sent automatically when back online
 *   useDocuments  the list from the database, live and offline
 */

/* ------------------------------------------------------------ prepare */

export async function prepareFile(file: File): Promise<{ blob: Blob; mime: string }> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    if (file.size > MAX_PDF_BYTES) throw new Error("That PDF is over 20 MB. Ask for a smaller copy or take a photo instead.");
    return { blob: file, mime: "application/pdf" };
  }
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error("Pick a photo or a PDF.");
  }
  let bitmap: ImageBitmap;
  try {
    // Applies the camera's rotation before the metadata is dropped.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This phone can't read that photo format. Take a new photo or share it as JPEG.");
  }
  // Redrawing on a canvas keeps only pixels: EXIF (location, camera) is gone.
  for (const [width, quality] of [
    [1600, 0.75],
    [1600, 0.6],
    [1280, 0.6],
    [1024, 0.55],
  ] as const) {
    const scale = Math.min(1, width / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      bitmap.close();
      return { blob, mime: "image/jpeg" };
    }
  }
  bitmap.close();
  throw new Error("Couldn't make that photo small enough. Try again with less zoom.");
}

/* -------------------------------------------------------------- queue */

export type QueuedUpload = { meta: Omit<DocUpload, "staging" | "mime">; blob: Blob; mime: string; addedAt: number; error?: string };

const QUEUE_KEY = "upload-queue";
let queue: QueuedUpload[] | null = null;
let running = false;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  queue ??= (await idbGet<QueuedUpload[]>(QUEUE_KEY)) ?? [];
  return queue;
}
async function save(next: QueuedUpload[]) {
  queue = next;
  emit();
  await idbSet(QUEUE_KEY, next);
}

/** Saves the upload on the phone, then tries to send it straight away. */
export async function queueUpload(item: QueuedUpload) {
  const q = await load();
  await save([...q.filter((x) => x.meta.id !== item.meta.id), item]);
  void processQueue();
}

export async function discardUpload(id: string) {
  await save((await load()).filter((x) => x.meta.id !== id));
}

/** Sends everything waiting. Safe to call any time; one run at a time. */
export async function processQueue() {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    for (const item of [...(await load())]) {
      if (!navigator.onLine) break;
      try {
        await send(item);
        await save((await load()).filter((x) => x.meta.id !== item.meta.id));
      } catch (e) {
        const offline = !navigator.onLine || e instanceof TypeError; // fetch network error
        if (offline) break;
        await save((await load()).map((x) => (x.meta.id === item.meta.id ? { ...x, error: (e as Error).message } : x)));
      }
    }
  } finally {
    running = false;
  }
}

async function send(item: QueuedUpload) {
  if (!(await ensureSession())) throw new TypeError("No session");
  const staging = `staging/${item.meta.id}.${extFor(item.mime)}`;
  const up = await browserDb().storage.from("trip-files").upload(staging, item.blob, { contentType: item.mime });
  // "Already exists" means an earlier try got this far: carry on.
  if (up.error && !/exist|duplicate/i.test(up.error.message)) throw new Error(`Upload failed: ${up.error.message}`);
  const res = await fetch("/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...item.meta, staging, mime: item.mime } satisfies DocUpload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
}

/** Starts the background sender: on app open and whenever the phone comes back online. */
export function startUploads() {
  if (started) return;
  started = true;
  window.addEventListener("online", () => void processQueue());
  void load().then((q) => {
    emit();
    if (q.length) void processQueue();
  });
}

const EMPTY: QueuedUpload[] = [];
export function useUploadQueue() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => queue ?? EMPTY,
    () => EMPTY,
  );
}

/* -------------------------------------------------------- documents */

const DOCS_KEY = "documents";

export function useDocuments() {
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<DocRow[]>(DOCS_KEY).then((saved) => alive && saved && setDocs((cur) => cur ?? saved));
    const fetchDocs = async () => {
      if (!(await ensureSession())) return;
      const { data, error } = await sb.from("documents").select("*").order("created_at", { ascending: true });
      if (!alive) return;
      if (error) return setError(error.message);
      setDocs(data as DocRow[]);
      setError("");
      void idbSet(DOCS_KEY, data);
    };
    void fetchDocs();
    const channel = sb
      .channel(channelName("documents"))
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => void fetchDocs())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(channel);
    };
  }, []);
  return { docs, error };
}

export async function editDoc(id: string, edit: DocEdit) {
  const res = await fetch(`/api/docs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.doc as DocRow;
}

export async function deleteDoc(id: string) {
  const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
}
