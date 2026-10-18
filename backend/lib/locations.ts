import { TEAM, type PersonId } from "@/data/trip";
import { MIN } from "@/lib/time";

/** A row of the locations table: each attendee's latest fix. */
export type LocationRow = { person: string; lat: number; lon: number; accuracy: number | null; updated_at: string };

/** Where we think a person is, and whose phone that came from. */
export type PersonLocation = { lat: number; lon: number; accuracy: number | null; at: number; via: PersonId };

/** Phones report every 30 min; a fix older than this means their location is off. */
export const FRESH_MS = 45 * MIN;

/**
 * Everyone travels together, so when one phone's location is off we use the
 * freshest fix from another attendee instead (via says whose).
 */
export function effectiveLocations(rows: LocationRow[], now: number): Partial<Record<PersonId, PersonLocation>> {
  const fixes = rows
    .map((r) => ({ lat: r.lat, lon: r.lon, accuracy: r.accuracy, at: Date.parse(r.updated_at), via: r.person as PersonId }))
    .sort((a, b) => b.at - a.at);
  const out: Partial<Record<PersonId, PersonLocation>> = {};
  for (const p of TEAM) {
    const own = fixes.find((f) => f.via === p.id);
    const fresh = (f?: PersonLocation) => f && now - f.at < FRESH_MS;
    const best = fresh(own) ? own : fixes.find((f) => fresh(f)) ?? own ?? fixes[0];
    if (best) out[p.id] = best;
  }
  return out;
}
