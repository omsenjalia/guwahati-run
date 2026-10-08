/**
 * One interface for every train-data source. Providers are tried in order;
 * the first that succeeds wins (see ./index.ts).
 *
 * Runtime-agnostic on purpose: plain fetch + relative imports only, so the
 * same files run in Next.js and in Supabase Edge Functions (Deno).
 */

export type BerthCode = "LB" | "MB" | "UB" | "SL" | "SU" | "SM" | string;

export type PnrPassenger = {
  /** 1-based, booking order. */
  number: number;
  booking: string;
  current: string;
  coach?: string;
  berth?: number;
  berthCode?: BerthCode;
  /** 0-100 when the provider predicts confirmation. */
  confirmChance?: number;
};

export type PnrStatus = {
  pnr: string;
  trainNo: string;
  trainName?: string;
  /** DD-MM-YYYY boarding date. */
  journeyDate?: string;
  from?: string;
  to?: string;
  travelClass?: string;
  chartPrepared: boolean;
  trainCancelled: boolean;
  expectedPlatform?: string;
  /** Coach order on the platform, engine first, e.g. "L SLR GS S8 ...". */
  coachPosition?: string;
  passengers: PnrPassenger[];
};

export type StationStatus = {
  code: string;
  name: string;
  /** ISO with +05:30. Scheduled. */
  schArr?: string;
  schDep?: string;
  /** ISO with +05:30. Actual if passed, expected if not. */
  expArr?: string;
  expDep?: string;
  delayArrMin?: number;
  delayDepMin?: number;
  platform?: string;
  passed: boolean;
  dayCount: number;
};

export type LiveRunningStatus = {
  trainNo: string;
  /** YYYY-MM-DD the train started from its origin. */
  startDate: string;
  found: boolean;
  departed: boolean;
  terminated: boolean;
  currentStation?: { code: string; name: string };
  delayMin?: number;
  /** As reported by the provider, if any. */
  providerUpdatedAt?: string;
  stations: StationStatus[];
};

export type AvailabilityQuery = {
  trainNo: string;
  from: string;
  to: string;
  /** DD-MM-YYYY */
  date: string;
  travelClass: string;
  quota: "GN" | "TQ" | "PT" | "LD" | "SS";
};

export type Availability = {
  date: string;
  travelClass: string;
  status: string;
  confirmChance?: number;
  verdict?: string;
};

export type Provider = {
  name: string;
  getPnrStatus?: (pnr: string) => Promise<PnrStatus>;
  /** boardDate = YYYY-MM-DD we board at boardStation. */
  getLiveRunningStatus?: (trainNo: string, boardDate: string, boardStation: string) => Promise<LiveRunningStatus>;
  getAvailability?: (q: AvailabilityQuery) => Promise<Availability[]>;
};

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(`${provider}: ${message}`);
  }
}
