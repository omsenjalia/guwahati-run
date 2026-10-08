/**
 * The background brain. Supabase's scheduler calls /api/jobs/tick every
 * 5 minutes; this decides which jobs are due and runs them:
 *
 *   PNR sync      every 30 min; every 15 min within 90 min of chart time
 *   Live status   every tick (5 min) from 3h before departure to 1h after arrival
 *   Weather       every 3h
 *
 * Every job writes to Supabase (phones get it via Realtime) and logs a row
 * in job_runs for the system health panel.
 */
import * as trip from "@/data/trip";
import { LEGS, PLACES, TEAM, type Berth, type Leg, type PersonId } from "@/data/trip";
import { AllProvidersFailed, getLiveRunningStatus, getPnrStatus } from "@/lib/providers/index.ts";
import type { LegLive, PassengerLive } from "@/lib/live-types";
import { notify } from "@/lib/notify";
import { runWatchers } from "@/lib/jobs/watchers";
import { serverDb } from "@/lib/supabase/server";
import { HOUR, MIN, istDateKey, ms } from "@/lib/time";
import { chartTime, parseStatus } from "@/lib/trip-engine";
import { fetchWeatherMany } from "@/lib/weather";

export type JobName = "seed" | "pnr-sync" | "live-status" | "weather" | "watchers";
type JobResult = { job: JobName; ok: boolean; message: string; source?: string; details?: unknown };

const ORDER: PersonId[] = TEAM.map((p) => p.id);
const BERTH_TYPES: Record<string, Berth["type"]> = {
  LB: "Lower",
  MB: "Middle",
  UB: "Upper",
  SL: "Side Lower",
  SU: "Side Upper",
};

/* ------------------------------------------------------------ schedule */

export function pnrInterval(leg: Leg, now: number): number | null {
  const depart = ms(leg.depart);
  if (now > depart + 30 * MIN) return null; // already on board
  if (Math.abs(now - chartTime(leg.depart)) <= 90 * MIN) return 15 * MIN;
  return 30 * MIN;
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

  // PNR sync
  const pnrLegs = LEGS.filter((l) => {
    if (!l.pnr) return false;
    if (force.has("pnr-sync")) return true;
    const interval = pnrInterval(l, now);
    return interval !== null && isDue(live.get(l.id)?.pnrUpdatedAt, interval, now);
  });
  if (pnrLegs.length) results.push(await logged("pnr-sync", () => syncPnrs(pnrLegs, live)));

  // Live running status
  const liveLegs = LEGS.filter(
    (l) => l.train && (force.has("live-status") || liveDue(l, now, live.get(l.id))),
  );
  if (liveLegs.length) results.push(await logged("live-status", () => syncLive(liveLegs, live)));

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
  if (job !== "seed" || !r.ok || r.message !== "unchanged") {
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
  const { error } = await db.from("trip_snapshot").upsert({ id: 1, data: snapshot, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  // First run: seed the shared packing list and the grant document checklist.
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
  return { ok: true, message: data ? "trip data updated" : "trip data seeded" };
}

/* ------------------------------------------------------------ PNR sync */

async function syncPnrs(legs: Leg[], live: Map<string, LegLive>) {
  const lines: string[] = [];
  let failures = 0;
  let source: string | undefined;

  for (const leg of legs) {
    const prev = live.get(leg.id) ?? { legId: leg.id };
    try {
      const r = await getPnrStatus(leg.pnr!);
      source = r.source;
      const passengers: PassengerLive[] = r.data.passengers.map((p) => ({
        person: ORDER[p.number - 1] ?? ORDER[0],
        booked: p.booking,
        current: p.current,
        confirmChance: p.confirmChance,
      }));
      const berths: Berth[] = r.data.passengers.flatMap((p) =>
        p.coach && p.berth
          ? [{ person: ORDER[p.number - 1], coach: p.coach, berth: p.berth, type: BERTH_TYPES[p.berthCode ?? ""] ?? "Lower" }]
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
