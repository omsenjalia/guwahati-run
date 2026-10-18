/**
 * Failover: ask each provider in order, return the first success.
 * To add a backup source later, write lib/providers/<name>.ts and append it
 * to PROVIDERS. Nothing else changes.
 */
import { confirmtkt } from "./confirmtkt.ts";
import type { Availability, AvailabilityQuery, LiveRunningStatus, PnrStatus, Provider } from "./types.ts";

export const PROVIDERS: Provider[] = [confirmtkt];

export type Sourced<T> = {
  data: T;
  source: string;
  /** Errors from providers tried before the one that worked. */
  failures: { provider: string; error: string }[];
  fetchedAt: number;
};

export class AllProvidersFailed extends Error {
  constructor(public failures: { provider: string; error: string }[]) {
    super(`All providers failed: ${failures.map((f) => `${f.provider} (${f.error})`).join("; ") || "none configured"}`);
  }
}

async function firstSuccess<T>(
  pick: (p: Provider) => (() => Promise<T>) | undefined,
): Promise<Sourced<T>> {
  const failures: { provider: string; error: string }[] = [];
  for (const p of PROVIDERS) {
    const call = pick(p);
    if (!call) continue;
    try {
      return { data: await call(), source: p.name, failures, fetchedAt: Date.now() };
    } catch (e) {
      failures.push({ provider: p.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  throw new AllProvidersFailed(failures);
}

export const getPnrStatus = (pnr: string) =>
  firstSuccess<PnrStatus>((p) => p.getPnrStatus && (() => p.getPnrStatus!(pnr)));

export const getLiveRunningStatus = (trainNo: string, boardDate: string, boardStation: string) =>
  firstSuccess<LiveRunningStatus>(
    (p) => p.getLiveRunningStatus && (() => p.getLiveRunningStatus!(trainNo, boardDate, boardStation)),
  );

export const getAvailability = (q: AvailabilityQuery) =>
  firstSuccess<Availability[]>((p) => p.getAvailability && (() => p.getAvailability!(q)));

export type { Availability, AvailabilityQuery, LiveRunningStatus, PnrStatus, Provider } from "./types.ts";
