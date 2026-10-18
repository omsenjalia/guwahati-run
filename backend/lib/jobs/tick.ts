/**
 * The background brain. Supabase's scheduler calls /api/jobs/tick every
 * 5 minutes; this decides which jobs are due and runs them:
 *
 *   PNR sync      North East Express and its backup (15910): every 6h until
 *                 25 Oct, hourly from 26 Oct, every 15 min from 28 Oct 16:00
 *                 until the chart is out. Stops once charted, and stops for
 *                 the ticket we won't use once one of them clears. Every
 *                 other ticket: every 3h in the 3 days before departure.
 *   Live status   every tick (5 min) from 3h before departure to 1h after arrival
 *   Weather       every 3h
 *   Watches       extra PNRs / waitlist routes added on the Tickets page:
 *                 every 2h, every 30 min in the last 2 days (lib/watches.ts)
 *
 * Every job writes to Supabase (phones get it via Realtime) and logs a row
 * in job_runs for the system health panel.
 */
import * as trip from "@/data/trip";
import { BACKUPS, LEGS, PLACES, type Berth, type Leg, type PersonId } from "@/data/trip";
import type { TicketChoice } from "@/lib/ticket-choice";
import { AllProvidersFailed, getLiveRunningStatus, getPnrStatus } from "@/lib/providers/index.ts";
import type { LegLive, PassengerLive } from "@/lib/live-types";
import { notify } from "@/lib/notify";
import { runWatchers } from "@/lib/jobs/watchers";
import { syncWatches } from "@/lib/jobs/watch-sync";
import type { StopTime } from "@/lib/meal-planner";
import { serverDb } from "@/lib/supabase/server";
import { HOUR, MIN, istDateKey, ms } from "@/lib/time";
import { parseStatus } from "@/lib/trip-engine";
import { fetchWeatherMany } from "@/lib/weather";

export type JobName = "seed" | "pnr-sync" | "live-status" | "weather" | "watchers" | "schedules" | "watches";
type JobResult = { job: JobName; ok: boolean; message: string; source?: string; details?: unknown };

const BERTH_TYPES: Record<string, Berth["type"]> = {
  LB: "Lower",
  MB: "Middle",
  UB: "Upper",
  SL: "Side Lower",
  SU: "Side Upper",
};

/* ------------------------------------------------------------ schedule */

export function pnrInterval(leg: Leg, now: number, live?: LegLive): number | null {
  if (!leg.pnr) return null;
  if (live?.chartPrepared) return null; // final: berths known, nothing left to watch
  const depart = ms(leg.depart);
  if (now > depart + 30 * MIN) return null; // already on board
  // Other tickets (already RAC or confirmed): every 3h in the last 3 days, for
  // RAC upgrades, the chart's berths and the coach position.
  if (!leg.tracked) return now >= depart - 72 * HOUR ? 3 * HOUR : null;
  if (now >= ms("2026-10-28T16:00:00+05:30")) return 15 * MIN;
  if (now >= ms("2026-10-26T00:00:00+05:30")) return HOUR;
  return 6 * HOUR;
}

export function liveDue(leg: Leg, now: number, live?: LegLive) {
  const depart = ms(live?.expectedDepart ?? leg.depart);
  const arrive = ms(live?.expectedArrive ?? leg.arrive);
  return now >= depart - 3 * HOUR && now <= arrive + HOUR;
}

/** Due if the last success is older than the interval (1 min grace for tick jitter). */
const isDue = (last: number | undefined, interval: number, now: number) => !last || now - last >= interval - MIN;

/* ---------------------------------------------------------------- tick */

export async function runTick(opts: { force?: JobName[]; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  const force = new Set(opts.force ?? []);
  const db = serverDb();
  const results: JobResult[] = [];

  const { data: rows, error } = await db.from("leg_live").select("leg_id, data");
  if (error) throw new Error(`Supabase: ${error.message}`);
  const live = new Map<string, LegLive>((rows ?? []).map((r) => [r.leg_id, r.data as LegLive]));

  results.push(await logged("seed", () => seedTrip()));

  // PNR sync (the loser of North East vs backup is no longer watched)
  const { data: choiceRow } = await db.from("app_state").select("value").eq("key", "ticket-choice").maybeSingle();
  const loser = (choiceRow?.value as TicketChoice | undefined)?.loser;
  const pnrLegs = [...LEGS, ...BACKUPS].filter((l) => {
    if (!l.pnr || l.id === loser) return false;
    if (force.has("pnr-sync")) return !!l.tracked;
    const interval = pnrInterval(l, now, live.get(l.id));
    return interval !== null && isDue(live.get(l.id)?.pnrUpdatedAt, interval, now);
  });
  if (pnrLegs.length) results.push(await logged("pnr-sync", () => syncPnrs(pnrLegs, live)));

  // Live running status (the backup train too, until it loses)
  const liveLegs = [...LEGS, ...BACKUPS].filter(
    (l) => l.train && l.id !== loser && (force.has("live-status") || liveDue(l, now, live.get(l.id))),
  );
  if (liveLegs.length) results.push(await logged("live-status", () => syncLive(liveLegs, live)));

  // Extra PNRs and waitlist routes (only logged when something was due)
  const extra = await logged("watches", async () => (await syncWatches(now, force.has("watches"))) ?? { ok: true, message: "none due" });
  if (extra.message !== "none due") results.push(extra);

  // Timetables for the meal planner (once a day)
  const { data: sch } = await db.from("app_state").select("updated_at").eq("key", "schedules").maybeSingle();
  if (force.has("schedules") || isDue(sch ? Date.parse(sch.updated_at) : undefined, 24 * HOUR, now)) {
    results.push(await logged("schedules", () => syncSchedules(loser)));
  }

  // Weather
  const { data: w } = await db.from("app_state").select("updated_at").eq("key", "weather").maybeSingle();
  if (force.has("weather") || isDue(w ? Date.parse(w.updated_at) : undefined, 3 * HOUR, now)) {
    results.push(await logged("weather", syncWeather));
  }

  // Decisions and alerts from the freshest data (every tick).
  results.push(await logged("watchers", () => runWatchers(live, now)));

  // Heartbeat: phones show a warning if this goes quiet for 20+ minutes.
  const prevBeat = await db.from("app_state").select("value").eq("key", "heartbeat").maybeSingle();
  const failing = results.filter((r) => !r.ok).map((r) => r.job);
  const beat = {
    at: now,
    lastOkAt: failing.length ? ((prevBeat.data?.value as { lastOkAt?: number } | undefined)?.lastOkAt ?? null) : now,
    failing,
  };
  await db.from("app_state").upsert({ key: "heartbeat", value: beat, updated_at: new Date(now).toISOString() });

  return results;
}

/** Runs a job and records it in job_runs. Never throws. */
async function logged(job: JobName, fn: () => Promise<Omit<JobResult, "job">>): Promise<JobResult> {
  const started = new Date().toISOString();
  let r: JobResult;
  try {
    r = { job, ...(await fn()) };
  } catch (e) {
    r = { job, ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  const quiet = (job === "seed" && r.message === "unchanged") || (job === "watches" && r.message === "none due");
  if (!r.ok || !quiet) {
    await serverDb()
      .from("job_runs")
      .insert({
        job,
        started_at: started,
        finished_at: new Date().toISOString(),
        ok: r.ok,
        message: r.message.slice(0, 500),
        source: r.source ?? null,
        details: r.details ?? null,
      });
  }
  return r;
}

/* ---------------------------------------------------------------- seed */

/** Copies data/trip.ts into the database (first run, and whenever it changes). */
async function seedTrip() {
  const db = serverDb();
  // Payments made before the app existed (once, when the expenses table is empty).
  const exp = await db.from("expenses").select("id", { count: "exact", head: true });
  if (!exp.error && !exp.count) {
    await db.from("expenses").insert(trip.INITIAL_EXPENSES.map((e) => ({ ...e, created_by: "setup" })));
  }

  const snapshot = JSON.parse(JSON.stringify({ ...trip }));
  const { data } = await db.from("trip_snapshot").select("data").eq("id", 1).maybeSingle();
  if (data && stableJson(data.data) === stableJson(snapshot)) return { ok: true, message: "unchanged" };

  // Seed any checklist that doesn't exist yet (packing, grant documents, prep).
  // Done before saving the snapshot so a failure is retried on the next tick.
  const lists: [string, readonly string[]][] = [
    ["team", trip.PACKING_TEAM],
    ["grant", trip.GRANT.documents],
    ["demo", trip.DEMO_CHECKLIST],
    ...trip.TEAM.map((p): [string, readonly string[]] => [p.id, trip.PACKING_PERSONAL]),
  ];
  for (const [owner, labels] of lists) {
    const { count } = await db.from("packing_items").select("id", { count: "exact", head: true }).eq("owner", owner);
    if (!count) await db.from("packing_items").insert(labels.map((label, sort) => ({ owner, label, sort })));
  }
  const prep = await db.from("packing_items").select("id", { count: "exact", head: true }).eq("owner", "prep");
  if (!prep.count) {
    const { error } = await db
      .from("packing_items")
      .insert(trip.PREP.map((p, sort) => ({ owner: "prep", label: p.label, due: p.due, per_person: !!p.perPerson, sort })));
    if (error) throw new Error(`Prep checklist: ${error.message}. Run supabase/003_confirmed_trip.sql.`);
  }

  const { error } = await db.from("trip_snapshot").upsert({ id: 1, data: snapshot, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true, message: data ? "trip data updated" : "trip data seeded" };
}

/* ------------------------------------------------------------ PNR sync */

export const PNR_REFRESH_COOLDOWN = 2 * MIN;

/**
 * One ticket's PNR right now (the app's "Check now" button). At most once
 * per 2 minutes per ticket, counted from the last tap (a failed check
 * counts too), so ConfirmTkt isn't hammered.
 */
export async function refreshPnr(legId: string, now = Date.now()): Promise<{ status: number; result?: JobResult; error?: string }> {
  const leg = [...LEGS, ...BACKUPS].find((l) => l.id === legId && l.pnr);
  if (!leg) return { status: 404, error: "No ticket with that id" };
  const db = serverDb();
  const key = `pnr-refresh:${leg.id}`;
  const { data: last } = await db.from("app_state").select("value").eq("key", key).maybeSingle();
  const wait = ((last?.value as { at?: number } | undefined)?.at ?? 0) + PNR_REFRESH_COOLDOWN - now;
  if (wait > 0) return { status: 429, error: `Checked a moment ago. Try again in ${Math.ceil(wait / 1000)} seconds.` };
  await db.from("app_state").upsert({ key, value: { at: now }, updated_at: new Date(now).toISOString() });
  const { data: row } = await db.from("leg_live").select("data").eq("leg_id", leg.id).maybeSingle();
  const live = new Map<string, LegLive>(row ? [[leg.id, row.data as LegLive]] : []);
  return { status: 200, result: await logged("pnr-sync", () => syncPnrs([leg], live)) };
}

async function syncPnrs(legs: Leg[], live: Map<string, LegLive>) {
  const lines: string[] = [];
  let failures = 0;
  let source: string | undefined;

  for (const leg of legs) {
    const prev = live.get(leg.id) ?? { legId: leg.id };
    try {
      const r = await getPnrStatus(leg.pnr!);
      source = r.source;
      // Match each live passenger to one of us by their booked waitlist number
      // (the provider sorts by that number, not by ticket order); fall back
      // to position for confirmed bookings.
      const order: PersonId[] = (leg.passengers ?? []).map((p) => p.person);
      const bookedNo = (s?: string) => Number(s?.match(/(\d+)\s*$/)?.[1] ?? NaN);
      const personFor = (p: { number: number; booking: string }) =>
        leg.passengers?.find((x) => bookedNo(x.booked) === bookedNo(p.booking))?.person ?? order[p.number - 1] ?? order[0];
      const passengers: PassengerLive[] = r.data.passengers.map((p) => ({
        person: personFor(p),
        booked: p.booking,
        current: p.current,
        confirmChance: p.confirmChance,
      }));
      const berths: Berth[] = r.data.passengers.flatMap((p) =>
        p.coach && p.berth
          ? [{ person: personFor(p), coach: p.coach, berth: p.berth, type: BERTH_TYPES[p.berthCode ?? ""] ?? "Lower" }]
          : [],
      );
      const next: LegLive = {
        ...prev,
        legId: leg.id,
        passengers,
        // Full berth list once everyone has one; otherwise keep what we had.
        berths: berths.length === passengers.length ? berths : prev.berths,
        chartPrepared: r.data.chartPrepared,
        trainCancelled: r.data.trainCancelled,
        coachPosition: r.data.coachPosition ?? prev.coachPosition,
        platform: prev.liveUpdatedAt && prev.platform ? prev.platform : r.data.expectedPlatform ?? prev.platform,
        pnrUpdatedAt: r.fetchedAt,
        updatedAt: Math.max(r.fetchedAt, prev.liveUpdatedAt ?? 0),
        stale: false,
        source: r.source,
      };
      await save(leg.id, next, r.source);
      live.set(leg.id, next); // later jobs in this tick build on this
      await recordPnrChange(leg, prev, next, r.source);
      lines.push(`${leg.train?.number}: ${summarize(passengers)}`);
    } catch (e) {
      failures++;
      await markStale(leg.id, prev);
      lines.push(`${leg.train?.number}: ${e instanceof AllProvidersFailed ? e.message : String(e)}`);
    }
  }
  return { ok: failures === 0, message: lines.join(" | "), source };
}

function summarize(p: PassengerLive[]) {
  return p.map((x) => parseStatus(x.current).label).join(", ");
}

async function recordPnrChange(leg: Leg, prev: LegLive, next: LegLive, source: string) {
  const before = prev.passengers?.map((p) => p.current).join("|");
  const after = next.passengers?.map((p) => p.current).join("|");
  const chartFlip = !prev.chartPrepared && next.chartPrepared;
  if (before === after && !chartFlip) return;

  await serverDb().from("pnr_history").insert({
    leg_id: leg.id,
    pnr: leg.pnr,
    chart_prepared: next.chartPrepared ?? null,
    passengers: next.passengers,
    source,
  });

  // First fetch ever: just record the baseline, no alert.
  if (!prev.passengers) return;
  const name = leg.train?.name ?? leg.id;
  if (chartFlip) {
    await notify({
      kind: "chart",
      title: `Chart prepared: ${name}`,
      body: next.passengers!.map((p) => `${p.person}: ${parseStatus(p.current).label}`).join(", "),
      url: `/tickets#${leg.id}`,
      tag: `chart-${leg.id}`,
    });
  } else {
    await notify({
      kind: "pnr",
      title: `${name}: ${summarize(prev.passengers)} to ${summarize(next.passengers!)}`,
      body: `PNR ${leg.pnr}`,
      url: `/tickets#${leg.id}`,
      tag: `pnr-${leg.id}`,
    });
  }
}

/* --------------------------------------------------------- live status */

async function syncLive(legs: Leg[], live: Map<string, LegLive>) {
  const lines: string[] = [];
  let failures = 0;
  let source: string | undefined;

  for (const leg of legs) {
    const prev = live.get(leg.id) ?? { legId: leg.id };
    const board = PLACES[leg.from].code!;
    const dest = PLACES[leg.to].code!;
    try {
      const r = await getLiveRunningStatus(leg.train!.number, istDateKey(leg.depart), board);
      source = r.source;
      const d = r.data;
      const from = d.stations.find((s) => s.code === board);
      const to = d.stations.find((s) => s.code === dest);
      if (!d.found || !from || !to) {
        lines.push(`${leg.train!.number}: no running data yet`);
        continue;
      }
      const next: LegLive = {
        ...prev,
        legId: leg.id,
        expectedDepart: from.expDep ?? from.schDep,
        expectedArrive: to.expArr ?? to.schArr,
        delayMin: to.delayArrMin ?? d.delayMin,
        platform: from.platform ?? prev.platform,
        arrivalPlatform: to.platform ?? prev.arrivalPlatform,
        lastStation: d.currentStation?.name,
        stations: d.stations,
        departed: from.passed || d.departed,
        terminated: to.passed || d.terminated,
        liveUpdatedAt: r.fetchedAt,
        updatedAt: Math.max(r.fetchedAt, prev.pnrUpdatedAt ?? 0),
        stale: false,
        source: r.source,
      };
      await save(leg.id, next, r.source);
      live.set(leg.id, next); // later jobs in this tick build on this
      lines.push(`${leg.train!.number}: ${next.delayMin ? `${next.delayMin} min late` : "on time"}${next.lastStation ? ` near ${next.lastStation}` : ""}`);
    } catch (e) {
      failures++;
      await markStale(leg.id, prev);
      lines.push(`${leg.train!.number}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok: failures === 0, message: lines.join(" | "), source };
}

/* ----------------------------------------------------------- schedules */

/** Each train's stops on our travel date, between our boarding and alighting stations. */
async function syncSchedules(loser?: string) {
  const value: Record<string, StopTime[]> = {};
  const lines: string[] = [];
  let source: string | undefined;
  for (const leg of [...LEGS, ...BACKUPS].filter((l) => l.kind === "train" && l.id !== loser)) {
    const board = PLACES[leg.from].code!;
    const dest = PLACES[leg.to].code!;
    try {
      const r = await getLiveRunningStatus(leg.train!.number, istDateKey(leg.depart), board);
      source = r.source;
      const st = r.data.stations;
      const a = st.findIndex((s) => s.code === board);
      const b = st.findIndex((s) => s.code === dest);
      if (a < 0 || b < 0) {
        lines.push(`${leg.train!.number}: stops not found`);
        continue;
      }
      value[leg.id] = st.slice(a, b + 1).map((s) => ({ code: s.code, name: s.name, arr: s.schArr, dep: s.schDep }));
      lines.push(`${leg.train!.number}: ${b - a + 1} stops`);
    } catch (e) {
      lines.push(`${leg.train!.number}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const { error } = await serverDb().from("app_state").upsert({ key: "schedules", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: Object.keys(value).length > 0, message: lines.join(" | "), source };
}

/* ------------------------------------------------------------- weather */

async function syncWeather() {
  const list = await fetchWeatherMany(Object.values(PLACES));
  const value = Object.fromEntries(list.map((w) => [w.placeId, w]));
  const { error } = await serverDb()
    .from("app_state")
    .upsert({ key: "weather", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true, message: `${list.length} places`, source: "Open-Meteo" };
}

/* ------------------------------------------------------------- helpers */

/** JSON with sorted keys (Postgres jsonb reorders keys, so plain stringify differs). */
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

async function save(legId: string, data: LegLive, source: string) {
  const { error } = await serverDb()
    .from("leg_live")
    .upsert({ leg_id: legId, data, source, stale: false, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Supabase: ${error.message}`);
}

/** All providers failed: keep the last known value, flag it stale. */
async function markStale(legId: string, prev: LegLive) {
  if (!prev.updatedAt) return;
  await serverDb()
    .from("leg_live")
    .upsert({ leg_id: legId, data: { ...prev, stale: true }, stale: true, updated_at: new Date().toISOString() });
}
