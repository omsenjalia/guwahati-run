import { describe, expect, it } from "vitest";
import { LEGS } from "@/data/trip";
import { RETURN_FROM, tripHalf } from "./trip";
import { ms } from "@/lib/time";

const legs = LEGS.filter((l) => l.kind === "train");

describe("tripHalf", () => {
  it("shows only the trains to Guwahati up to 31 Oct", () => {
    const going = tripHalf(legs, ms("2026-10-31T23:59:00+05:30"));
    expect(going.length).toBeGreaterThan(0);
    expect(going.every((l) => ms(l.depart) < RETURN_FROM)).toBe(true);
  });
  it("shows only the trains home from 1 Nov", () => {
    const back = tripHalf(legs, ms("2026-11-01T00:00:00+05:30"));
    expect(back.length).toBeGreaterThan(0);
    expect(back.every((l) => ms(l.depart) >= RETURN_FROM)).toBe(true);
  });
});
