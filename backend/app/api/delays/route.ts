import { BACKUPS, LEGS } from "@/data/trip";
import { ROUTES } from "@/data/routes";
import type { Delays } from "@/lib/live-types";
import { getLiveRunningStatus } from "@/lib/providers/index.ts";
import { istDateKey } from "@/lib/time";

export const maxDuration = 60;


const RUNS = 7;
const DAY = 24 * 3600_000;
// shortcut: per-instance memory cache, so a cold start fetches again; move to the db if the provider starts rate-limiting.
const cache = new Map<string, Delays>();

/**
 * Average delay at each stop of one of our trains over its last 7 finished
 * runs with times, from the same live status source (team and parents).
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("leg");
  const leg = [...LEGS, ...BACKUPS].find((l) => l.id === id && l.train);
  const trainNo = leg?.train?.number;
  const origin = trainNo && ROUTES[trainNo]?.[0]?.[0];
  if (!trainNo || !origin) return Response.json({ error: "No train with that id" }, { status: 404 });
  const hit = cache.get(trainNo);
  if (hit && Date.now() - hit.fetchedAt < 6 * 3600_000) return Response.json(hit);

  // Runs that started 1 to 14 days ago (the newest may still be running). The source has no times for some old runs: those are skipped.
  const dates = Array.from({ length: 14 }, (_, i) => istDateKey(Date.now() - (i + 1) * DAY));
  const results = await Promise.allSettled(dates.map((d) => getLiveRunningStatus(trainNo, d, origin)));
  const runs = results
    .flatMap((r) => (r.status === "fulfilled" && r.value.data.found && r.value.data.stations.some((s) => s.passed) ? [r.value.data] : []))
    .filter((d, i, all) => all.findIndex((x) => x.startDate === d.startDate) === i)
    .slice(0, RUNS);
  if (!runs.length) return Response.json({ error: "No recent runs found right now. Try again later." }, { status: 502 });

  const byCode = new Map<string, number[]>();
  for (const run of runs)
    for (const s of run.stations) {
      const late = s.delayArrMin ?? s.delayDepMin;
      if (s.passed && late !== undefined) byCode.set(s.code, [...(byCode.get(s.code) ?? []), Math.max(0, late)]);
    }
  const stations = [...byCode].map(([code, list]) => ({
    code,
    avgMin: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
    maxMin: Math.max(...list),
    onTimePct: Math.round((100 * list.filter((m) => m <= 5).length) / list.length),
    samples: list.length,
  }));
  const out: Delays = { runs: runs.length, dates: runs.map((r) => r.startDate), stations, fetchedAt: Date.now() };
  cache.set(trainNo, out);
  return Response.json(out);
}
