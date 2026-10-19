import { describe, expect, it } from "vitest";
import { averageDelays, runDelays, type SavedRun } from "@/lib/delay-runs";
import type { LiveRunningStatus } from "@/lib/providers/types.ts";

describe("average delay per stop", () => {
  it("keeps only passed stops with times, early counts as 0", () => {
    const run: LiveRunningStatus = {
      trainNo: "12506",
      startDate: "2026-10-18",
      found: true,
      departed: true,
      terminated: false,
      stations: [
        { code: "ANVT", name: "A", passed: true, dayCount: 1, delayDepMin: -3 },
        { code: "CNB", name: "B", passed: true, dayCount: 1, delayArrMin: 20, delayDepMin: 25 },
        { code: "PRYJ", name: "C", passed: true, dayCount: 1 },
        { code: "KYQ", name: "D", passed: false, dayCount: 2, delayArrMin: 60 },
      ],
    };
    expect(runDelays(run)).toEqual({ startDate: "2026-10-18", delays: { ANVT: 0, CNB: 20 } });
    expect(runDelays({ ...run, stations: run.stations.slice(2) })).toBeNull();
  });

  it("averages the newest runs, one per date", () => {
    const runs = Array.from({ length: 12 }, (_, i): SavedRun => ({
      startDate: `2026-10-${String(i + 1).padStart(2, "0")}`,
      delays: i < 2 ? { CNB: 999 } : { CNB: i, KYQ: 10 * i },
    }));
    runs.push({ startDate: "2026-10-12", delays: { CNB: 11, KYQ: 110 } }); // same run saved twice
    const out = averageDelays(runs, 10, 1);
    expect(out.runs).toBe(10);
    expect(out.dates[0]).toBe("2026-10-12");
    expect(out.dates.at(-1)).toBe("2026-10-03"); // the two oldest (999 min) are left out
    expect(out.stations.find((s) => s.code === "CNB")).toEqual({ code: "CNB", avgMin: 7, maxMin: 11, onTimePct: 40, samples: 10 });
    expect(out.fetchedAt).toBe(1);
  });
});
