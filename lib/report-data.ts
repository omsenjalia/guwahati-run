import { GRANT, LEGS, PLACES, REPORT, TEAM, rebookingLoss, type PersonId } from "@/data/trip";
import { CATEGORIES, categoryLabel, type Expense } from "@/lib/expenses";
import type { DocRow } from "@/lib/documents";
import { dayMonth, hhmm } from "@/lib/time";

/**
 * Everything the final report (PDF and Excel) shows, built from the ticket
 * data, the Money tab and the uploaded documents. Pure: no network.
 *
 * Rows: one per train ticket (from data/trip.ts), the Yoga cancellation
 * charge, then every expense from the Money tab. Ticket purchases already
 * entered as lump sums at setup are represented by the per-ticket rows.
 * Each row with an uploaded bill gets a reference R-01, R-02... in date order.
 */

const PEOPLE = TEAM.map((p) => p.id);
const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

export type ReportRow = {
  ref?: string;
  date: string;
  category: string;
  description: string;
  paidBy: string;
  amount: number;
  /** Each person's share. */
  shares: Record<PersonId, number>;
  /** What the SSIP policy reimburses for this row, for all 4 (sleeper rate for 3A). */
  eligible: number;
  /** Bills proving this row (e.g. a fee receipt and its payment screenshot). */
  docIds: string[];
};

const even = (amount: number, among: PersonId[] = PEOPLE) =>
  Object.fromEntries(PEOPLE.map((p) => [p, among.includes(p) ? amount / among.length : 0])) as Record<PersonId, number>;

export function reportRows(expenses: Expense[], docs: DocRow[]): ReportRow[] {
  const rows: ReportRow[] = [];

  for (const leg of LEGS.filter((l) => l.train && l.fareTotal)) {
    const item = GRANT.items.find((i) => i.leg === leg.id);
    const tickets = docs.filter((d) => d.kind === "ticket" && d.leg_id === leg.id);
    rows.push({
      date: leg.depart.slice(0, 10),
      category: "Train",
      description: `${leg.train!.number} ${leg.train!.name}, ${PLACES[leg.from].short} to ${PLACES[leg.to].short}, ${leg.travelClass}${leg.pnr ? `, PNR ${leg.pnr}` : ""}`,
      paidBy: short(leg.paidBy ?? "oms"),
      amount: leg.fareTotal!,
      shares: even(leg.fareTotal!),
      eligible: item?.economyPerPerson !== undefined ? item.economyPerPerson * 4 : leg.fareTotal!,
      docIds: tickets.map((d) => d.id),
    });
    if (leg.rebooking) {
      const loss = rebookingLoss(leg);
      rows.push({
        date: leg.rebooking.cancelledOn,
        category: "Train",
        description: `${leg.train!.name} rebooking: cancellation charge (paid Rs. ${leg.rebooking.oldPaid.toFixed(2)}, refunded Rs. ${leg.rebooking.refunded.toFixed(2)})`,
        paidBy: short(leg.rebooking.paidBy),
        amount: loss,
        shares: even(loss),
        eligible: loss,
        docIds: [],
      });
    }
  }

  for (const e of expenses) {
    if (e.category === "settlement") continue;
    if (e.created_by === "setup" && e.category === "train") continue; // shown per ticket above
    const bills = docs.filter((d) => d.kind === "receipt" && d.expense_id === e.id);
    const grant = CATEGORIES.find((c) => c.id === e.category)?.grant ?? false;
    rows.push({
      date: e.spent_on,
      category: categoryLabel(e.category),
      description: e.note ? `${e.title} (${e.note})` : e.title,
      paidBy: short(e.paid_by),
      amount: e.amount,
      shares: even(e.amount, e.split_between.length ? e.split_between : PEOPLE),
      eligible: grant ? e.amount : 0,
      docIds: bills.map((d) => d.id),
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  let n = 0;
  for (const r of rows) if (r.docIds.length) r.ref = `R-${String(++n).padStart(2, "0")}`;
  return rows;
}

export function reportTotals(rows: ReportRow[]) {
  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
  const perPerson = Object.fromEntries(PEOPLE.map((p) => [p, rows.reduce((t, r) => t + r.shares[p], 0)])) as Record<PersonId, number>;
  const eligiblePerPerson = rows.reduce((t, r) => t + r.eligible, 0) / PEOPLE.length;
  const total = rows.reduce((t, r) => t + r.amount, 0);
  const requested = REPORT.requestedPerStudent * PEOPLE.length;
  return { byCategory: [...byCategory.entries()], perPerson, total, eligiblePerPerson, requested };
}

/** Auto-filled trip summary paragraph (editable in the Grant tab before export). */
export function defaultSummary() {
  const trains = LEGS.filter((l) => l.train);
  const km = trains.reduce((t, l) => t + (l.km ?? 0), 0);
  const names = TEAM.map((p) => p.name);
  return (
    `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} travelled from Anand to IIT Guwahati to take part in the ` +
    `finals of the WhyCode4U Hackathon (${REPORT.eventDates}). The team travelled by train via Ahmedabad and Delhi, ` +
    `about ${km.toLocaleString("en-IN")} km over ${trains.length} trains, from ${REPORT.travelDates}, in the most economical ` +
    `classes available. This report lists every travel expense with its receipt, attached in the appendix.`
  );
}

/** Route and legs for page 2. */
export function legTimeline() {
  return LEGS.map((l) => ({
    date: dayMonth(l.depart),
    what: l.train ? `${l.train.number} ${l.train.name}` : l.modeHint ?? "Transfer",
    route: `${PLACES[l.from].short} to ${PLACES[l.to].short}`,
    time: `${hhmm(l.depart)}-${hhmm(l.arrive)}`,
    cls: l.travelClass ?? "",
    pnr: l.pnr ?? "",
  }));
}

/* ---------------------------------------------------------------- csv */

const csvCell = (v: string | number) => {
  const s = typeof v === "number" ? v.toFixed(2) : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The expense table as a spreadsheet (opens in Excel). */
export function reportCsv(rows: ReportRow[]) {
  const t = reportTotals(rows);
  const lines: (string | number)[][] = [
    ["Ref", "Date", "Category", "Description", "Paid by", "Amount (Rs)", ...TEAM.map((p) => `${p.short} share`)],
    ...rows.map((r) => [r.ref ?? "", r.date, r.category, r.description, r.paidBy, r.amount, ...PEOPLE.map((p) => r.shares[p])]),
    [],
    ...t.byCategory.map(([c, v]) => ["", "", c, "Subtotal", "", v]),
    ["", "", "", "Grand total", "", t.total, ...PEOPLE.map((p) => t.perPerson[p])],
  ];
  // Byte-order mark so Excel opens the file as UTF-8.
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}
