import { EVENT, LEGS, TRANSFERS, TRIP } from "@/data/trip";
import { EXPLORE, EXPLORE_RETURN_MARGIN_MIN } from "@/data/guides";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, ms } from "@/lib/time";
import { buildSteps, type Step } from "@/lib/trip-engine";

/**
 * Which home screen to show, switched automatically by IST date and time:
 *
 *   A  before     now to 28 Oct, 2h before the first train
 *   B  travel     28 Oct morning to 30 Oct evening (onward journey)
 *   C  hackathon  30 Oct 18:00 to 1 Nov 11:00
 *   D  return     1 Nov 11:00 to 4 Nov (free time, then the trains home)
 *   E  after      once we're home
 */
export type Phase = "before" | "travel" | "hackathon" | "return" | "after";

const FIRST = LEGS[0];
const RETURN_TRAIN = LEGS.find((l) => l.id === "L3")!;

const PHASE_START = {
  travel: ms(FIRST.depart) - 2 * HOUR,
  hackathon: ms(EVENT.modeStart),
  return: ms(EVENT.modeEnd),
  after: ms(TRIP.end),
};

export function phaseAt(now: number): Phase {
  if (now < PHASE_START.travel) return "before";
  if (now < PHASE_START.hackathon) return "travel";
  if (now < PHASE_START.return) return "hackathon";
  if (now < PHASE_START.after) return "return";
  return "after";
}

const TEMPLE = EXPLORE.find((e) => /kamakhya/i.test(e.name))!;
/** Cab from IIT to Kamakhya station, plus a little slack for traffic. */
export const IIT_TO_KYQ_MIN = (TRANSFERS.L2b?.cab.minutes ?? 50) + 10;

/** 1 Nov: when to leave IIT (and the temple) for the Brahmaputra, from its live departure. */
export function returnLeaveBy(live: LiveState) {
  const depart = buildSteps(live).find((s) => s.id === RETURN_TRAIN.id)!.start;
  const atStation = depart - EXPLORE_RETURN_MARGIN_MIN * MIN;
  return {
    depart,
    atStation,
    leaveIit: atStation - IIT_TO_KYQ_MIN * MIN,
    leaveTemple: atStation - (TEMPLE.toKyqMin + 10) * MIN,
    temple: TEMPLE,
  };
}

/** Phase D: still in Guwahati, until it's time to leave IIT for the train. */
export const inFreeTime = (now: number, live: LiveState) =>
  phaseAt(now) === "return" && now < returnLeaveBy(live).leaveIit + 15 * MIN;

/** Stations on the journey progress bar, in travel order. */
export const ROUTE_OUT = ["ANND", "ADI", "DLI", "KYQ"] as const;
export const ROUTE_BACK = ["KYQ", "DLI", "ANND"] as const;

/**
 * Where we are along the route, 0 to 1, from the train steps' live times.
 * Each train covers its share of the bar by distance; transfers sit still.
 */
export function journeyProgress(steps: Step[], now: number, direction: "out" | "back") {
  const ids = direction === "out" ? ["L0", "L1", "L2"] : ["L3", "L4"];
  const trains = steps.filter((s) => ids.includes(s.id));
  const total = trains.reduce((t, s) => t + (s.leg?.km ?? 0), 0) || 1;
  let done = 0;
  for (const s of trains) {
    const km = s.leg?.km ?? 0;
    if (now >= s.end) done += km;
    else if (now > s.start) done += km * ((now - s.start) / (s.end - s.start));
  }
  return Math.min(1, done / total);
}
