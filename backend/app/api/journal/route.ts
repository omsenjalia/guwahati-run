import { serverDb } from "@/lib/supabase/server";

/**
 * The trip journal for reading (team and parents, proxy.ts): entries newest
 * first, each photo with a 1-hour link. Attendees write through the database.
 */
export async function GET() {
  const db = serverDb();
  const { data, error } = await db.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const paths = data.flatMap((e) => (e.photo_path ? [e.photo_path as string] : []));
  const signed = paths.length ? (await db.storage.from("trip-files").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urls = Object.fromEntries(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
  return Response.json({ entries: data, urls }, { headers: { "Cache-Control": "no-store" } });
}
