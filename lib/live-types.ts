import type { Berth, LegId, PersonId } from "@/data/trip";

/**
 * Live state written by the background jobs and synced to phones.
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
  /** Boarding platform. */
  platform?: string;
  arrivalPlatform?: string;
  lastStation?: string;
  departed?: boolean;
  terminated?: boolean;
  passengers?: PassengerLive[];
  berths?: Berth[];
  chartPrepared?: boolean;
  trainCancelled?: boolean;
  /** Coach order on the platform, engine end first. */
  coachPosition?: string;
  pnrUpdatedAt?: number;
  liveUpdatedAt?: number;
  /** Epoch ms of the most recent successful fetch of any kind. */
  updatedAt?: number;
  /** True when every provider failed and this is the last known value. */
  stale?: boolean;
  source?: string;
};

export type Weather = {
  placeId: string;
  tempC: number;
  code: number;
  todayMax: number;
  todayMin: number;
  rainChance: number;
  fetchedAt: number;
};

export type LiveState = {
  legs: Partial<Record<LegId, LegLive>>;
  /** app_state rows: weather, connection risk, briefing, Splitwise... */
  state: { weather?: Record<string, Weather> } & Record<string, unknown>;
  /** When this phone last synced with the cloud. */
  syncedAt?: number;
};

export const EMPTY_LIVE: LiveState = { legs: {}, state: {} };
