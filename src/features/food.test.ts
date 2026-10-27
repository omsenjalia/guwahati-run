import { describe, expect, it } from "vitest";
import { FOOD, FOOD_ITEMS, FOOD_SOURCE, FOOD_VEG } from "@/data/food";
import { LEGS, TRIP_SPAN } from "@/data/trip";
import { DICT } from "@/i18n/dict";

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

describe("trip window", () => {
  it("runs from the first departure to the last arrival, off the legs", () => {
    const departs = LEGS.map((l) => new Date(l.depart).getTime());
    const arrives = LEGS.map((l) => new Date(l.arrive).getTime());
    expect(new Date(TRIP_SPAN.start).getTime()).toBe(Math.min(...departs));
    expect(new Date(TRIP_SPAN.end).getTime()).toBe(Math.max(...arrives));
    // Food tab is shown inside this window only, so it must cover every train,
    // including the 3 Nov return leg that runs past the hackathon's end.
    for (const l of LEGS) {
      expect(new Date(l.depart).getTime()).toBeGreaterThanOrEqual(new Date(TRIP_SPAN.start).getTime());
      expect(new Date(l.arrive).getTime()).toBeLessThanOrEqual(new Date(TRIP_SPAN.end).getTime());
    }
  });
});

describe("food translations", () => {
  it("names every dish and section in Hindi and Gujarati", () => {
    const missing: string[] = [];
    for (const s of FOOD_VEG) {
      for (const text of [s.title, s.note, ...s.items.flatMap((i) => [i.name, i.portion])]) {
        if (!text) continue;
        const entry = (DICT as Record<string, [string, string]>)[text];
        if (!entry || !entry[0] || !entry[1]) missing.push(text);
      }
    }
    expect(missing).toEqual([]);
  });
});
