import { LEGS, PLACES } from "@/data/trip";
import type { Expense } from "@/lib/expenses";
import type { DocRow } from "@/lib/documents";

/**
 * Bills the college report needs, and whether each is uploaded yet:
 * every train ticket, the registration fee, and a metro/cab bill for each
 * transfer on the day it happens.
 */
export type Expected = { id: string; label: string; have: boolean; hint: string };

const TRANSFERS = [
  { id: "L0b", day: "2026-10-28" },
  { id: "L1b", day: "2026-10-29" },
  { id: "L2b", day: "2026-10-30" },
  { id: "back", day: "2026-11-01", label: "IIT Guwahati to Kamakhya" },
  { id: "L3b", day: "2026-11-03" },
];

export function expectedReceipts(docs: DocRow[], expenses: Expense[]): Expected[] {
  const receiptFor = (pred: (e: Expense) => boolean) =>
    docs.some((d) => d.kind === "receipt" && expenses.some((e) => e.id === d.expense_id && pred(e)));

  const tickets = LEGS.filter((l) => l.train).map((l) => ({
    id: `ticket-${l.id}`,
    label: `Ticket: ${l.train!.number} ${l.train!.name}`,
    have: docs.some((d) => d.kind === "ticket" && d.leg_id === l.id),
    hint: "Add ticket (PDF from IRCTC)",
  }));
  const registration = {
    id: "registration",
    label: "Registration fee receipt",
    have: receiptFor((e) => e.category === "registration"),
    hint: "Attach the payment receipt to the registration expense",
  };
  const local = TRANSFERS.map((t) => {
    const leg = LEGS.find((l) => l.id === t.id);
    return {
      id: `local-${t.id}`,
      label: t.label ?? `${PLACES[leg!.from].short} to ${PLACES[leg!.to].short}`,
      have: receiptFor((e) => (e.category === "metro" || e.category === "cab") && e.spent_on === t.day),
      hint: `Metro ticket or cab bill dated ${t.day.slice(8)} ${t.day.slice(5, 7) === "10" ? "Oct" : "Nov"}`,
    };
  });
  return [...tickets, registration, ...local];
}
