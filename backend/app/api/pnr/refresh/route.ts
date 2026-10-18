import { refreshPnr } from "@/lib/jobs/tick";

export const maxDuration = 60;

/** Attendee's "Check now" on one ticket (team only, proxy.ts): POST { legId }. */
export async function POST(request: Request) {
  const { legId } = (await request.json().catch(() => ({}))) as { legId?: string };
  if (typeof legId !== "string") return Response.json({ error: "Missing legId" }, { status: 400 });
  try {
    const r = await refreshPnr(legId);
    if (r.error) return Response.json({ error: r.error }, { status: r.status });
    return Response.json({ ok: r.result!.ok, message: r.result!.message }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
