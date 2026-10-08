/**
 * The backup rules from the brief, evaluated against live data.
 * Pure: the deadline watcher job and every phone use the same code.
 */
import { CONNECTIONS, DEADLINES, LEGS, type Deadline } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, duration, hhmm, ms, stamp } from "@/lib/time";
import { chartTime, legPassengers, legSituation, parseStatus } from "@/lib/trip-engine";

export type Verdict = {
  id: string;
  status: "upcoming" | "action" | "ok" | "passed";
  message: string;
  evaluatedAt: number;
};

/** Highest waitlist number among us, or 0 when nobody is waitlisted. */
function maxWl(legId: string, live: LiveState) {
  const leg = LEGS.find((l) => l.id === legId)!;
  return Math.max(0, ...legPassengers(leg, live).map((p) => {
    const s = parseStatus(p.current);
    return s.kind === "WL" ? (s.number ?? 999) : 0;
  }));
}

function minChance(legId: string, live: LiveState) {
  const leg = LEGS.find((l) => l.id === legId)!;
  const c = legPassengers(leg, live).map((p) => p.confirmChance).filter((x): x is number => x !== undefined);
  return c.length ? Math.min(...c) : undefined;
}

export function evaluate(d: Deadline, live: LiveState, now: number): Verdict {
  const leg = LEGS.find((l) => l.id === d.leg)!;
  const at = ms(d.at);
  const sit = legSituation(leg, live);
  const v = (status: Verdict["status"], message: string): Verdict => ({ id: d.id, status, message, evaluatedAt: now });
  const charted = live.legs[leg.id]?.chartPrepared ?? false;

  switch (d.id) {
    case "D1": // Tatkal SL for 19031
    case "D3": {
      // Tatkal AC for 12506
      if (now > at + 2 * HOUR) return v("passed", "Tatkal window has passed.");
      const wl = maxWl(leg.id, live);
      const chance = minChance(leg.id, live);
      const threshold = d.id === "D1" ? 20 : 15;
      if (wl === 0) return v("ok", "No action: everyone has a seat or RAC.");
      const risky = wl > threshold || (chance !== undefined && chance < 70);
      const odds = chance !== undefined ? `, ${chance}% chance` : "";
      if (!risky) return v("ok", `No action: WL ${wl}${odds} is likely to clear.`);
      // Only call it "action needed" in the last 24h; waitlists move a lot before that.
      return now < at - 24 * HOUR
        ? v("upcoming", `Likely needed: still WL ${wl}${odds}. Decided automatically on ${stamp(at - 24 * HOUR)}.`)
        : v("action", `Still waitlisted (up to WL ${wl}${odds}). Book Tatkal when it opens at ${hhmm(at)}.`);
    }
    case "D2": // chart for 19031
    case "D4": {
      // chart for 12506
      if (!charted) {
        return now < at
          ? v("upcoming", `Chart expected around ${stamp(chartTime(leg.depart))}. ${sit.title}.`)
          : v("upcoming", "Chart is late. Still checking every 15 minutes.");
      }
      if (sit.kind === "waitlisted" || sit.kind === "partial") {
        const other = d.id === "D2" ? "12506 North East Exp" : "15658 Brahmaputra Exp";
        return v(
          "action",
          `${sit.title} after the chart. Use the Tatkal ticket or plan B. If there's no backup, cancel ${other} early for a better refund.`,
        );
      }
      return v("ok", `Chart done: ${sit.title.toLowerCase()}.`);
    }
    case "D5": {
      // Brahmaputra 3h+ late on 2 Nov
      const l = live.legs.L3;
      if (now < at - 6 * HOUR) return v("upcoming", "Checked automatically on 2 Nov from 04:00.");
      if (now > ms(leg.arrive) + HOUR) return v("passed", "Brahmaputra has arrived.");
      const delay = l?.delayMin ?? 0;
      if (!l?.liveUpdatedAt) return v("upcoming", "Waiting for live running data.");
      return delay >= 180
        ? v("action", `15658 is running ${duration(delay * MIN)} late. ${CONNECTIONS[1].planB.text}`)
        : v("ok", `No action: 15658 is ${delay > 0 ? `${duration(delay * MIN)} late` : "on time"}${l.lastStation ? ` near ${l.lastStation}` : ""}.`);
    }
    case "D6": {
      const d5 = evaluate(DEADLINES.find((x) => x.id === "D5")!, live, now);
      if (now > at) return v("passed", "Garib Rath chart time has passed.");
      return d5.status === "action"
        ? v("action", "Brahmaputra is 3h+ late. If you booked 12918, cancel 12215 before its chart.")
        : v("ok", "No action unless we switch to 12918.");
    }
  }
  return v("upcoming", "");
}

