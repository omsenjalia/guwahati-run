import { describe, expect, it } from "vitest";
import { GRANT, LEGS, TEAM, rebookingLoss } from "@/data/trip";
import { reportCsv, reportRows, reportTotals } from "@/lib/report-data";
import type { DocRow } from "@/lib/documents";

/**
 * The report goes to the college, and the SSIP policy pays the most economical
 * class: a 3A ticket is claimed at the sleeper fare. Quoting the full 3A fare as
 * the claim (which the report used to do) overstates it by thousands.
 */

/** One uploaded ticket per train leg, so every fare counts. */
const docs = LEGS.filter((l) => l.train).map(
  (l) => ({ id: `doc-${l.id}`, kind: "ticket", leg_id: l.id } as unknown as DocRow),
);

const rows = reportRows([], docs);
const trainRow = (legId: string) => {
  const leg = LEGS.find((l) => l.id === legId)!;
  return rows.find((r) => r.label.startsWith(leg.train!.number))!;
};

describe("report claims the sleeper fare, not the 3A fare", () => {
  it("lists one row per train leg, plus the cancellation charge", () => {
    const legs = LEGS.filter((l) => l.train && l.fareTotal);
    const cancels = legs.filter((l) => l.rebooking);
    expect(rows.filter((r) => r.category === "Train").length).toBe(legs.length + cancels.length);
    // A cancellation charge is money already lost, never a claimable fare.
    const cancelRow = rows.find((r) => r.label.includes("cancellation"))!;
    expect(cancelRow.eligible).toBe(0);
  });

  it("claims every 3A leg at the sleeper rate for all four", () => {
    for (const leg of LEGS.filter((l) => l.train && l.fareTotal && l.travelClass === "3A")) {
      const rate = GRANT.sleeperFarePerPerson[leg.id];
      expect(rate, `${leg.id} has no sleeper rate`).toBeDefined();
      const row = trainRow(leg.id);
      expect(row.eligible).toBe(rate! * TEAM.length);
      // The ticket we hold is 3A, so the claim must be the smaller number.
      expect(row.eligible).toBeLessThan(row.amount);
      expect(row.description).toContain("claimed at the sleeper fare");
    }
  });

  it("keeps the real 3A fares out of the claimed figure", () => {
    const avadh = trainRow("L2");
    expect(avadh.amount).toBe(9095.4); // what we paid, unchanged
    expect(avadh.eligible).toBe(3600); // 900 x 4
    const brahmaputra = trainRow("L3");
    expect(brahmaputra.amount).toBe(8477.2);
    expect(brahmaputra.eligible).toBe(3300); // 825 x 4
    // Garib Rath has no sleeper class: claimed at the Mail/Express SL fare for
    // the same Anand-Delhi run, not its 3A fare in full.
    const garib = trainRow("L4");
    expect(garib.amount).toBe(3995.4);
    expect(garib.eligible).toBe(1960); // 490 x 4
  });

  it("never claims more than was paid", () => {
    for (const r of reportRows([], null)) expect(r.eligible).toBeLessThanOrEqual(r.amount + 0.001);
  });

  it("totals both columns, and the claim is the lower one", () => {
    const t = reportTotals(rows);
    const fares = LEGS.filter((l) => l.train && l.fareTotal).reduce((sum, l) => sum + l.fareTotal!, 0);
    const lost = LEGS.reduce((sum, l) => sum + rebookingLoss(l), 0);
    expect(t.total).toBeCloseTo(fares + lost, 2);
    expect(t.claimed).toBe(3600 + 3300 + 1960 + 639.5 + 2359.5);
    expect(t.claimed).toBeLessThan(t.total);
    expect(t.perStudent).toBeCloseTo(t.total / TEAM.length, 2);
    expect(t.eligiblePerStudent).toBeCloseTo(t.claimed / TEAM.length, 2);
    // Every category shows the same claim as the row it came from.
    const trainClaim = t.claimedByCategory.find(([c]) => c === "Train")?.[1];
    expect(trainClaim).toBe(3600 + 3300 + 1960 + 639.5 + 2359.5);
  });

  it("gives the spreadsheet a claimed column next to the amount", () => {
    const csv = reportCsv(rows);
    const header = csv.split("\r\n")[0];
    expect(header).toContain("Paid (Rs)");
    expect(header).toContain("Claimed (Rs)");
    const avadhLine = csv.split("\r\n").find((l) => l.includes("Avadh Assam"))!;
    expect(avadhLine).toContain("9095.40");
    expect(avadhLine).toContain("3600.00");
  });
});
