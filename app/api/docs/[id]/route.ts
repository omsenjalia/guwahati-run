import { deleteDocument, editDocument } from "@/lib/docs-server";
import type { DocEdit } from "@/lib/documents";

export const maxDuration = 60;

/** Edit a receipt's amount, category, note... (renames the file in GitHub if needed). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/docs/[id]">) {
  const { id } = await ctx.params;
  try {
    const doc = await editDocument(id, (await request.json()) as DocEdit);
    return Response.json({ doc });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

/** Delete from GitHub and the database (and the expense it proves). */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/docs/[id]">) {
  const { id } = await ctx.params;
  try {
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
