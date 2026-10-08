import { GRANT, type GrantItem } from "@/data/trip";

/**
 * Grant estimate under the BVM SSIP policy.
 * "booked": the college accepts our actual classes (3A).
 * "economy": train fares count only at the most economical class (sleeper).
 */
export type GrantScenario = "booked" | "economy";

export type GrantLine = GrantItem & { claimPerPerson: number };

export function grantEstimate(scenario: GrantScenario) {
  const lines: GrantLine[] = GRANT.items.map((i) => ({
    ...i,
    claimPerPerson: scenario === "economy" && i.economyPerPerson !== undefined ? i.economyPerPerson : i.paidPerPerson,
  }));
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
