import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";
import { api } from "@/core/api";
import { db, ensureDb } from "@/core/db";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, extFor, type DocUpload } from "@/lib/documents";

/**
 * Bills and tickets go to the private GitHub repo through our server, as on
 * the website: the file is staged in Supabase Storage (keeps the request
 * small), then /api/docs files it and creates the expense.
 */

export type Picked = { uri: string; mime: string; name?: string; size?: number };

async function bytes(uri: string) {
  return Platform.OS === "web" ? (await fetch(uri)).arrayBuffer() : new File(uri).arrayBuffer();
}

/** Photos shrunk to a 1600 px JPEG under 2 MB (re-encoding drops location data); PDFs as they are. */
export async function prepare(p: Picked): Promise<{ data: ArrayBuffer; mime: string }> {
  if (p.mime === "application/pdf") {
    const data = await bytes(p.uri);
    if (data.byteLength > MAX_PDF_BYTES) throw new Error("That PDF is over 20 MB. Ask for a smaller copy or take a photo instead.");
    return { data, mime: p.mime };
  }
  for (const [width, compress] of [
    [1600, 0.75],
    [1600, 0.6],
    [1280, 0.6],
    [1024, 0.55],
  ] as const) {
    const ref = await ImageManipulator.manipulate(p.uri).resize({ width }).renderAsync();
    const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress });
    const data = await bytes(out.uri);
    if (data.byteLength <= MAX_IMAGE_BYTES) return { data, mime: "image/jpeg" };
  }
  throw new Error("Couldn't make that photo small enough. Try again with less zoom.");
}

export async function uploadBill(file: Picked, meta: Omit<DocUpload, "staging" | "mime">) {
  const { data, mime } = await prepare(file);
  await ensureDb();
  const staging = `staging/${meta.id}.${extFor(mime)}`;
  const up = await db.storage.from("trip-files").upload(staging, data, { contentType: mime });
  // "Already exists" means an earlier try got this far: carry on.
  if (up.error && !/exist|duplicate/i.test(up.error.message)) throw new Error(`Upload failed: ${up.error.message}`);
  return api<{ doc: unknown }>("/api/docs", { method: "POST", body: JSON.stringify({ ...meta, staging, mime } satisfies DocUpload) });
}

/** Stable random id so a retried upload never creates a duplicate. */
export const newId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
