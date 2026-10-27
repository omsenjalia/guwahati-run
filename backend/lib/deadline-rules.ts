/**
 * The backup rules still in force, evaluated against live data.
 * Pure: the deadline watcher job and every phone use the same code.
 */
import { CONNECTIONS, DEADLINES, LEGS, type Deadline } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, duration, ms, stamp } from "@/lib/time";
import { chartTimeFor, legSituation } from "@/lib/trip-engine";

export type Verdict = {
  id: string;
  status: "upcoming" | "action" | "ok" | "passed";
  message: string;
  evaluatedAt: number;
};

export function evaluate(d: Deadline, live: LiveState, now: number): Verdict {
  const leg = LEGS.find((l) => l.id === d.leg)!;
  const at = ms(d.at);
  const sit = legSituation(leg, live);
  const v = (status: Verdict["status"], message: string): Verdict => ({ id: d.id, status, message, evaluatedAt: now });
  const charted = live.legs[leg.id]?.chartPrepared ?? false;

  switch (d.id) {
    case "aa-chart": {
      if (!charted) {
        return now < at
          ? v("upcoming", `Chart expected around ${stamp(chartTimeFor(leg))}. ${sit.title}.`)
          : v("upcoming", "Chart is late. Still checking every 15 minutes.");
      }
      if (sit.kind === "waitlisted") {
        return v("action", "Still waitlisted after the chart: the ticket auto-cancels and refunds. Pick another train from Plan B.");
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

