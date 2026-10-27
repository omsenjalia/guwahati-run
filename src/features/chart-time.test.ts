import { describe, expect, it } from "vitest";
import { LEGS } from "@/data/trip";
import { chartTime, chartTimeFor } from "@/lib/trip-engine";
import { ms } from "@/lib/time";

const t = (iso: string) => ms(`${iso}+05:30`);

describe("reservation chart time", () => {
  it("is 20:00 the previous day for a 05:01-14:00 departure (Dec 2025 rule)", () => {
    expect(chartTime("2026-10-29T07:22:00+05:30")).toBe(t("2026-10-28T20:00:00"));
    expect(chartTime("2026-11-03T08:55:00+05:30")).toBe(t("2026-11-02T20:00:00"));
  });

  it("is 10 hours before departure for everything else", () => {
    expect(chartTime("2026-10-28T22:50:00+05:30")).toBe(t("2026-10-28T12:50:00"));
    expect(chartTime("2026-11-01T16:55:00+05:30")).toBe(t("2026-11-01T06:55:00"));
  });

  it("uses the station the train starts from, not our boarding station", () => {
    const aa = LEGS.find((l) => l.id === "L2")!;
    // Booked from Pili Bangan (22:50 on 28 Oct), where the chart is prepared.
    expect(chartTimeFor(aa)).toBe(t("2026-10-28T12:50:00"));
    const garib = LEGS.find((l) => l.id === "L4")!;
    expect(chartTimeFor(garib)).toBe(t("2026-11-02T20:00:00"));
  });
});
