import { LEGS, type LegId } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, ms } from "@/lib/time";

/**
 * Meals on the train: for each mealtime during a leg, the best stop to eat
 * at (longest halt near that time), shifted by the live delay. Also long
 * halts that are good for refilling water. Uses the timetables stored by the
 * daily "schedules" job.
 */

export type StopTime = { code: string; name: string; arr?: string; dep?: string };

export type MealStop = {
  legId: LegId;
  meal: "Breakfast" | "Lunch" | "Dinner";
  station: string;
  code: string;
  /** Live-adjusted arrival, epoch ms. */
  at: number;
  haltMin: number;
  /** IRCTC e-catering needs the order in before this. */
  orderBy: number;
};

export type WaterStop = { legId: LegId; station: string; at: number; haltMin: number };

const MEALS = [
  { meal: "Breakfast" as const, hour: 8 },
  { meal: "Lunch" as const, hour: 13 },
  { meal: "Dinner" as const, hour: 20 },
];

export const ECATERING_URL = "https://www.ecatering.irctc.co.in/";

const istMidnight = (t: number) => {
  const ist = t + 5.5 * HOUR;
  return ist - (ist % (24 * HOUR)) - 5.5 * HOUR;
};

export function planMeals(live: LiveState) {
  const schedules = (live.state.schedules ?? {}) as Record<string, StopTime[]>;
  const meals: MealStop[] = [];
  const water: WaterStop[] = [];

  for (const leg of LEGS.filter((l) => l.kind === "train")) {
    const stops = schedules[leg.id];
    if (!stops?.length) continue;
    const delay = (live.legs[leg.id]?.delayMin ?? 0) * MIN;
    // Intermediate stops only, with live delay applied.
    const mid = stops.slice(1, -1).flatMap((s) => {
      if (!s.arr || !s.dep) return [];
      const arr = ms(s.arr) + delay;
      const halt = Math.round((ms(s.dep) - ms(s.arr)) / MIN);
      return [{ ...s, at: arr, halt }];
    });
    const start = ms(leg.depart) + delay;
    const end = ms(leg.arrive) + delay;

    for (let day = istMidnight(start); day < end; day += 24 * HOUR) {
      for (const m of MEALS) {
        const t = day + m.hour * HOUR;
        if (t < start + 45 * MIN || t > end - 45 * MIN) continue;
        const near = mid.filter((s) => Math.abs(s.at - t) <= 75 * MIN && s.halt >= 2);
        if (!near.length) continue;
        // Prefer a longer halt, then closeness to mealtime.
        const best = near.sort((a, b) => b.halt - a.halt || Math.abs(a.at - t) - Math.abs(b.at - t))[0];
        meals.push({ legId: leg.id, meal: m.meal, station: best.name, code: best.code, at: best.at, haltMin: best.halt, orderBy: best.at - 2 * HOUR });
      }
    }

    // Long halts spaced at least 5 hours apart: refill water there.
    let last = -Infinity;
    for (const s of mid.filter((x) => x.halt >= 10)) {
      if (s.at - last >= 5 * HOUR) {
        water.push({ legId: leg.id, station: s.name, at: s.at, haltMin: s.halt });
        last = s.at;
      }
    }
  }
  return { meals: meals.sort((a, b) => a.at - b.at), water };
}
