import { documentLink } from "@/lib/docs-server";

export const maxDuration = 60;

/** A 10-minute link to view (or ?download) a document in the app. Team only (proxy.ts). */
export async function GET(request: Request, ctx: RouteContext<"/api/docs/[id]/link">) {
  const { id } = await ctx.params;
  try {
    const url = await documentLink(id, new URL(request.url).searchParams.has("download"));
    if (!url) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
