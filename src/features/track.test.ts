import { describe, expect, it } from "vitest";
import { LEGS } from "@/data/trip";
import { buildTrack, trainPosition } from "@/lib/live-track";
import type { StationStatus } from "@/lib/providers/types.ts";
import { ms } from "@/lib/time";

const AA = LEGS.find((l) => l.id === "L2")!; // 15910 Avadh Assam, Delhi Jn 07:22 -> Kamakhya, 29 Oct
const t = (iso: string) => ms(`${iso}+05:30`);

describe("live train tracking", () => {
  it("is yet to depart before the timetable says so", () => {
    const tr = buildTrack(AA, undefined, t("2026-10-20T10:00:00"))!;
    expect(tr.state).toBe("yet");
    expect(tr.title).toBe("Train yet to depart");
    expect(tr.points[tr.from].code).toBe("DLI");
    expect(tr.points.some((p) => !p.stop)).toBe(true);
    expect(trainPosition(tr, t("2026-10-20T10:00:00")).index).toBe(0);
  });

  it("puts the train between stops by the timetable, with non-stop times in order", () => {
    const now = t("2026-10-29T08:30:00"); // left Ghaziabad at 08:10, Pilkhua is 08:39
    const tr = buildTrack(AA, undefined, now)!;
    expect(tr.state).toBe("between");
    expect(tr.title).toBe("Between Ghaziabad and Pilkhua");
    const pk = tr.points.findIndex((p) => p.code === "PKW");
    const firstLeg = tr.points.slice(tr.from, pk + 1);
    const times = firstLeg.map((p) => p.dep ?? p.arr!);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const gzb = tr.points.findIndex((p) => p.code === "GZB");
    const pos = trainPosition(tr, now);
    expect(pos.index).toBeGreaterThanOrEqual(gzb);
    expect(pos.index).toBeLessThan(pk);
    expect(pos.lat).toBeGreaterThan(tr.points[gzb].lat);
    expect(pos.lat).toBeLessThan(tr.points[pk].lat);
  });

  it("uses live times, carries the delay forward and halts at a stop", () => {
    const st = (
      code: string,
      date: string,
      schArr: string | undefined,
      schDep: string | undefined,
      expArr: string | undefined,
      expDep: string | undefined,
      passed: boolean,
      delay: number,
      dayCount: number,
    ): StationStatus => ({
      code,
      name: code,
      schArr: schArr && `${date}T${schArr}:00+05:30`,
      schDep: schDep && `${date}T${schDep}:00+05:30`,
      expArr: expArr && `${date}T${expArr}:00+05:30`,
      expDep: expDep && `${date}T${expDep}:00+05:30`,
      delayArrMin: delay,
      delayDepMin: delay,
      passed,
      dayCount,
    });
    // The feed starts at the train's origin (Lalgarh, day 1), like the provider's.
    const stations = [
      st("LGH", "2026-10-28", undefined, "19:50", undefined, "19:55", true, 5, 1),
      st("DLI", "2026-10-29", "07:07", "07:22", "07:17", "07:32", true, 10, 2),
      st("GZB", "2026-10-29", "08:08", "08:10", "08:28", "08:30", false, 20, 2),
    ];
    const atGhaziabad = buildTrack(AA, { stations, departed: true, terminated: false }, t("2026-10-29T08:29:00"))!;
    expect(atGhaziabad.state).toBe("at");
    expect(atGhaziabad.title).toBe("At Ghaziabad");
    // Pilkhua (08:39) isn't in the feed yet: 20 min late like Ghaziabad.
    expect(atGhaziabad.points.find((p) => p.code === "PKW")!.arr).toBe(t("2026-10-29T08:59:00"));

    const before = buildTrack(AA, { stations, departed: true, terminated: false }, t("2026-10-29T08:00:00"))!;
    expect(before.state).toBe("between");
    expect(before.next?.code).toBe("GZB");
    expect(before.detail).toContain("Next stop Ghaziabad at 08:28");
  });

  it("ignores live data from another run unless it's the developer test", () => {
    const old: StationStatus[] = [
      { code: "LGH", name: "LGH", schDep: "2026-10-08T19:50:00+05:30", expDep: "2026-10-08T19:56:00+05:30", passed: true, dayCount: 1 },
    ];
    expect(buildTrack(AA, { stations: old, departed: true, terminated: false }, t("2026-10-20T10:00:00"))!.live).toBe(false);
    expect(buildTrack(AA, { stations: old, departed: true, terminated: false }, t("2026-10-08T20:00:00"), true)!.live).toBe(true);
  });
});
