import { documentBytes } from "@/lib/docs-server";

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
    const name = found.doc.path.split("/").pop() ?? "file";
    const download = new URL(request.url).searchParams.has("download");
    return new Response(found.bytes, {
      headers: {
        "Content-Type": found.doc.mime,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Error", { status: 502 });
  }
}
