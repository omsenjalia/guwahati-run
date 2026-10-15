import { fetchWatch, loadWatch, refreshWatch, saveWatch } from "@/lib/jobs/watch-sync";
import { serverDb } from "@/lib/supabase/server";
import { CLASSES, WATCH_PREFIX, type Watch } from "@/lib/watches";

export const maxDuration = 30;

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const station = (s: unknown) => (typeof s === "string" ? s.trim().toUpperCase() : "");

/**
 * Extra PNRs and waitlist routes from the Tickets page (team only, see proxy.ts).
 *   POST    add one (checked once first, so a typo is caught right away)
 *   PATCH   { id } check one now
 *   DELETE  { id } stop tracking
 */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return fail("Bad request");
  const base = { id: crypto.randomUUID().slice(0, 8), addedBy: typeof b.addedBy === "string" ? b.addedBy : null, addedAt: Date.now(), history: [] };

  let draft: Watch;
  if (b.kind === "pnr") {
    const pnr = String(b.pnr ?? "").replace(/\D/g, "");
    if (pnr.length !== 10) return fail("A PNR is 10 digits.");
    draft = { ...base, kind: "pnr", pnr };
  } else if (b.kind === "route") {
    const trainNo = String(b.trainNo ?? "").replace(/\D/g, "");
    const from = station(b.from);
    const to = station(b.to);
    const date = String(b.date ?? "");
    const travelClass = String(b.travelClass ?? "");
    if (trainNo.length !== 5) return fail("A train number is 5 digits.");
    if (!/^[A-Z]{2,5}$/.test(from) || !/^[A-Z]{2,5}$/.test(to)) return fail("Use station codes, like NDLS or KYQ.");
    if (from === to) return fail("From and To are the same station.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Pick a date.");
    if (!(CLASSES as readonly string[]).includes(travelClass)) return fail("Pick a class.");
    draft = { ...base, kind: "route", trainNo, from, to, date, travelClass, quota: b.quota === "TQ" ? "TQ" : "GN" };
  } else {
    return fail("Bad request");
  }

  let watch: Watch;
  try {
    watch = await fetchWatch(draft);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(draft.kind === "pnr" ? `Couldn't find that PNR right now. ${msg.replace(/^All providers failed: /, "")}` : msg.replace(/^All providers failed: /, ""));
  }
  try {
    await saveWatch(watch, true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
  return Response.json({ watch });
}

export async function PATCH(request: Request) {
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  const w = id ? await loadWatch(id) : null;
  if (!w) return fail("Not found", 404);
  return Response.json({ watch: await refreshWatch(w) });
}

export async function DELETE(request: Request) {
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return fail("Bad request");
  const { error } = await serverDb().from("app_state").delete().eq("key", WATCH_PREFIX + id);
  if (error) return fail(error.message, 500);
  return Response.json({ ok: true });
}
