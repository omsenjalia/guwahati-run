import { describe, expect, it } from "vitest";
import { GRANT, LEGS, TEAM, rebookingLoss } from "@/data/trip";
import type { DocRow } from "@/lib/documents";
import type { Expense, ExpenseCategory } from "@/lib/expenses";
import { grantEstimate } from "@/lib/grant";
import { claimDocuments } from "@/lib/grant-documents";
import { reportAmount, reportCsv, reportRows, reportTotals } from "@/lib/report-data";

/**
 * The report goes to the college and the SSIP policy pays the most economical
 * class, so a 3A ticket appears at its sleeper fare -- the system the report
 * always used, now carrying the 15910 Avadh Assam Express in place of the old
 * North East Express. Meals on the journey count with the fares. Everything the
 * policy doesn't cover (a cancellation charge, stay) still appears at what it
 * cost.
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

/** A bill as the Money tab stores it. */
const bill = (id: string, title: string, amount: number, category: ExpenseCategory, spentOn = "2026-10-30"): Expense => ({
  id,
  title,
  amount,
  category,
  spent_on: spentOn,
  note: null,
  created_by: "oms",
  created_at: `${spentOn}T20:00:00+05:30`,
});

describe("report shows the sleeper fare for every 3A leg", () => {
  it("lists one row per train leg, plus the cancellation charge", () => {
    const legs = LEGS.filter((l) => l.train && l.fareTotal);
    expect(rows.filter((r) => r.category === "Train").length).toBe(legs.length + legs.filter((l) => l.rebooking).length);
    // A cancellation charge is money already lost, never a fare: it stays at cost.
    const cancelRow = rows.find((r) => r.label.includes("cancellation"))!;
    expect(reportAmount(cancelRow)).toBe(rebookingLoss(LEGS.find((l) => l.rebooking)!));
  });

  it("shows the 15910 Avadh Assam at its sleeper rate, not the 3A fare", () => {
    const avadh = trainRow("L2");
    expect(avadh.label).toContain("15910 Avadh Assam Express");
    expect(avadh.amount).toBe(9095.4); // what we paid
    expect(reportAmount(avadh)).toBe(3600); // 900 x 4, what the college pays
    expect(avadh.description).toContain("claimed at the sleeper fare");
  });

  it("does the same for the other 3A legs, and leaves the sleeper legs alone", () => {
    expect(reportAmount(trainRow("L3"))).toBe(3300); // 825 x 4
    expect(reportAmount(trainRow("L4"))).toBe(1960); // 490 x 4, Garib Rath
    // Sleeper tickets: claim equals what we paid, so the row is simply the fare.
    for (const id of ["L0", "L1"]) {
      const row = trainRow(id);
      expect(row.eligible).toBe(row.amount);
      expect(reportAmount(row)).toBe(row.amount);
    }
  });

  it("never shows a 3A fare in full anywhere a claim exists", () => {
    for (const leg of LEGS.filter((l) => l.train && l.fareTotal && l.travelClass === "3A")) {
      expect(GRANT.sleeperFarePerPerson[leg.id], `${leg.id} has no sleeper rate`).toBeDefined();
      expect(reportAmount(trainRow(leg.id))).toBeLessThan(trainRow(leg.id).amount);
    }
  });

  it("keeps an uncovered expense at what it cost", () => {
    const stay = bill("e2", "Guest house in Guwahati", 1200, "accommodation");
    const row = reportRows([stay], docs).find((r) => r.label === stay.title)!;
    expect(row.eligible).toBe(0); // not reimbursable...
    expect(reportAmount(row)).toBe(1200); // ...but it was still spent
  });

  it("totals the amounts the table shows, and remembers the real spend", () => {
    const t = reportTotals(rows);
    expect(t.total).toBeCloseTo(639.5 + 2359.5 + 257.7 + 3600 + 3300 + 1960, 2); // 12,116.70
    expect(t.total).toBeCloseTo(12116.7, 2);
    const fares = LEGS.filter((l) => l.train && l.fareTotal).reduce((sum, l) => sum + l.fareTotal!, 0);
    expect(t.paid).toBeCloseTo(fares + rebookingLoss(LEGS.find((l) => l.rebooking)!), 2); // 24,824.70
    // Funding page: spend is real money out, eligible follows the policy.
    expect(t.perStudent).toBeCloseTo(t.paid / TEAM.length, 2);
    expect(t.eligiblePerStudent).toBeCloseTo((639.5 + 2359.5 + 3600 + 3300 + 1960) / TEAM.length, 2);
  });

  it("gives the spreadsheet one amount column, like the PDF", () => {
    const csv = reportCsv(rows);
    const header = csv.split("\r\n")[0].replace(/^\ufeff/, ""); // the UTF-8 BOM
    expect(header).toBe("Ref,Date,Category,Description,Amount (Rs)");
    const avadhLine = csv.split("\r\n").find((l) => l.includes("Avadh Assam"))!;
    expect(avadhLine).toContain("3600.00");
    expect(avadhLine).not.toContain("9095.40");
    expect(csv.split("\r\n").at(-1)).toBe(",,,Grand total,12116.70");
  });
});

/**
 * Meals on the journey are part of the travel claim, so the Grant tab shows
 * them like a fare: claimed in full, nothing struck through, and their bills on
 * the college's document list.
 */
describe("food counts in the grant", () => {
  const lunch = bill("e1", "Lunch, Ahmedabad to Delhi", 972.3, "food", "2026-10-28");
  const receipt = { id: "doc-lunch", kind: "receipt", expense_id: lunch.id } as unknown as DocRow;
  const rows = reportRows([lunch], [...docs, receipt]);
  const row = rows.find((r) => r.label === lunch.title)!;
  const line = grantEstimate(rows).lines.find((l) => l.label === lunch.title)!;

  it("claims the bill in full, so nothing is crossed out", () => {
    expect(row.eligible).toBe(972.3);
    expect(reportAmount(row)).toBe(972.3); // the table shows the bill, not a reduced figure
    expect(line.claim).toBeCloseTo(972.3 / TEAM.length, 2);
    expect(line.claim).toBe(line.paid); // equal: the Grant tab strikes a line only when the claim is lower
    expect(line.note).toBeUndefined(); // never "Not covered by the policy"
    expect(line.hasBill).toBe(true);
    expect(row.ref).toMatch(/^R-\d\d$/); // its bill gives it an appendix reference
  });

  it("adds the food bills to the claim checklist", () => {
    const food = claimDocuments([...docs, receipt], [lunch]).find((d) => d.id === "food")!;
    expect(food.label).toBe("Food bills");
    expect(food.have).toBe(true);
    expect(food.detail).toBe("1 of 1 with a bill");
  });
});
