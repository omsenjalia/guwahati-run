/**
 * Trip expenses, each usually with its bill (receipt) attached. Splitting and
 * settling up happen in Splitwise, not here: this is the record of what the
 * trip cost and the proof for the college report.
 */

export type ExpenseCategory = "train" | "metro" | "cab" | "food" | "accommodation" | "registration" | "other";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  spent_on: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * grant: counts towards the college reimbursement. Meals on the trip count as
 * part of the travel: we eat on the trains and away from home, and those bills
 * go into the claim with the fares. Stay doesn't, so a stay row still appears
 * in the report at what it cost, just not in the grant.
 */
export const CATEGORIES: { id: ExpenseCategory; label: string; grant: boolean }[] = [
  { id: "train", label: "Train", grant: true },
  { id: "metro", label: "Metro", grant: true },
  { id: "cab", label: "Cab or auto", grant: true },
  { id: "food", label: "Food", grant: true },
  { id: "accommodation", label: "Accommodation", grant: false },
  { id: "registration", label: "Registration", grant: true },
  { id: "other", label: "Other", grant: false },
];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
