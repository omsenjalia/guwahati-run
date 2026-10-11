import { TEAM, type PersonId } from "@/data/trip";

/**
 * Shared expenses: who paid, who shares, who owes whom.
 * A repayment is stored as an expense with category "settlement",
 * paid by the person paying back and "split" to the person receiving.
 */

export type ExpenseCategory =
  | "train"
  | "metro"
  | "cab"
  | "food"
  | "accommodation"
  | "registration"
  | "other"
  | "settlement";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paid_by: PersonId;
  split_between: PersonId[];
  category: ExpenseCategory;
  spent_on: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

/** grant: counts towards the college reimbursement. */
export const CATEGORIES: { id: Exclude<ExpenseCategory, "settlement">; label: string; grant: boolean }[] = [
  { id: "train", label: "Train", grant: true },
  { id: "metro", label: "Metro", grant: true },
  { id: "cab", label: "Cab or auto", grant: true },
  { id: "food", label: "Food", grant: false },
  { id: "accommodation", label: "Accommodation", grant: false },
  { id: "registration", label: "Registration", grant: true },
  { id: "other", label: "Other", grant: false },
];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

const PEOPLE = TEAM.map((p) => p.id);

/** Net balance per person: positive = should get money back. */
export function balances(expenses: Expense[]) {
  const net = Object.fromEntries(PEOPLE.map((p) => [p, 0])) as Record<PersonId, number>;
  for (const e of expenses) {
    const among = e.split_between.length ? e.split_between : PEOPLE;
    const share = e.amount / among.length;
    net[e.paid_by] += e.amount;
    for (const p of among) net[p] -= share;
  }
  return net;
}

/** Fewest payments that settle everyone up (rounded to the rupee). */
export function settleUp(net: Record<PersonId, number>) {
  const owe = PEOPLE.filter((p) => net[p] < -0.5).map((p) => ({ p, amt: -net[p] })).sort((a, b) => b.amt - a.amt);
  const get = PEOPLE.filter((p) => net[p] > 0.5).map((p) => ({ p, amt: net[p] })).sort((a, b) => b.amt - a.amt);
  const moves: { from: PersonId; to: PersonId; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < owe.length && j < get.length) {
    const amt = Math.min(owe[i].amt, get[j].amt);
    if (amt >= 1) moves.push({ from: owe[i].p, to: get[j].p, amount: Math.round(amt) });
    owe[i].amt -= amt;
    get[j].amt -= amt;
    if (owe[i].amt < 0.5) i++;
    if (get[j].amt < 0.5) j++;
  }
  return moves;
}

/** Each person's share of real spending (repayments excluded), by category. */
export function spendingPerPerson(expenses: Expense[]) {
  const out = Object.fromEntries(PEOPLE.map((p) => [p, { total: 0, grantable: 0 }])) as Record<
    PersonId,
    { total: number; grantable: number }
  >;
  for (const e of expenses) {
    if (e.category === "settlement") continue;
    const among = e.split_between.length ? e.split_between : PEOPLE;
    const share = e.amount / among.length;
    const grant = CATEGORIES.find((c) => c.id === e.category)?.grant ?? false;
    for (const p of among) {
      out[p].total += share;
      if (grant) out[p].grantable += share;
    }
  }
  return out;
}
