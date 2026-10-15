/**
 * Checks the extra PNRs and waitlist routes added from the Tickets page
 * (see lib/watches.ts). Called by the tick, and right away when one is
 * added or refreshed from a phone.
 */
import { getAvailability, getPnrStatus } from "@/lib/providers/index.ts";
import { notify } from "@/lib/notify";
import { serverDb } from "@/lib/supabase/server";
import { dayMonth } from "@/lib/time";
import { WATCH_PREFIX, watchInterval, watchStatus, watchTitle, wlOf, type Watch } from "@/lib/watches";

const toDmy = (ymd: string) => ymd.split("-").reverse().join("-");

/** Fetches fresh status. Throws with a plain-English reason if it can't. */
export async function fetchWatch(w: Watch): Promise<Watch> {
  if (w.kind === "pnr") {
    const r = await getPnrStatus(w.pnr);
    return withPoint({ ...w, data: r.data, updatedAt: r.fetchedAt, error: undefined });
  }
  const r = await getAvailability({
    trainNo: w.trainNo,
    from: w.from,
    to: w.to,
    date: toDmy(w.date),
    travelClass: w.travelClass,
    quota: w.quota,
  });
  const day = r.data.find((a) => a.date === w.date && a.travelClass === w.travelClass);
  if (!day) throw new Error(`No ${w.travelClass} seats listed for ${w.trainNo} from ${w.from} to ${w.to} on that day. Check the train runs between those stations that day.`);
  return withPoint({ ...w, data: day, updatedAt: r.fetchedAt, error: undefined });
}

/** Adds a graph point when the status changed. */
function withPoint(w: Watch): Watch {
  const status = watchStatus(w);
  const last = w.history[w.history.length - 1];
  if (last?.status === status) return w;
  const statuses = w.kind === "pnr" ? (w.data?.passengers.map((p) => p.current) ?? []) : [status];
  const chance = w.kind === "route" ? w.data?.confirmChance : undefined;
  return { ...w, history: [...w.history, { t: w.updatedAt ?? Date.now(), status, wl: wlOf(statuses), chance }].slice(-300) };
}

export async function saveWatch(w: Watch, insert = false) {
  const db = serverDb();
  const row = { key: WATCH_PREFIX + w.id, value: w, updated_at: new Date().toISOString() };
  // update (not upsert) for refreshes, so a watch removed meanwhile stays removed
  const { error } = insert ? await db.from("app_state").insert(row) : await db.from("app_state").update(row).eq("key", row.key);
  if (error) throw new Error(error.message);
}

export async function loadWatch(id: string): Promise<Watch | null> {
  const { data } = await serverDb().from("app_state").select("value").eq("key", WATCH_PREFIX + id).maybeSingle();
  return (data?.value as Watch | undefined) ?? null;
}

/** Fetch, save, and alert on change. Never throws; failures are stored on the watch. */
export async function refreshWatch(prev: Watch): Promise<Watch> {
  let next: Watch;
  try {
    next = await fetchWatch(prev);
  } catch (e) {
    next = { ...prev, error: e instanceof Error ? e.message : String(e) };
  }
  await saveWatch(next);
  await alertChange(prev, next);
  return next;
}

async function alertChange(prev: Watch, next: Watch) {
  const before = watchStatus(prev);
  const after = watchStatus(next);
  if (!before || before === after) return;
  const title = watchTitle(next);
  if (next.kind === "pnr" && prev.kind === "pnr") {
    const chart = !prev.data?.chartPrepared && next.data?.chartPrepared;
    await notify({
      kind: chart ? "chart" : "pnr",
      title: chart ? `Chart prepared: ${title}` : `${title}: ${before} to ${after}`,
      body: `PNR ${next.pnr}`,
      url: `/tickets#w-${next.id}`,
      tag: `watch-${next.id}`,
    });
    return;
  }
  if (next.kind !== "route") return;
  // Route waitlists move with every booking; only alert when it crosses a line
  // (waitlist to RAC/available, or the other way, or into "regret").
  const band = (s: string) => (/REGRET|NOT AVAIL|CANCEL/i.test(s) ? "closed" : wlOf([s]) > 0 ? "wl" : "open");
  if (band(before) === band(after)) return;
  await notify({
    kind: "pnr",
    title: `${title} (${next.travelClass}): ${after}`,
    body: `Was ${before}. ${dayMonth(`${next.date}T00:00:00+05:30`)}, ${next.quota === "TQ" ? "Tatkal" : "General"} quota.`,
    url: `/tickets#w-${next.id}`,
    tag: `watch-${next.id}`,
  });
}

/** The tick's job: refresh every watch that's due. */
export async function syncWatches(now: number, force = false) {
  const { data, error } = await serverDb().from("app_state").select("value").like("key", `${WATCH_PREFIX}%`);
  if (error) throw new Error(error.message);
  const due = ((data ?? []).map((r) => r.value) as Watch[]).filter((w) => {
    const every = watchInterval(w, now);
    if (every === null) return false;
    return force || !w.updatedAt || now - w.updatedAt >= every - 60_000;
  });
  if (!due.length) return null;
  const lines: string[] = [];
  let failures = 0;
  for (const w of due) {
    const r = await refreshWatch(w);
    if (r.error) failures++;
    lines.push(`${watchTitle(r)}: ${r.error ?? watchStatus(r)}`);
  }
  return { ok: failures === 0, message: lines.join(" | ") };
}
