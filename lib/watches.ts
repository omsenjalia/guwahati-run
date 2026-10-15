import type { Availability, PnrStatus } from "@/lib/providers/types.ts";
import type { LiveState } from "@/lib/live-types";
import { HOUR, MIN, ms } from "@/lib/time";

/**
 * Extra things to track, added from the Tickets page without touching
 * data/trip.ts:
 *   pnr     any PNR (someone else's ticket, a new booking)
 *   route   waitlist for a train between two stations on a date, without a ticket
 *
 * Each watch is its own app_state row ("watch:<id>"), so adding, removing
 * and the background refresh never overwrite each other. Phones get them
 * through the normal app_state sync.
 */

export const WATCH_PREFIX = "watch:";

/** One point per status change, for the graph. wl = 0 once seated/available. */
export type WatchPoint = { t: number; status: string; wl: number; chance?: number };

type Base = {
  id: string;
  addedBy?: string | null;
  addedAt: number;
  /** Last successful check. */
  updatedAt?: number;
  /** Last check failed with this (the old data is kept). */
  error?: string;
  history: WatchPoint[];
};

export type PnrWatch = Base & { kind: "pnr"; pnr: string; data?: PnrStatus };

export type RouteWatch = Base & {
  kind: "route";
  trainNo: string;
  from: string;
  to: string;
  /** YYYY-MM-DD */
  date: string;
  travelClass: string;
  quota: "GN" | "TQ";
  data?: Availability;
};

export type Watch = PnrWatch | RouteWatch;

export const CLASSES = ["SL", "3A", "2A", "1A", "3E", "CC", "2S"] as const;

export function watchesFrom(live: LiveState): Watch[] {
  return Object.entries(live.state)
    .filter(([k, v]) => k.startsWith(WATCH_PREFIX) && v)
    .map(([, v]) => v as Watch)
    .sort((a, b) => a.addedAt - b.addedAt);
}

/** "GNWL127/WL83" -> 83, "RAC 4" -> 0 (seated), "AVAILABLE-0045" -> 0. Highest across passengers. */
export function wlOf(statuses: string[]): number {
  return Math.max(
    0,
    ...statuses.map((s) => {
      const all = [...s.toUpperCase().matchAll(/WL\s*(\d+)/g)];
      return all.length ? Number(all[all.length - 1][1]) : 0;
    }),
  );
}

/** Text that sums up a watch's current state (what changes trigger alerts on). */
export function watchStatus(w: Watch): string {
  if (!w.data) return "";
  if (w.kind === "route") return w.data.status;
  return w.data.passengers.map((p) => p.current).join(", ");
}

export function watchTitle(w: Watch): string {
  if (w.kind === "pnr") {
    const d = w.data;
    return d ? `${d.trainNo} ${d.trainName ?? ""}`.trim() : `PNR ${w.pnr}`;
  }
  return `${w.trainNo} ${w.from} to ${w.to}`;
}

/** Midnight IST of the journey date, or undefined if not known yet. */
export function journeyDay(w: Watch): number | undefined {
  if (w.kind === "route") return ms(`${w.date}T00:00:00+05:30`);
  const d = w.data?.journeyDate?.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  return d ? ms(`${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}T00:00:00+05:30`) : undefined;
}

/** How often the background job checks this watch, or null when there's nothing left to watch. */
export function watchInterval(w: Watch, now: number): number | null {
  const day = journeyDay(w);
  if (day !== undefined && now > day + 24 * HOUR) return null; // journey is over
  if (w.kind === "pnr" && w.data?.chartPrepared) return null; // final
  if (!w.updatedAt) return MIN; // never checked: right away
  if (day !== undefined && day - now < 2 * 24 * HOUR) return 30 * MIN;
  return 2 * HOUR;
}
