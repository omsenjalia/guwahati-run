/**
 * Pure functions that turn static trip data + live state + "now" into
 * what every screen shows. No React, no network: easy to reuse in the
 * background jobs and the calendar feed.
 */
import {
  BLOCKS,
  CONNECTIONS,
  EVENT,
  LEGS,
  PLACES,
  type Block,
  type Leg,
  type LegId,
  type PersonId,
  type PlaceId,
} from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, dayMonth, hhmm, ms } from "@/lib/time";

export type Health = "green" | "amber" | "red";

export type StepKind =
  | "train"
  | "transfer"
  | "event"
  | "stay"
  | "explore"
  | "pickup"
  | "meal"
  | "sleep";

export type Step = {
  id: string;
  kind: StepKind;
  title: string;
  start: number;
  end: number;
  /** Planned times, to show "was 04:50" when live times differ. */
  plannedStart: number;
  plannedEnd: number;
  place?: PlaceId;
  from?: PlaceId;
  to?: PlaceId;
  leg?: Leg;
  block?: Block;
  approx?: boolean;
  /** Minor steps (meals, sleep) are timeline-only. */
  minor?: boolean;
};

/** Transfers start this long after the inbound train arrives. */
const DISEMBARK_MIN = 25;

/* -------------------------------------------------------------- status */

export type ParsedStatus = {
  kind: "CNF" | "RAC" | "WL" | "CAN" | "UNKNOWN";
  label: string;
  number?: number;
  coach?: string;
  berth?: number;
};

export function parseStatus(raw: string | undefined): ParsedStatus {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return { kind: "UNKNOWN", label: "Unknown" };
  if (s.startsWith("CAN")) return { kind: "CAN", label: "Cancelled" };
  const berth = s.match(/^(?:CNF\s*)?([A-Z]{1,2}\d{1,2})\s*[/ ,]\s*(\d{1,3})/);
  if (berth) return { kind: "CNF", label: `${berth[1]}/${berth[2]}`, coach: berth[1], berth: +berth[2] };
  if (s.startsWith("CNF")) return { kind: "CNF", label: "CNF" };
  const rac = s.match(/RAC\s*(\d+)/);
  if (rac) return { kind: "RAC", label: `RAC ${rac[1]}`, number: +rac[1] };
  // "RAC" on its own: allotted a place but no number/berth until the chart is out.
  if (s === "RAC") return { kind: "RAC", label: "RAC" };
  const wl = s.match(/(PQWL|RLWL|GNWL|TQWL|RSWL|WL)\s*(\d+)/);
  if (wl) return { kind: "WL", label: `${wl[1]} ${wl[2]}`, number: +wl[2] };
  return { kind: "UNKNOWN", label: raw ?? "" };
}

/**
 * Per-passenger status: live PNR data when the background job has fetched
 * it, otherwise the status written in data/trip.ts.
 */
export function legPassengers(leg: Leg, live: LiveState) {
  const l = live.legs[leg.id];
  return (leg.passengers ?? []).map((p) => {
    const lp = l?.passengers?.find((x) => x.person === p.person);
    return {
      person: p.person,
      booked: lp?.booked ?? p.booked,
      current: lp?.current ?? p.current ?? p.booked,
      confirmChance: lp?.confirmChance,
    };
  });
}

export function legBerths(leg: Leg, live: LiveState) {
  return live.legs[leg.id]?.berths ?? leg.berths ?? [];
}

/** True once a ticket needs no more watching: everyone can board. */
export function canBoard(leg: Leg, live: LiveState) {
  const kinds = legPassengers(leg, live).map((p) => parseStatus(p.current).kind);
  return kinds.length > 0 && kinds.some((k) => k === "CNF" || k === "RAC") && !kinds.includes("CAN");
}

/** Health of one reserved leg from its passengers' current statuses. */
export function legHealth(leg: Leg, live: LiveState): Health {
  return legSituation(leg, live).health;
}

export type Situation = {
  kind: "confirmed" | "partial" | "rac" | "waitlisted" | "cancelled" | "unreserved";
  health: Health;
  title: string;
  advice: string;
};

/** Plain-English read of a ticket's state, including what to do about it. */
export function legSituation(leg: Leg, live: LiveState): Situation {
  const pax = legPassengers(leg, live);
  if (!pax.length) return { kind: "unreserved", health: "green", title: "Unreserved", advice: "" };
  const kinds = pax.map((p) => parseStatus(p.current).kind);
  const charted = live.legs[leg.id]?.chartPrepared ?? false;
  const chartAt = `${dayMonth(chartTimeFor(leg))} ${hhmm(chartTimeFor(leg))}`;
  const n = (k: string) => kinds.filter((x) => x === k).length;
  const chances = pax.map((p) => p.confirmChance).filter((c): c is number => c !== undefined);
  const odds = chances.length
    ? ` ConfirmTkt gives ${Math.min(...chances) === Math.max(...chances) ? Math.min(...chances) : `${Math.min(...chances)}-${Math.max(...chances)}`}% chance of confirming.`
    : "";
  const seated = n("CNF") + n("RAC");

  if (n("CAN")) {
    return { kind: "cancelled", health: "red", title: "Ticket cancelled", advice: "Check IRCTC for the refund and switch to plan B now." };
  }
  if (n("WL") === pax.length) {
    return charted
      ? {
          kind: "waitlisted",
          health: "red",
          title: "Still waitlisted after the chart",
          advice: "A fully waitlisted e-ticket is cancelled and refunded automatically. Pick another train from Plan B.",
        }
      : {
          kind: "waitlisted",
          health: "amber",
          title: "Waitlisted",
          advice: `The chart comes out around ${chartAt}.${odds} Plan B below shows what to do if it doesn't clear.`,
        };
  }
  if (n("WL")) {
    return {
      kind: "partial",
      health: "green",
      title: `${seated} of ${pax.length} have a seat: all 4 can board`,
      advice: `When even one passenger on the PNR is confirmed or RAC, everyone on it can board and sit with them.${charted ? "" : ` The chart around ${chartAt} decides the rest.${odds}`}`,
    };
  }
  if (n("RAC")) {
    return {
      kind: "rac",
      health: "green",
      title: `RAC for ${n("RAC")} of ${pax.length}: can board`,
      advice:
        "RAC means two people share one side-lower berth: sit by day, take turns lying down at night. After the train leaves, ask the TTE for any vacant berth; RAC gets upgraded first.",
    };
  }
  return { kind: "confirmed", health: "green", title: "All confirmed", advice: "" };
}

export const worst = (hs: Health[]): Health =>
  hs.includes("red") ? "red" : hs.includes("amber") ? "amber" : "green";

/* --------------------------------------------------------------- chart */

/**
 * Indian Railways first-chart rule (Railway Board revision of December 2025,
 * which replaced the July 2025 rule of 21:00 and 8 hours): trains leaving
 * between 05:01 and 14:00 are charted by 20:00 the previous day; all others
 * at least 10 hours before departure. The chart is prepared at the train's
 * origin station, so a leg booked from further along the route should pass
 * that departure (Leg.chartDepart). Live data overrides this when available.
 */
export function chartTime(departIso: string) {
  const d = ms(departIso);
  const istHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(d),
  );
  const istMinute = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", minute: "2-digit" }).format(d),
  );
  const minutes = istHour * 60 + istMinute;
  if (minutes > 5 * 60 && minutes <= 14 * 60) {
    // 20:00 IST on the previous day.
    const midnight = d - minutes * MIN;
    return midnight - 4 * HOUR;
  }
  return d - 10 * HOUR;
}

/** The chart time for one of our legs, from the departure the chart is made at. */
export const chartTimeFor = (leg: Leg) => chartTime(leg.chartDepart ?? leg.depart);

/* --------------------------------------------------------------- steps */

function legTimes(leg: Leg, live: LiveState, prevArrive?: number) {
  const plannedStart = ms(leg.depart);
  const plannedEnd = ms(leg.arrive);
  const l = live.legs[leg.id];
  let start = l?.expectedDepart ? ms(l.expectedDepart) : plannedStart;
  let end = l?.expectedArrive ? ms(l.expectedArrive) : plannedEnd;
  // A transfer can only begin once the train before it has arrived.
  if (leg.kind === "transfer" && prevArrive !== undefined) {
    const earliest = prevArrive + DISEMBARK_MIN * MIN;
    if (earliest > start) {
      const len = end - start;
      start = earliest;
      end = earliest + len;
    }
  }
  return { start, end, plannedStart, plannedEnd };
}

const legTitle = (leg: Leg) =>
  leg.train
    ? `${leg.train.number} ${leg.train.name}`
    : (leg.title ?? `${PLACES[leg.from].short} to ${PLACES[leg.to].short}`);

/** Every step of the trip, sorted, with live-adjusted times. */
export function buildSteps(live: LiveState): Step[] {
  const steps: Step[] = [];
  let prevArrive: number | undefined;

  for (const leg of LEGS) {
    const t = legTimes(leg, live, prevArrive);
    steps.push({
      id: leg.id,
      kind: leg.kind,
      title: legTitle(leg),
      ...t,
      from: leg.from,
      to: leg.to,
      place: leg.from,
      leg,
      approx: leg.approx,
    });
    if (leg.kind === "train") {
      steps.push(...sleepFor(leg, t.start, t.end), ...mealsFor(leg, t.start, t.end));
    }
    prevArrive = t.end;
  }

  for (const block of BLOCKS) {
    const start = ms(block.start);
    const end = ms(block.end);
    steps.push({
      id: block.id,
      kind: block.kind,
      title: block.title,
      start,
      end,
      plannedStart: start,
      plannedEnd: end,
      place: block.place,
      block,
    });
  }

  return steps.sort((a, b) => a.start - b.start || Number(!!a.minor) - Number(!!b.minor));
}

/** IST midnight (epoch ms) of the day containing t. */
function istMidnight(t: number) {
  const ist = t + 5.5 * HOUR;
  return ist - (ist % (24 * HOUR)) - 5.5 * HOUR;
}

function sleepFor(leg: Leg, start: number, end: number): Step[] {
  const out: Step[] = [];
  for (let day = istMidnight(start) - 24 * HOUR; day < end; day += 24 * HOUR) {
    const s = Math.max(start + 45 * MIN, day + 22.5 * HOUR);
    const e = Math.min(end - 45 * MIN, day + 30 * HOUR); // 06:00 next day
    if (e - s >= 2 * HOUR) {
      out.push({
        id: `${leg.id}-sleep-${day}`,
        kind: "sleep",
        title: e === end - 45 * MIN ? `Sleep. Wake 45 min before ${PLACES[leg.to].short}` : "Sleep",
        start: s,
        end: e,
        plannedStart: s,
        plannedEnd: e,
        leg,
        minor: true,
      });
    }
  }
  return out;
}

const MEALS = [
  { name: "Breakfast", at: 8 * HOUR },
  { name: "Lunch", at: 13 * HOUR },
  { name: "Dinner", at: 20 * HOUR },
];

function mealsFor(leg: Leg, start: number, end: number): Step[] {
  const out: Step[] = [];
  for (let day = istMidnight(start); day < end; day += 24 * HOUR) {
    for (const meal of MEALS) {
      const t = day + meal.at;
      if (t > start + 30 * MIN && t < end - 30 * MIN) {
        out.push({
          id: `${leg.id}-meal-${t}`,
          kind: "meal",
          title: `${meal.name} on board`,
          start: t,
          end: t + 30 * MIN,
          plannedStart: t,
          plannedEnd: t + 30 * MIN,
          leg,
          minor: true,
        });
      }
    }
  }
  return out;
}

/* ----------------------------------------------------------------- now */

export type NowState = {
  phase: "pre-trip" | "on-trip" | "post-trip";
  current?: Step;
  next?: Step;
  /** The step the hero card should show. */
  focus?: Step;
  focusMode: "upcoming" | "active";
  instruction: string;
  /** When the hero countdown points at. */
  countdownTo?: number;
  countdownLabel: string;
};

const MAJOR_PRIORITY: Partial<Record<StepKind, number>> = {
  train: 5,
  transfer: 4,
  pickup: 4,
  event: 3,
  explore: 2,
  stay: 1,
};

export function computeNow(steps: Step[], now: number): NowState {
  const majors = steps.filter((s) => !s.minor);
  const active = majors
    .filter((s) => s.start <= now && now < s.end)
    .sort((a, b) => (MAJOR_PRIORITY[b.kind] ?? 0) - (MAJOR_PRIORITY[a.kind] ?? 0));
  const current = active[0];
  const next = majors.find((s) => s.start > now && s !== current);
  const first = majors[0];
  const last = majors[majors.length - 1];
  const phase = now < first.start ? "pre-trip" : now >= last.end ? "post-trip" : "on-trip";

  // An upcoming train within 3 hours outranks a low-priority active block
  // (e.g. "rest at IITG" while the hackathon is about to start).
  const urgent =
    next && current && (MAJOR_PRIORITY[current.kind] ?? 0) <= 2 && next.start - now < 3 * HOUR;
  const focus = urgent ? next : current ?? next;
  const focusMode = focus === current ? "active" : "upcoming";

  if (!focus) {
    return { phase, current, next, focusMode: "active", instruction: "Trip complete. Settle up in Splitwise.", countdownLabel: "" };
  }
  return { phase, current, next, focus, focusMode, ...instructionFor(focus, focusMode) };
}

/** How early to reach a station before departure. */
export const REPORT_BEFORE_MIN = 40;

function instructionFor(step: Step, mode: "upcoming" | "active") {
  const from = step.from ? PLACES[step.from].short : "";
  const to = step.to ? PLACES[step.to].short : "";
  const leg = step.leg;

  if (step.kind === "train") {
    if (mode === "upcoming") {
      const reportBy = step.start - REPORT_BEFORE_MIN * MIN;
      return {
        instruction: `Be at ${from} by ${hhmm(reportBy)}.`,
        countdownTo: step.start,
        countdownLabel: `Departs ${from}`,
      };
    }
    return {
      instruction: `On board ${leg?.train?.name}. Arrive ${to} ${hhmm(step.end)}.`,
      countdownTo: step.end,
      countdownLabel: `Arrives ${to}`,
    };
  }
  if (step.kind === "transfer") {
    return mode === "upcoming"
      ? { instruction: `Next: ${leg?.modeHint}.`, countdownTo: step.start, countdownLabel: `Leave ${from}` }
      : { instruction: `${leg?.modeHint}. Reach ${to} by ${hhmm(step.end)}.`, countdownTo: step.end, countdownLabel: `Reach ${to}` };
  }
  if (step.kind === "event") {
    return mode === "upcoming"
      ? { instruction: `Be at the venue by ${hhmm(step.start - 30 * MIN)}.`, countdownTo: step.start, countdownLabel: "Hackathon starts" }
      : { instruction: "Hackathon is live. Build, rest in turns, ship.", countdownTo: step.end, countdownLabel: "Hackathon ends" };
  }
  if (step.kind === "explore") {
    return mode === "upcoming"
      ? { instruction: "Free time in Guwahati starts after the finals.", countdownTo: step.start, countdownLabel: "Free time" }
      : { instruction: `Be back at Kamakhya by ${hhmm(step.end)}. Train at 16:55.`, countdownTo: step.end, countdownLabel: "Head to Kamakhya" };
  }
  if (step.kind === "pickup") {
    return {
      instruction: "Book a Rapido or take an auto home. Stay together.",
      countdownTo: mode === "upcoming" ? step.start : undefined,
      countdownLabel: "Arrive Anand",
    };
  }
  if (step.kind === "stay") {
    return { instruction: `Rest at ${PLACES[step.place ?? "IITG"].short}. Hackathon starts ${hhmm(ms(EVENT.start))}.`, countdownTo: step.end, countdownLabel: "Rest ends" };
  }
  return { instruction: step.title, countdownTo: step.start, countdownLabel: "" };
}

/* --------------------------------------------------------- connections */

export type ConnectionState = {
  id: string;
  label: string;
  bufferMin: number;
  plannedBufferMin: number;
  health: Health;
  inboundArrive: number;
  outboundDepart: number;
};

/** Transfer time assumed between arrival and the next departure, minutes. */
// L1b is a wait at the same station, so it takes no transfer time.
const TRANSFER_MIN: Record<string, number> = { L1b: 0, L3b: 30 };

export function connectionStates(live: LiveState): ConnectionState[] {
  const steps = buildSteps(live);
  const byId = (id: LegId) => steps.find((s) => s.id === id)!;
  return CONNECTIONS.map((c) => {
    const inbound = byId(c.inbound);
    const outbound = byId(c.outbound);
    const transfer = TRANSFER_MIN[c.transfer] ?? 45;
    const bufferMin = Math.round((outbound.start - inbound.end) / MIN - transfer);
    // Green with 90+ spare minutes, amber with 30+, red below that.
    const health: Health = bufferMin >= 90 ? "green" : bufferMin >= 30 ? "amber" : "red";
    return {
      id: c.id,
      label: c.label,
      bufferMin,
      plannedBufferMin: c.plannedBufferMin,
      health,
      inboundArrive: inbound.end,
      outboundDepart: outbound.start,
    };
  });
}

/* ------------------------------------------------------- trip health */

export function tripHealth(live: LiveState, now: number) {
  const upcoming = LEGS.filter((l) => l.kind === "train" && ms(l.arrive) > now);
  const legs = upcoming.map((l) => ({ leg: l, health: legHealth(l, live) }));
  const conns = connectionStates(live).filter((c) => c.outboundDepart > now);
  const overall = worst([...legs.map((l) => l.health), ...conns.map((c) => c.health)]);
  return { overall, legs, conns };
}

/* ----------------------------------------------------------- helpers */

export const isHackathonMode = (now: number) =>
  now >= ms(EVENT.modeStart) && now < ms(EVENT.modeEnd);

export function personBerth(leg: Leg, live: LiveState, person: PersonId) {
  return legBerths(leg, live).find((b) => b.person === person);
}
