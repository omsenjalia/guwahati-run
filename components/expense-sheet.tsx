"use client";

import { useState } from "react";
import { Camera, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TEAM, type PersonId } from "@/data/trip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES, type ExpenseCategory } from "@/lib/expenses";
import { useMe } from "@/lib/me";
import { istDateKey } from "@/lib/time";
import { addExpense } from "@/lib/use-expenses";
import { cn } from "@/lib/utils";

const QUICK = [
  { title: "Cab", category: "travel" },
  { title: "Auto", category: "travel" },
  { title: "Metro", category: "travel" },
  { title: "Food", category: "food" },
  { title: "Water and snacks", category: "food" },
] as const;

const ALL = TEAM.map((p) => p.id);
const chip = (on: boolean) =>
  cn(
    "h-11 rounded-full border px-4 text-[0.95rem] font-medium transition active:scale-[0.98]",
    on ? "border-primary bg-accent text-accent-foreground" : "bg-secondary",
  );

/** Bottom sheet to add one expense (or a repayment when `settle` is given). */
export function ExpenseSheet({
  open,
  onOpenChange,
  settle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settle?: { from: PersonId; to: PersonId; amount: number };
}) {
  const me = useMe();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<PersonId | null>(null);
  const [split, setSplit] = useState<PersonId[]>(ALL);
  const [category, setCategory] = useState<Exclude<ExpenseCategory, "settlement">>("travel");
  const [date, setDate] = useState(() => istDateKey(Date.now()));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const payer = paidBy ?? me ?? "oms";
  const name = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

  function reset() {
    setTitle("");
    setAmount("");
    setPaidBy(null);
    setSplit(ALL);
    setCategory("travel");
    setDate(istDateKey(Date.now()));
    setReceipt(null);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = settle ? settle.amount : Number(amount.replace(/,/g, ""));
    if (!settle && (!title.trim() || !(value > 0))) {
      setError("Add what it was for and an amount.");
      return;
    }
    if (!settle && !split.length) {
      setError("Pick at least one person to split with.");
      return;
    }
    setBusy(true);
    try {
      await addExpense(
        settle
          ? {
              title: `${name(settle.from)} paid ${name(settle.to)} back`,
              amount: settle.amount,
              paid_by: settle.from,
              split_between: [settle.to],
              category: "settlement",
              spent_on: istDateKey(Date.now()),
              note: null,
              created_by: me,
            }
          : {
              title: title.trim(),
              amount: Math.round(value * 100) / 100,
              paid_by: payer,
              split_between: split,
              category,
              spent_on: date,
              note: null,
              created_by: me,
              receipt,
            },
      );
      toast.success(settle ? "Repayment recorded" : "Expense added");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle className="text-lg">{settle ? "Record repayment" : "Add expense"}</SheetTitle>
          <SheetDescription>
            {settle
              ? `${name(settle.from)} pays ${name(settle.to)} ₹${settle.amount.toLocaleString("en-IN")}. Record it once the money is sent.`
              : "Everyone sees it instantly. Split equally between the people you pick."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={save} className="flex flex-col gap-5 px-4">
          {!settle && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="exp-title" className="text-sm font-medium">
                  What for
                </label>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {QUICK.map((q) => (
                    <button
                      key={q.title}
                      type="button"
                      onClick={() => {
                        setTitle(q.title);
                        setCategory(q.category);
                      }}
                      className={cn(chip(title === q.title), "shrink-0")}
                    >
                      {q.title}
                    </button>
                  ))}
                </div>
                <input
                  id="exp-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cab Kamakhya to IIT"
                  className="h-12 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="exp-amount" className="text-sm font-medium">
                  Amount (₹)
                </label>
                <input
                  id="exp-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="0"
                  className="h-14 rounded-lg border border-input bg-card px-3 font-mono text-2xl tabular outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                />
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Paid by</legend>
                <div className="grid grid-cols-4 gap-2">
                  {TEAM.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPaidBy(p.id)} className={cn(chip(payer === p.id), "px-2")}>
                      {p.short}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">
                  Split between{" "}
                  <span className="font-normal text-muted-foreground">
                    {split.length > 0 && amount ? `(₹${Math.round(Number(amount.replace(/,/g, "")) / split.length || 0)} each)` : ""}
                  </span>
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {TEAM.map((p) => {
                    const on = split.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSplit((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                        className={cn(chip(on), "inline-flex items-center justify-center gap-1 px-2")}
                      >
                        {on && <Check className="size-4" weight="bold" />}
                        {p.short}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Type</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={chip(category === c.id)}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {CATEGORIES.find((c) => c.id === category)?.grant && (
                  <p className="text-xs text-ok">Counts for the college grant. Keep the bill.</p>
                )}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="exp-date" className="text-sm font-medium">
                    Date
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Bill photo</span>
                  <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-sm">
                    <Camera className="size-5" />
                    <span className="truncate">{receipt ? receipt.name : "Add photo"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="sr-only"
                      onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-bad">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="h-14 text-base">
            {busy ? "Saving" : settle ? "Mark as paid" : "Add expense"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
