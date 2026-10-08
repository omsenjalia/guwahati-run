/**
 * Picks metro or cab for each transfer from the live arrival time:
 * metro when it is running and still leaves a comfortable margin,
 * otherwise cab. Pure function: used by the background job and phones.
 */
import { LEGS, TRANSFERS, type LegId, type TransferOption } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { MIN, hhmm } from "@/lib/time";
import { buildSteps, type Health } from "@/lib/trip-engine";

export type TransferPlan = {
  legId: LegId;
  mode: "metro" | "cab";
  reason: string;
  /** When we can start (inbound arrival + walk out). */
  start: number;
  /** Expected arrival at the other station with the chosen mode. */
  reachBy: number;
  /** Latest time to set off and still be on time. Undefined without an onward train. */
  leaveBy?: number;
  minutes: number;
  /** Rupees, for all 4 of us. */
  costTotal: number;
  route: string;
  lines: { name: string; color: string }[];
  interchange?: string;
  health: Health;
};

/** Be on the platform this long before the onward train. */
const PLATFORM_MARGIN = 30 * MIN;
/** Metro must leave at least this much extra slack (crowds, missed train). */
const METRO_SLACK = 30 * MIN;

const minutesOfDayIst = (t: number) => {
  const ist = new Date(t + 5.5 * 3600_000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};
const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

export function planTransfers(live: LiveState): TransferPlan[] {
  const steps = buildSteps(live);
  const plans: TransferPlan[] = [];
  for (const [legId, opt] of Object.entries(TRANSFERS) as [LegId, TransferOption][]) {
    const i = LEGS.findIndex((l) => l.id === legId);
    const inbound = steps.find((s) => s.id === LEGS[i - 1]?.id);
    const outbound = LEGS[i + 1]?.kind === "train" || LEGS[i + 1]?.kind === "local-train" ? steps.find((s) => s.id === LEGS[i + 1].id) : undefined;
    if (!inbound) continue;
    plans.push(plan(legId, opt, inbound.end, outbound?.start));
  }
  return plans;
}

function plan(legId: LegId, opt: TransferOption, arrive: number, nextDepart?: number): TransferPlan {
  const start = arrive + opt.walkMin * MIN;
  const deadline = nextDepart !== undefined ? nextDepart - PLATFORM_MARGIN : undefined;
  const cab = {
    mode: "cab" as const,
    minutes: opt.cab.minutes,
    costTotal: opt.cab.fareTotal,
    route: opt.cab.label,
    lines: [],
  };

  let chosen: Omit<TransferPlan, "legId" | "start" | "reachBy" | "leaveBy" | "health" | "reason"> = cab;
  let reason = opt.metro ? "" : "No metro on this route.";

  let depart = start;
  if (opt.metro) {
    const m = opt.metro;
    const startMin = minutesOfDayIst(start);
    const first = toMin(m.firstTrain);
    const last = toMin(m.lastTrain);
    // Before the first train we can wait for it, if there's time.
    const metroStart = startMin < first ? start + (first - startMin) * MIN : start;
    const running = startMin <= last;
    const metroReach = metroStart + m.minutes * MIN;
    const roomy = deadline === undefined || metroReach + METRO_SLACK <= deadline;
    if (running && roomy) {
      chosen = {
        mode: "metro",
        minutes: m.minutes,
        costTotal: m.farePerPerson * 4,
        route: m.route,
        lines: m.lines,
        interchange: m.interchange,
      };
      depart = metroStart;
      reason =
        metroStart > start
          ? `Metro starts about ${m.firstTrain}: wait for the first train. Still plenty of margin and cheaper than a cab.`
          : "Metro is running and leaves plenty of margin.";
    } else if (!running) {
      reason = `Metro has stopped for the night at ${hhmm(start)}.`;
    } else {
      reason =
        metroStart > start
          ? `Metro starts too late (about ${m.firstTrain}) to be safe. A cab is quicker.`
          : "Too tight for the metro. A cab is faster.";
    }
  }

  const reachBy = depart + chosen.minutes * MIN;
  const leaveBy = deadline !== undefined ? deadline - chosen.minutes * MIN : undefined;
  const spare = deadline !== undefined ? deadline - reachBy : Infinity;
  // Spare time is on top of the 30 min platform margin.
  const health: Health = spare >= 45 * MIN ? "green" : spare >= 0 ? "amber" : "red";
  return { legId, start: depart, reachBy, leaveBy, health, reason, ...chosen };
}
