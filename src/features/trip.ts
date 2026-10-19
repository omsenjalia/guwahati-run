import { BACKUPS, LEGS, PLACES, TEAM, type Leg, type PersonId } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import type { StopTime } from "@/lib/meal-planner";
import type { StationStatus } from "@/lib/providers/types.ts";
import { storedChoice } from "@/lib/ticket-choice";
import { legPassengers, parseStatus, type ParsedStatus } from "@/lib/trip-engine";
import { ms } from "@/lib/time";
import type { Tone } from "@/ui/theme";

/** Pure helpers the screens share (no React). */

export const person = (id: PersonId) => TEAM.find((p) => p.id === id)!;
export const personIndex = (id: PersonId) => TEAM.findIndex((p) => p.id === id);
export const firstName = (id: PersonId) => person(id).name.split(" ")[0];

/**
 * Our train tickets in trip order. The North East Express and its backup are
 * both listed until the background job decides which one we use.
 */
export function trainLegs(live: LiveState): Leg[] {
  const choice = storedChoice(live);
  const legs = LEGS.filter((l) => l.kind === "train");
  const out: Leg[] = [];
  for (const l of legs) {
    if (choice?.winner !== BACKUPS[0].id || l.id !== BACKUPS[0].backupFor) out.push(l);
    for (const b of BACKUPS) if (b.backupFor === l.id && choice?.loser !== b.id) out.push(b);
  }
  return out;
}

/** Going trains (Anand to Guwahati) until the end of 31 Oct, then only the trains home. */
export const RETURN_FROM = ms("2026-11-01T00:00:00+05:30");
export function tripHalf(legs: Leg[], now: number): Leg[] {
  const half = legs.filter((l) => (ms(l.depart) < RETURN_FROM) === (now < RETURN_FROM));
  return half.length ? half : legs;
}

const liveEnd = (l: Leg, live: LiveState) => ms(live.legs[l.id]?.expectedArrive ?? l.arrive);
const liveStart = (l: Leg, live: LiveState) => ms(live.legs[l.id]?.expectedDepart ?? l.depart);

/** The train to show first: the one we're on, else the next one, else the last. */
export function focusLeg(legs: Leg[], live: LiveState, now: number): Leg {
  const main = legs.filter((l) => !l.backupFor);
  return (
    main.find((l) => liveStart(l, live) - 3 * 3600_000 <= now && now <= liveEnd(l, live) + 30 * 60_000) ??
    main.find((l) => liveStart(l, live) > now) ??
    main[main.length - 1]
  );
}

export function statusTone(s: ParsedStatus["kind"]): Tone {
  return s === "CNF" ? "good" : s === "RAC" ? "warn" : s === "WL" ? "bad" : s === "CAN" ? "bad" : "neutral";
}

/** This person's status on a ticket. */
export function myStatus(leg: Leg, live: LiveState, who: PersonId) {
  const p = legPassengers(leg, live).find((x) => x.person === who);
  return { ...parseStatus(p?.current), booked: p?.booked, confirmChance: p?.confirmChance };
}

/** PNR mode until this person is RAC or confirmed; then coach and berth mode. */
export const isSeated = (kind: ParsedStatus["kind"]) => kind === "CNF" || kind === "RAC";

/** "L SLR GS S1 S2 ... " -> ["L","SLR","GS","S1","S2",...] (engine end first). */
export function coachList(position?: string): string[] {
  return (position ?? "")
    .split(/[\s,|-]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

/** Plain-English coach kind, for the coach strip. */
export function coachKind(code: string): "engine" | "ac" | "sleeper" | "general" | "pantry" | "other" {
  if (/^(L|LOCO|ENG)$/.test(code)) return "engine";
  if (/^(PC|PANTRY)$/.test(code)) return "pantry";
  if (/^(GS|GEN|UR|D\d*)$/.test(code)) return "general";
  if (/^S\d+$/.test(code)) return "sleeper";
  if (/^(A|B|H|M|G|HA|AB|C|E|EC)\d*$/.test(code)) return "ac";
  return "other";
}

export type Stop = {
  code: string;
  name: string;
  schArr?: string;
  schDep?: string;
  expArr?: string;
  expDep?: string;
  delayMin?: number;
  platform?: string;
  passed: boolean;
  day?: number;
};

/**
 * Stops for the station list: live running status when the train is being
 * tracked, else the timetable the background job saved, else just our two
 * stations. Returns the whole route and our boarding/alighting indexes.
 */
export function stopsFor(leg: Leg, live: LiveState, now: number): { stops: Stop[]; from: number; to: number; live: boolean } {
  const fromCode = PLACES[leg.from].code!;
  const toCode = PLACES[leg.to].code!;
  const stations = live.legs[leg.id]?.stations as StationStatus[] | undefined;
  let stops: Stop[];
  let isLive = false;
  if (stations?.length) {
    isLive = true;
    stops = stations.map((s) => ({
      code: s.code,
      name: s.name,
      schArr: s.schArr,
      schDep: s.schDep,
      expArr: s.expArr,
      expDep: s.expDep,
      delayMin: s.delayArrMin ?? s.delayDepMin,
      platform: s.platform,
      passed: s.passed,
      day: s.dayCount,
    }));
  } else {
    const sched = (live.state.schedules as Record<string, StopTime[]> | undefined)?.[leg.id];
    const base: StopTime[] = sched?.length
      ? sched
      : [
          { code: fromCode, name: PLACES[leg.from].name, dep: leg.depart },
          { code: toCode, name: PLACES[leg.to].name, arr: leg.arrive },
        ];
    stops = base.map((s) => ({
      code: s.code,
      name: s.name,
      schArr: s.arr,
      schDep: s.dep,
      passed: ms(s.dep ?? s.arr ?? leg.arrive) < now,
    }));
  }
  const from = Math.max(0, stops.findIndex((s) => s.code === fromCode));
  const toIdx = stops.findIndex((s) => s.code === toCode);
  return { stops, from, to: toIdx < 0 ? stops.length - 1 : toIdx, live: isLive };
}

/** Index of the last stop the train has passed (-1 = not started). */
export const lastPassed = (stops: Stop[]) => stops.reduce((acc, s, i) => (s.passed ? i : acc), -1);

/** Delay colour: on time, a little late, very late. */
export const delayTone = (min?: number): Tone => (!min || min <= 5 ? "good" : min <= 30 ? "warn" : "bad");
export const delayText = (min?: number) =>
  !min || min <= 0 ? "On time" : min < 60 ? `${min} min late` : `${Math.floor(min / 60)}h ${min % 60}m late`;
