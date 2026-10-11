import { documentBytes } from "@/lib/docs-server";
import { extFor } from "@/lib/documents";
import { serverDb } from "@/lib/supabase/server";

/** Vercel caps a response at 4.5 MB: bigger files go through a short-lived storage link. */
const DIRECT_LIMIT = 4 * 1024 * 1024;

/**
 * Streams a document from the private GitHub repo. Team only (proxy.ts);
 * the token stays on the server. Content never changes for a given ?v=
 * (the file's SHA), so phones can cache it for offline viewing.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/docs/[id]/file">) {
  const { id } = await ctx.params;
  try {
    const found = await documentBytes(id);
    if (!found) return new Response("Not found", { status: 404 });
    const { doc, bytes } = found;
    const name = doc.path.split("/").pop() ?? "file";
    const download = new URL(request.url).searchParams.has("download");

    if (bytes.byteLength > DIRECT_LIMIT) {
      const db = serverDb();
      const tmp = `cache/${doc.sha}.${extFor(doc.mime)}`;
      await db.storage.from("trip-files").upload(tmp, bytes, { contentType: doc.mime, upsert: true });
      const { data } = await db.storage.from("trip-files").createSignedUrl(tmp, 600, download ? { download: name } : undefined);
      if (data) return Response.redirect(data.signedUrl, 302);
    }
    return new Response(bytes, {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Error", { status: 502 });
  }
}
