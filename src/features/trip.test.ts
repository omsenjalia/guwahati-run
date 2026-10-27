import { describe, expect, it } from "vitest";
import { LEGS } from "@/data/trip";
import { EMPTY_LIVE } from "@/lib/live-types";
import { effectiveLocations, FRESH_MS } from "@/lib/locations";
import { ms } from "@/lib/time";
import { parseStatus } from "@/lib/trip-engine";
import { coachKind, coachList, focusLeg, isSeated, myStatus, stopsFor, trainLegs } from "./trip";

describe("coach position", () => {
  it("splits the provider's string, engine first", () => {
    expect(coachList("L SLR GS S1  S2,B1|A1")).toEqual(["L", "SLR", "GS", "S1", "S2", "B1", "A1"]);
    expect(coachList(undefined)).toEqual([]);
  });
  it("names coach kinds", () => {
    expect(coachKind("L")).toBe("engine");
    expect(coachKind("S5")).toBe("sleeper");
    expect(coachKind("B3")).toBe("ac");
    expect(coachKind("G8")).toBe("ac");
    expect(coachKind("GS")).toBe("general");
  });
});

describe("tickets", () => {
  it("shows PNR mode for waitlisted, coach mode once RAC or confirmed", () => {
    expect(isSeated(parseStatus("GNWL 17").kind)).toBe(false);
    expect(isSeated(parseStatus("RAC").kind)).toBe(true);
    expect(isSeated(parseStatus("RAC 12").kind)).toBe(true);
    // Every ticket in the data is confirmed or RAC, so the coach mode is on.
    const ne = LEGS.find((l) => l.id === "L2")!;
    expect(myStatus(ne, EMPTY_LIVE, "oms").kind).toBe("RAC");
    expect(isSeated(myStatus(ne, EMPTY_LIVE, "oms").kind)).toBe(true);
    const live = { ...EMPTY_LIVE, legs: { L2: { legId: "L2" as const, passengers: [{ person: "oms" as const, booked: "GNWL 83", current: "B2 34" }] } } };
    expect(myStatus(ne, live, "oms").kind).toBe("CNF");
    expect(isSeated(myStatus(ne, live, "oms").kind)).toBe(true);
  });
  it("lists our train tickets in trip order", () => {
    expect(trainLegs().map((l) => l.id)).toEqual(["L0", "L1", "L2", "L3", "L4"]);
  });
  it("focuses the train we're on, else the next one", () => {
    const legs = trainLegs();
    expect(focusLeg(legs, EMPTY_LIVE, ms("2026-10-20T10:00:00+05:30")).id).toBe("L0");
    expect(focusLeg(legs, EMPTY_LIVE, ms("2026-10-29T12:00:00+05:30")).id).toBe("L2");
    expect(focusLeg(legs, EMPTY_LIVE, ms("2026-12-01T00:00:00+05:30")).id).toBe("L4");
  });
  it("falls back to our two stations without a timetable", () => {
    const yoga = LEGS.find((l) => l.id === "L1")!;
    const r = stopsFor(yoga, EMPTY_LIVE, ms("2026-10-20T00:00:00+05:30"));
    expect(r.stops.map((s) => s.code)).toEqual(["SBIB", "DLI"]);
    expect([r.from, r.to]).toEqual([0, 1]);
  });
});

describe("locations", () => {
  const now = Date.parse("2026-10-29T10:00:00Z");
  const row = (person: string, minsAgo: number) => ({ person, lat: 1, lon: 2, accuracy: 10, updated_at: new Date(now - minsAgo * 60_000).toISOString() });
  it("uses each phone's own fix when fresh", () => {
    const r = effectiveLocations([row("oms", 5), row("heet", 10)], now);
    expect(r.oms?.via).toBe("oms");
    expect(r.heet?.via).toBe("heet");
  });
  it("uses another attendee's fresh fix when a phone's location is off", () => {
    const r = effectiveLocations([row("oms", 5), row("heet", FRESH_MS / 60_000 + 30)], now);
    expect(r.heet?.via).toBe("oms");
    expect(r.sujal?.via).toBe("oms"); // never shared at all
  });
  it("keeps the last known fix when nobody is fresh", () => {
    const r = effectiveLocations([row("oms", 300), row("heet", 200)], now);
    expect(r.oms?.via).toBe("oms");
    expect(r.sujal?.via).toBe("heet");
  });
});

describe("trip plan patching", () => {
  it("makes the target equal the source and keeps object identity", async () => {
    const { patchInPlace } = await import("@/core/trip-sync");
    const leg = { id: "L1", pnr: "1", notes: ["a", "b"], extra: true };
    const legs = [leg, { id: "L2" }];
    const target = { legs, name: "x" };
    patchInPlace(target, { legs: [{ id: "L1", pnr: "2", notes: ["a"] }], name: "y" });
    expect(target).toEqual({ legs: [{ id: "L1", pnr: "2", notes: ["a"] }], name: "y" });
    expect(target.legs).toBe(legs);
    expect(target.legs[0]).toBe(leg);
  });
});
