import { LEGS } from "@/data/trip";
import { ROUTES } from "@/data/routes";
import { MAX_RUNS, averageDelays, loadRuns, runDelays, saveRuns, type SavedRun } from "@/lib/delay-runs";
import type { Delays } from "@/lib/live-types";
import { getLiveRunningStatus } from "@/lib/providers/index.ts";
import { istDateKey } from "@/lib/time";

export const maxDuration = 60;

const DAY = 24 * 3600_000;
// shortcut: per-instance memory cache, so a cold start reads the db again; fine for a few viewers.
const cache = new Map<string, Delays>();

/**
 * Average delay at each stop of one of our trains over its last 10 runs with
 * times: the runs the jobs tick saved each day, topped up from the same live
 * status source (team and parents).
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("leg");
  const leg = LEGS.find((l) => l.id === id && l.train);
  const trainNo = leg?.train?.number;
  const origin = trainNo && ROUTES[trainNo]?.[0]?.[0];
  if (!trainNo || !origin) return Response.json({ error: "No train with that id" }, { status: 404 });
  const hit = cache.get(trainNo);
  if (hit && Date.now() - hit.fetchedAt < 6 * 3600_000) return Response.json(hit);

  const saved = await loadRuns(trainNo);
  let fetched: SavedRun[] = [];
  if (saved.length < MAX_RUNS) {
    // Runs that started 1 to 14 days ago and aren't saved yet (the newest may still be running). The source has no times for some old runs: those are skipped.
    const have = new Set(saved.map((r) => r.startDate));
    const dates = Array.from({ length: 14 }, (_, i) => istDateKey(Date.now() - (i + 1) * DAY)).filter((d) => !have.has(d));
    const results = await Promise.allSettled(dates.map((d) => getLiveRunningStatus(trainNo, d, origin)));
    fetched = results.flatMap((r) => (r.status === "fulfilled" ? [runDelays(r.value.data)].filter((x) => x !== null) : []));
    await saveRuns(trainNo, fetched).catch(() => {}); // the table may not exist yet: still answer
  }
  const runs = [...saved, ...fetched];
  if (!runs.length) return Response.json({ error: "No recent runs found right now. Try again later." }, { status: 502 });

  const out = averageDelays(runs);
  cache.set(trainNo, out);
  return Response.json(out);
}
