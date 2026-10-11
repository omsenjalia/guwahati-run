/**
 * The backup rules still in force, evaluated against live data.
 * Pure: the deadline watcher job and every phone use the same code.
 */
import { CONNECTIONS, DEADLINES, LEGS, type Deadline } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, duration, hhmm, ms, stamp } from "@/lib/time";
import { canBoard, chartTime, legPassengers, legSituation, parseStatus } from "@/lib/trip-engine";
import { BACKUP } from "@/lib/ticket-choice";

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
    case "ne-tatkal": {
      // AC Tatkal for 12506, 28 Oct 10:00. Only matters while still waitlisted.
      if (now > at + 2 * HOUR) return v("passed", "Tatkal window has passed.");
      if (sit.kind !== "waitlisted") return v("ok", `No action: ${sit.title.toLowerCase()}.`);
      if (canBoard(BACKUP, live)) return v("ok", `No action: the backup ${BACKUP.train!.number} ${BACKUP.train!.name} has seats.`);
      const wl = maxWl(leg.id, live);
      const chance = minChance(leg.id, live);
      const risky = wl > 15 || (chance !== undefined && chance < 70);
      const odds = chance !== undefined ? `, ${chance}% chance` : "";
      if (!risky) return v("ok", `No action: GNWL ${wl}${odds} is likely to clear.`);
      // Only call it "action needed" on the morning itself; waitlists move a lot before that.
      return now < at - 24 * HOUR
        ? v("upcoming", `Likely needed: still GNWL ${wl}${odds}. Decided on the morning of 28 Oct.`)
        : v("action", `Still GNWL ${wl}${odds}. Book Tatkal for all 4 when it opens at ${hhmm(at)}.`);
    }
    case "ne-chart": {
      if (!charted) {
        return now < at
          ? v("upcoming", `Chart expected around ${stamp(chartTime(leg.depart))}. ${sit.title}.`)
          : v("upcoming", "Chart is late. Still checking every 15 minutes.");
      }
      if (sit.kind === "waitlisted") {
        if (canBoard(BACKUP, live)) return v("ok", `12506 didn't clear, but the backup ${BACKUP.train!.number} has seats: take it from Delhi Jn.`);
        return v("action", "All 4 still waitlisted after the chart: the ticket auto-cancels and refunds. Use the backup if it clears, a Tatkal ticket, or the Plan B alternatives.");
      }
      return v("ok", `Chart done: ${sit.title.toLowerCase()}.`);
    }
    case "bp-late": {
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
    case "gr-chart": {
      const late = evaluate(DEADLINES.find((x) => x.id === "bp-late")!, live, now);
      if (now > at) return v("passed", "Garib Rath chart time has passed.");
      return late.status === "action"
        ? v("action", "Brahmaputra is 3h+ late. If you booked 12918, cancel 12215 before its chart.")
        : v("ok", "No action unless we switch to 12918.");
    }
  }
  return v("upcoming", "");
}

