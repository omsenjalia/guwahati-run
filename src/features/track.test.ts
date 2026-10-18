import { describe, expect, it } from "vitest";
import { LEGS } from "@/data/trip";
import { buildTrack, trainPosition } from "@/lib/live-track";
import type { StationStatus } from "@/lib/providers/types.ts";
import { ms } from "@/lib/time";

const NE = LEGS.find((l) => l.id === "L2")!; // 12506 Anand Vihar 07:40 -> Kamakhya, 29 Oct
const t = (iso: string) => ms(`${iso}+05:30`);

describe("live train tracking", () => {
  it("is yet to depart before the timetable says so", () => {
    const tr = buildTrack(NE, undefined, t("2026-10-20T10:00:00"))!;
    expect(tr.state).toBe("yet");
    expect(tr.title).toBe("Train yet to depart");
    expect(tr.points[tr.from].code).toBe("ANVT");
    expect(tr.points.some((p) => !p.stop)).toBe(true);
    expect(trainPosition(tr, t("2026-10-20T10:00:00")).index).toBe(0);
  });

  it("puts the train between stops by the timetable, with non-stop times in order", () => {
    const now = t("2026-10-29T08:30:00"); // ALJN is 09:13
    const tr = buildTrack(NE, undefined, now)!;
    expect(tr.state).toBe("between");
    expect(tr.title).toBe("Between Anand Vihar TRM and Aligarh Jn");
    const firstLeg = tr.points.slice(0, tr.points.findIndex((p) => p.code === "ALJN") + 1);
    const times = firstLeg.map((p) => p.dep ?? p.arr!);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const pos = trainPosition(tr, now);
    expect(pos.index).toBeLessThan(firstLeg.length - 1);
    expect(pos.lat).toBeLessThan(28.66);
    expect(pos.lat).toBeGreaterThan(27.88);
  });

  it("uses live times, carries the delay forward and halts at a stop", () => {
    const st = (code: string, schArr: string | undefined, schDep: string | undefined, expArr: string | undefined, expDep: string | undefined, passed: boolean, delay: number): StationStatus => ({
      code,
      name: code,
      schArr: schArr && `2026-10-29T${schArr}:00+05:30`,
      schDep: schDep && `2026-10-29T${schDep}:00+05:30`,
      expArr: expArr && `2026-10-29T${expArr}:00+05:30`,
      expDep: expDep && `2026-10-29T${expDep}:00+05:30`,
      delayArrMin: delay,
      passed,
      dayCount: 1,
    });
    const stations = [
      st("ANVT", undefined, "07:40", undefined, "07:50", true, 10),
      st("ALJN", "09:13", "09:15", "09:33", "09:35", false, 20),
    ];
    const atAligarh = buildTrack(NE, { stations, departed: true, terminated: false }, t("2026-10-29T09:34:00"))!;
    expect(atAligarh.live).toBe(true);
    expect(atAligarh.state).toBe("at");
    expect(atAligarh.title).toBe("At Aligarh Jn");
    // Tundla (10:23) isn't in the feed yet: 20 min late like Aligarh.
    expect(atAligarh.points.find((p) => p.code === "TDL")!.arr).toBe(t("2026-10-29T10:43:00"));

    const before = buildTrack(NE, { stations, departed: true, terminated: false }, t("2026-10-29T08:40:00"))!;
    expect(before.state).toBe("between");
    expect(before.next?.code).toBe("ALJN");
    expect(before.detail).toContain("Next stop Aligarh Jn at 09:33");
  });

  it("ignores live data from another run unless it's the developer test", () => {
    const old: StationStatus[] = [{ code: "ANVT", name: "ANVT", schDep: "2026-10-08T07:40:00+05:30", expDep: "2026-10-08T07:46:00+05:30", passed: true, dayCount: 1 }];
    expect(buildTrack(NE, { stations: old, departed: true, terminated: false }, t("2026-10-20T10:00:00"))!.live).toBe(false);
    expect(buildTrack(NE, { stations: old, departed: true, terminated: false }, t("2026-10-08T08:00:00"), true)!.live).toBe(true);
  });
});
