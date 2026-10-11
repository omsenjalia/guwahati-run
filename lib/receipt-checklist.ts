import { LEGS } from "@/data/trip";
import type { Expense } from "@/lib/expenses";
import type { DocRow } from "@/lib/documents";

/**
 * What the college report needs, and whether each is uploaded yet: the
 * invitation letter and HOD approval, every train ticket and the
 * registration fee. Cab or metro bills can still be added as receipts.
 */
export type Expected = { id: string; label: string; have: boolean; hint: string };

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
  const paper = (id: string, label: string, match: RegExp) => ({
    id,
    label,
    have: docs.some((d) => d.kind === "document" && match.test(d.title ?? "")),
    hint: `Add document, named "${label}"`,
  });
  return [paper("doc-invitation", "Invitation letter", /invitation/i), paper("doc-hod", "HOD approval", /hod|approval/i), ...tickets, registration];
}
