"use client";

import { useState } from "react";
import { ArrowRight, Plus, Receipt, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { LEGS, TEAM, TRIP, type PersonId } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { ExpenseSheet } from "@/components/expense-sheet";
import { Route } from "@/components/leg-bits";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/clock";
import { CATEGORIES, balances, settleUp, spendingPerPerson, type Expense } from "@/lib/expenses";
import { useMe } from "@/lib/me";
import { weekdayDate } from "@/lib/time";
import { farePerPerson } from "@/lib/trip-engine";
import { deleteExpense, receiptUrl, useExpenses } from "@/lib/use-expenses";
import { cn } from "@/lib/utils";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const name = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;
const OUTBOUND = ["L0", "L1", "L2"];

export function MoneyView() {
  const mounted = useNow() !== null;
  const { items, error } = useExpenses();
  const [adding, setAdding] = useState(false);
  const [settle, setSettle] = useState<{ from: PersonId; to: PersonId; amount: number } | undefined>();

  if (!mounted) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
        <Button onClick={() => setAdding(true)} className="rounded-full">
          <Plus className="size-5" weight="bold" />
          Add expense
        </Button>
      </div>

      {error && (
        <Panel className="border-bad/40 bg-bad-soft">
          <p className="text-sm">
            Expenses aren&apos;t set up yet. Run <span className="font-mono">supabase/002_expenses.sql</span> in Supabase.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </Panel>
      )}

      {!items && !error ? (
        <Skeleton className="h-48" />
      ) : items ? (
        <>
          <BalancesPanel items={items} onSettle={setSettle} />
          <ExpenseList items={items} />
        </>
      ) : null}

      <FaresPanel />

      <ExpenseSheet open={adding} onOpenChange={setAdding} />
      <ExpenseSheet open={!!settle} onOpenChange={(v) => !v && setSettle(undefined)} settle={settle} />
    </div>
  );
}

/* ------------------------------------------------------------ balances */

function BalancesPanel({ items, onSettle }: { items: Expense[]; onSettle: (s: { from: PersonId; to: PersonId; amount: number }) => void }) {
  const me = useMe();
  const net = balances(items);
  const moves = settleUp(net);
  const spend = spendingPerPerson(items);
  const paid = Object.fromEntries(TEAM.map((p) => [p.id, items.filter((e) => e.paid_by === p.id && e.category !== "settlement").reduce((s, e) => s + e.amount, 0)]));
  const total = items.filter((e) => e.category !== "settlement").reduce((s, e) => s + e.amount, 0);

  return (
    <Panel>
      <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground tabular">{rupees(total)} spent</span>}>
        Who owes whom
      </PanelTitle>
      {moves.length ? (
        <ul className="flex flex-col gap-2">
          {moves.map((m) => (
            <li
              key={`${m.from}-${m.to}`}
              className={cn("flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5", (m.from === me || m.to === me) && "ring-1 ring-primary/40")}
            >
              <p className="min-w-0 flex-1 text-[0.95rem]">
                <span className="font-semibold">{name(m.from)}</span>
                <ArrowRight className="mx-1.5 inline size-3.5 text-subtle" />
                <span className="font-semibold">{name(m.to)}</span>
                <span className="ml-2 font-mono font-semibold tabular">{rupees(m.amount)}</span>
              </p>
              <button
                type="button"
                onClick={() => onSettle(m)}
                className="h-10 shrink-0 rounded-lg bg-card px-3 text-sm font-medium active:scale-[0.98]"
              >
                Mark paid
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.95rem] text-ok">Everyone is settled up.</p>
      )}

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-1 font-medium">Person</th>
            <th className="pb-1 text-right font-medium">Paid</th>
            <th className="pb-1 text-right font-medium">Share</th>
            <th className="pb-1 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular">
          {TEAM.map((p) => (
            <tr key={p.id} className={cn(p.id === me && "font-semibold")}>
              <td className="py-1.5 font-sans">{p.short}</td>
              <td className="py-1.5 text-right">{rupees(paid[p.id])}</td>
              <td className="py-1.5 text-right">{rupees(spend[p.id].total)}</td>
              <td className={cn("py-1.5 text-right", net[p.id] > 0.5 ? "text-ok" : net[p.id] < -0.5 ? "text-warn" : "")}>
                {net[p.id] > 0.5 ? "+" : ""}
                {rupees(net[p.id])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-subtle">Balance: plus means you get money back, minus means you owe.</p>
    </Panel>
  );
}

/* -------------------------------------------------------------- list */

function ExpenseList({ items }: { items: Expense[] }) {
  if (!items.length) {
    return (
      <Panel className="border-dashed bg-transparent">
        <p className="text-[0.95rem] text-muted-foreground">No expenses yet. Tap Add expense after paying for anything shared.</p>
      </Panel>
    );
  }
  const days = new Map<string, Expense[]>();
  for (const e of items) days.set(e.spent_on, [...(days.get(e.spent_on) ?? []), e]);

  return (
    <Panel className="p-0">
      <h2 className="px-4 pt-4 text-[0.95rem] font-semibold">Expenses</h2>
      {[...days.entries()].map(([day, list]) => (
        <section key={day} className="mt-2">
          <h3 className="px-4 py-1 text-xs font-medium text-muted-foreground">{weekdayDate(`${day}T12:00:00+05:30`)}</h3>
          <ul>
            {list.map((e) => (
              <ExpenseRow key={e.id} e={e} />
            ))}
          </ul>
        </section>
      ))}
      <div className="h-3" />
    </Panel>
  );
}

function ExpenseRow({ e }: { e: Expense }) {
  const settlement = e.category === "settlement";
  const cat = CATEGORIES.find((c) => c.id === e.category);
  const splitAll = e.split_between.length === TEAM.length;
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.95rem]", settlement && "text-muted-foreground")}>{e.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {settlement ? "Repayment" : `${name(e.paid_by)} paid${splitAll ? "" : `, for ${e.split_between.map(name).join(", ")}`}`}
          {cat && !settlement ? ` · ${cat.label}` : ""}
        </p>
      </div>
      <span className={cn("font-mono text-[0.95rem] font-semibold tabular", settlement && "text-muted-foreground")}>{rupees(e.amount)}</span>
      {e.receipt_path && (
        <button
          type="button"
          aria-label="Open bill photo"
          onClick={async () => {
            const url = await receiptUrl(e.receipt_path!);
            if (url) window.open(url, "_blank", "noopener");
            else toast.error("Couldn't open the bill photo.");
          }}
          className="inline-flex size-10 items-center justify-center rounded-lg text-primary active:bg-secondary"
        >
          <Receipt className="size-5" />
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete ${e.title}`}
        onClick={async () => {
          if (!window.confirm(`Delete "${e.title}" (${rupees(e.amount)}) for everyone?`)) return;
          try {
            await deleteExpense(e.id);
            toast.success("Deleted");
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
        className="inline-flex size-10 items-center justify-center rounded-lg text-subtle active:bg-secondary"
      >
        <Trash className="size-5" />
      </button>
    </li>
  );
}

/* --------------------------------------------------------------- fares */

function FaresPanel() {
  const fareLegs = LEGS.filter((l) => l.fareTotal);
  const ways = [
    { name: "Gujarat to Guwahati", legs: fareLegs.filter((l) => OUTBOUND.includes(l.id)) },
    { name: "Guwahati to Gujarat", legs: fareLegs.filter((l) => !OUTBOUND.includes(l.id)) },
  ];
  return (
    <Panel>
      <PanelTitle>Train fares vs {rupees(TRIP.perPersonEachWayTarget)} target</PanelTitle>
      <div className="flex flex-col gap-4">
        {ways.map((w) => {
          const sum = w.legs.reduce((s, l) => s + farePerPerson(l), 0);
          const over = sum - TRIP.perPersonEachWayTarget;
          return (
            <div key={w.name}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{w.name}</p>
                <span className={cn("text-sm font-semibold", over > 0 ? "text-warn" : "text-ok")}>
                  {rupees(sum)} each, {over > 0 ? `${rupees(over)} over` : `${rupees(-over)} under`}
                </span>
              </div>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {w.legs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <Route leg={l} />
                    <span className="font-mono tabular">{rupees(farePerPerson(l))}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
