import { describe, expect, it } from "vitest";
import { LEGS, currentLegId, legIdAliases } from "@/data/trip";

describe("the 15910 backup ticket", () => {
  it("belongs to the main 15910 leg", () => {
    expect(currentLegId("B1")).toBe("L2");
    expect(legIdAliases("L2")).toContain("B1");
    const main = LEGS.find((l) => l.id === "L2");
    expect(main?.train?.number).toBe("15910");
  });

  it("leaves every other id alone", () => {
    for (const id of ["L0", "L1", "L3", "L4"]) {
      expect(currentLegId(id)).toBe(id);
      expect(legIdAliases(id as "L0")).not.toContain("B1");
    }
  });
});
