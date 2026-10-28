import { TRIP_SPAN } from "@/data/trip";
import { ms } from "@/lib/time";

/**
 * Which tabs a person sees. Kept out of the layout component so the rules can
 * be tested: the Food tab is for the team only, and only around the journey.
 */

export type TabRole = "team" | "parent";

/** A day: the Food tab opens the day before the first train, not at departure. */
export const DAY = 24 * 60 * 60 * 1000;

/**
 * Parents follow the trip; attendees also get their ticket and the pantry
 * car list. Chat is for both: the server only ever serves a parent the
 * parent-safe view (no PNR numbers; see backend/lib/chat-context.ts).
 */
export const VISIBLE: Record<TabRole, string[]> = {
  parent: ["index", "train", "plan", "location", "money", "chat", "more"],
  team: ["index", "train", "ticket", "food", "plan", "money", "chat", "more"],
};

/**
 * On the trip: from 24 hours before the first departure until the last arrival.
 * Both ends come from LEGS (TRIP_SPAN), so changing a train moves the window.
 */
export const onTripAt = (now: number) => now >= ms(TRIP_SPAN.start) - DAY && now < ms(TRIP_SPAN.end);

/** The tab keys to show, in order. */
export function shownTabs(role: TabRole, now: number): string[] {
  const onTrip = onTripAt(now);
  return VISIBLE[role].filter((k) => k !== "food" || onTrip);
}
