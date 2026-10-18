import { GRANT, TEAM } from "@/data/trip";
import type { ReportRow } from "@/lib/report-data";

/**
 * Grant estimate under the BVM SSIP policy, from what we actually have:
 * the tickets and the receipts in Money (the same rows as the report).
 * The grant is per student, so amounts here are per student (total / 4).
 * 3A fares count at the sleeper rate; food and stay aren't covered.
 */

const STUDENTS = TEAM.length;

export type GrantLine = { key: string; label: string; paid: number; claim: number; note?: string; hasBill: boolean };

export function grantEstimate(rows: ReportRow[]) {
  const lines: GrantLine[] = rows.map((r, i) => ({
    key: `${r.date}-${i}`,
    label: r.label,
    paid: r.amount / STUDENTS,
    claim: r.eligible / STUDENTS,
    note: r.eligible === 0 ? "Not covered by the policy" : r.eligible < r.amount - 0.5 ? "Claimed at the sleeper fare" : undefined,
    hasBill: r.docIds.length > 0,
  }));
  const spent = lines.reduce((s, l) => s + l.paid, 0);
  const eligible = lines.reduce((s, l) => s + l.claim, 0);
  const grant = Math.min(eligible, GRANT.capPerStudent);
  return {
    lines,
    spent,
    eligible,
    grant,
    capped: eligible > GRANT.capPerStudent,
    own: Math.max(0, spent - grant),
    team: { spent: spent * STUDENTS, grant: grant * STUDENTS },
  };
}
