import { describe, expect, it } from "vitest";
import { FOOD, FOOD_ITEMS, FOOD_SOURCE, FOOD_VEG } from "@/data/food";

describe("food prices", () => {
  it("lists vegetarian dishes only", () => {
    expect(FOOD_VEG.length).toBeGreaterThan(0);
    for (const s of FOOD_VEG) {
      expect(s.items.length).toBeGreaterThan(0);
      for (const i of s.items) expect(i.veg).toBe(true);
    }
    // Non-veg rows are dropped from the tab but kept in the data.
    expect(FOOD_ITEMS.some((i) => !i.veg)).toBe(true);
  });
  it("keeps the full menu, one row per dish", () => {
    expect(FOOD_ITEMS.length).toBe(FOOD.reduce((n, s) => n + s.items.length, 0));
    expect(new Set(FOOD_ITEMS.map((i) => i.name)).size).toBe(FOOD_ITEMS.length);
  });
  it("has a plain rupee price on every dish", () => {
    for (const i of FOOD_ITEMS) {
      expect(i.train).toBeGreaterThan(0);
      expect(Number.isInteger(i.train)).toBe(true);
      if (i.station !== undefined) expect(i.station).toBeGreaterThan(0);
    }
  });
  it("points at the official IRCTC tariff", () => {
    expect(FOOD_SOURCE.url).toMatch(/^https:\/\/menurates\.irctc\.co\.in/);
    expect(FOOD_SOURCE.pdf).toMatch(/^https:\/\/menurates\.irctc\.co\.in\/.*\.pdf$/);
  });
});
