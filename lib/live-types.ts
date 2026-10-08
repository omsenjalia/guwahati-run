import type { Berth, LegId, PersonId } from "@/data/trip";

/**
 * Live state written by the background jobs (phase 3+) and synced to phones.
 * Every field is optional: the app always falls back to the static trip data.
 */

export type PassengerLive = {
  person: PersonId;
  booked: string;
  current: string;
  /** 0-100 when a provider gives one. */
  confirmChance?: number;
};

export type LegLive = {
  legId: LegId;
  /** Live-expected times (ISO). Missing means "as scheduled". */
  expectedDepart?: string;
  expectedArrive?: string;
  delayMin?: number;
  platform?: string;
  lastStation?: string;
  passengers?: PassengerLive[];
  berths?: Berth[];
  chartPrepared?: boolean;
  /** Epoch ms of the last successful fetch. */
  updatedAt?: number;
  /** True when every provider failed and this is the last known value. */
  stale?: boolean;
  source?: string;
};

export type LiveState = {
  legs: Partial<Record<LegId, LegLive>>;
  updatedAt?: number;
};

export const EMPTY_LIVE: LiveState = { legs: {} };
