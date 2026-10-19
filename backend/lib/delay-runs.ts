import type { Delays } from "@/lib/live-types";
import type { LiveRunningStatus } from "@/lib/providers/types.ts";
import { serverDb } from "@/lib/supabase/server";

/** One finished (or part-finished) run: minutes late at each passed stop. */
export type SavedRun = { startDate: string; delays: Record<string, number> };

export const MAX_RUNS = 10;

/** Minutes late at each stop the train has passed (none if the provider has no times). */
export function runDelays(run: LiveRunningStatus): SavedRun | null {
  if (!run.found) return null;
  const delays: Record<string, number> = {};
  for (const s of run.stations) {
    const late = s.delayArrMin ?? s.delayDepMin;
    if (s.passed && late !== undefined) delays[s.code] = Math.max(0, late);
  }
  return Object.keys(delays).length ? { startDate: run.startDate, delays } : null;
}

/** Average over the newest `max` runs (one per start date). */
export function averageDelays(runs: SavedRun[], max = MAX_RUNS, now = Date.now()): Delays {
  const picked = [...new Map(runs.map((r) => [r.startDate, r])).values()]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, max);
  const byCode = new Map<string, number[]>();
  for (const run of picked) for (const [code, min] of Object.entries(run.delays)) byCode.set(code, [...(byCode.get(code) ?? []), min]);
  const stations = [...byCode].map(([code, list]) => ({
    code,
    avgMin: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
    maxMin: Math.max(...list),
    onTimePct: Math.round((100 * list.filter((m) => m <= 5).length) / list.length),
    samples: list.length,
  }));
  return { runs: picked.length, dates: picked.map((r) => r.startDate), stations, fetchedAt: now };
}

/** The newest saved runs of one train (empty if the table isn't set up yet). */
export async function loadRuns(train: string, max = MAX_RUNS): Promise<SavedRun[]> {
  const { data, error } = await serverDb()
    .from("train_runs")
    .select("start_date, delays")
    .eq("train", train)
    .order("start_date", { ascending: false })
    .limit(max);
  if (error) return [];
  return (data ?? []).map((r) => ({ startDate: r.start_date, delays: r.delays }));
}

/**
 * Saves runs, one row per train and start date. A run already saved is only
 * replaced by a fetch that has more stops (it was still running last time).
 */
export async function saveRuns(train: string, runs: SavedRun[]) {
  if (!runs.length) return 0;
  const db = serverDb();
  const { data, error } = await db
    .from("train_runs")
    .select("start_date, delays")
    .eq("train", train)
    .in("start_date", runs.map((r) => r.startDate));
  if (error) throw new Error(`Supabase: ${error.message}. Run supabase/005_train_runs.sql.`);
  const have = new Map((data ?? []).map((r) => [r.start_date as string, Object.keys(r.delays).length]));
  const fresh = runs.filter((r) => Object.keys(r.delays).length > (have.get(r.startDate) ?? 0));
  if (!fresh.length) return 0;
  const { error: e } = await db.from("train_runs").upsert(
    fresh.map((r) => ({ train, start_date: r.startDate, delays: r.delays, updated_at: new Date().toISOString() })),
  );
  if (e) throw new Error(`Supabase: ${e.message}`);
  return fresh.length;
}
