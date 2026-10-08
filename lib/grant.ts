import { GRANT, type GrantItem } from "@/data/trip";

/**
 * Grant estimate under the BVM SSIP policy. Train fares count at the most
 * economical class (sleeper) only; 3A legs are claimed at the sleeper fare.
 */

export type GrantLine = GrantItem & { claimPerPerson: number };

export function grantEstimate() {
  const lines: GrantLine[] = GRANT.items.map((i) => ({ ...i, claimPerPerson: i.economyPerPerson ?? i.paidPerPerson }));
  const spentPerPerson = lines.reduce((s, l) => s + l.paidPerPerson, 0);
  const eligiblePerPerson = lines.reduce((s, l) => s + l.claimPerPerson, 0);
  const grantPerPerson = Math.min(eligiblePerPerson, GRANT.capPerStudent);
  return {
    lines,
    spentPerPerson,
    eligiblePerPerson,
    grantPerPerson,
    capped: eligiblePerPerson > GRANT.capPerStudent,
    ownPerPerson: spentPerPerson - grantPerPerson,
    team: { spent: spentPerPerson * 4, grant: grantPerPerson * 4 },
  };
}
