import { LEGS } from "@/data/trip";
import type { DocRow } from "@/lib/documents";
import type { Expense } from "@/lib/expenses";

/**
 * The college's document list for the SSIP claim, ticked automatically
 * from what's uploaded. (Items no upload can prove are a manual checklist,
 * GRANT.documents.)
 */
export type ClaimDoc = { id: string; label: string; have: boolean; detail: string };

export function claimDocuments(docs: DocRow[], expenses: Expense[]): ClaimDoc[] {
  const named = (re: RegExp) => docs.filter((d) => d.kind === "document" && re.test(d.title ?? ""));
  const trains = LEGS.filter((l) => l.train);
  const tickets = trains.filter((l) => docs.some((d) => d.kind === "ticket" && d.leg_id === l.id)).length;
  const reg = expenses.filter((e) => e.category === "registration");
  const regBills = docs.filter((d) => d.kind === "receipt" && reg.some((e) => e.id === d.expense_id)).length;
  const certs = docs.filter((d) => d.kind === "certificate").length;
  const local = expenses.filter((e) => e.category === "cab" || e.category === "metro");
  const localBills = local.filter((e) => docs.some((d) => d.expense_id === e.id)).length;

  const list: ClaimDoc[] = [
    { id: "invite", label: "Event invitation letter", have: named(/invitation/i).length > 0, detail: "Upload as a Document named \"Invitation letter\"" },
    { id: "form", label: "Approved application form", have: named(/application/i).length > 0, detail: "Upload as a Document named \"Application form\"" },
    { id: "tickets", label: "Travel tickets", have: tickets === trains.length, detail: `${tickets} of ${trains.length} e-tickets uploaded` },
    { id: "registration", label: "Registration fee receipt", have: regBills > 0, detail: regBills ? `${regBills} file${regBills > 1 ? "s" : ""} attached` : "Attach it to the registration fee in Money" },
    { id: "participation", label: "Proof of participation", have: certs > 0, detail: certs ? `${certs} certificate${certs > 1 ? "s" : ""}` : "Add the certificate after the event" },
  ];
  // Cab and metro bills only count once there are cab or metro expenses.
  if (local.length) {
    list.push({ id: "local", label: "Cab and metro bills", have: localBills === local.length, detail: `${localBills} of ${local.length} with a bill` });
  }
  return list;
}
