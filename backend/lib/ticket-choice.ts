import { BACKUPS, LEGS, type Leg, type LegId } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { canBoard } from "@/lib/trip-engine";

/**
 * North East Express vs its backup (15910 Avadh Assam): whichever can board
 * first wins (at least one of us confirmed or RAC); if both clear at the same
 * check, North East wins. The other ticket gets cancelled. Once decided, the
 * choice never flips: the background job stores it in app_state.
 */

export const PRIMARY = LEGS.find((l) => l.id === "L2")!;
export const BACKUP = BACKUPS.find((b) => b.backupFor === "L2")!;

export type TicketChoice = { winner: LegId; loser: LegId; at: number };

export function decideChoice(prev: TicketChoice | undefined, live: LiveState, now: number): TicketChoice | undefined {
  if (prev) return prev;
  if (canBoard(PRIMARY, live)) return { winner: PRIMARY.id, loser: BACKUP.id, at: now };
  if (canBoard(BACKUP, live)) return { winner: BACKUP.id, loser: PRIMARY.id, at: now };
  return undefined;
}

/** The stored decision, if any (synced to every phone). */
export const storedChoice = (live: LiveState) => live.state["ticket-choice"] as TicketChoice | undefined;

const byId = (id: LegId): Leg => [...LEGS, ...BACKUPS].find((l) => l.id === id)!;

/** Plain-English outcome for alerts and cards. */
export function choiceText(c: TicketChoice) {
  const win = byId(c.winner);
  const lose = byId(c.loser);
  return {
    title:
      c.winner === PRIMARY.id
        ? `North East Express cleared: cancel the backup ${lose.train!.number}`
        : `Backup ${win.train!.number} ${win.train!.name} cleared first: we take it`,
    action: `Cancel ${lose.train!.number} ${lose.train!.name} (PNR ${lose.pnr}) on IRCTC now. A waitlisted ticket cancelled before its chart is refunded except a small clerkage fee.`,
    win,
    lose,
  };
}
