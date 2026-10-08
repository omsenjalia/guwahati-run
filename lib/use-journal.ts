"use client";

import { useEffect, useState } from "react";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";

/** Shared trip journal: notes and photos per day (journal_entries + private bucket). */

export type Entry = { id: string; day: string; author: string; body: string | null; photo_path: string | null; created_at: string };

const KEY = "journal";

export function useJournal() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<Entry[]>(KEY).then((saved) => alive && saved && setEntries((e) => e ?? saved));
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data } = await sb.from("journal_entries").select("*").order("created_at", { ascending: false });
      if (!alive || !data) return;
      setEntries(data as Entry[]);
      void idbSet(KEY, data);
      const paths = (data as Entry[]).map((e) => e.photo_path).filter((p): p is string => !!p);
      if (paths.length) {
        const { data: signed } = await sb.storage.from("trip-files").createSignedUrls(paths, 3600);
        if (alive && signed) {
          setUrls(Object.fromEntries(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : []))));
        }
      }
    };
    void load();
    const ch = sb
      .channel("journal")
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(ch);
    };
  }, []);

  return { entries, urls };
}

/** Shrink big phone photos before upload (saves data on the train). */
async function shrink(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
  } catch {
    return file;
  }
}

export async function addEntry(e: { day: string; author: string; body: string; photo: File | null }) {
  const sb = browserDb();
  if (!(await ensureSession())) throw new Error("No connection. Try again with signal.");
  let photo_path: string | null = null;
  if (e.photo) {
    photo_path = `journal/${e.day}/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from("trip-files").upload(photo_path, await shrink(e.photo), { contentType: "image/jpeg" });
    if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);
  }
  const { error } = await sb.from("journal_entries").insert({ day: e.day, author: e.author, body: e.body || null, photo_path });
  if (error) throw new Error(error.message);
}

export async function deleteEntry(entry: Entry) {
  const sb = browserDb();
  if (entry.photo_path) await sb.storage.from("trip-files").remove([entry.photo_path]);
  await sb.from("journal_entries").delete().eq("id", entry.id);
}
