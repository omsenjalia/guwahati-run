"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, CircleDashed, CloudArrowUp, FilePdf, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { LEGS, TEAM, legCostPerPerson, rebookingLoss, type PersonId } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { ExpenseSheet, type SheetMode } from "@/components/expense-sheet";
import { Route } from "@/components/leg-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useNow } from "@/lib/clock";
import { balances, categoryLabel, settleUp, spendingPerPerson, type Expense } from "@/lib/expenses";
import { docFileUrl, type DocRow } from "@/lib/documents";
import { useMe } from "@/lib/me";
import { deleteDoc, discardUpload, processQueue, useDocuments, useUploadQueue } from "@/lib/receipts";
import { expectedReceipts } from "@/lib/receipt-checklist";
import { weekdayDate } from "@/lib/time";
import { deleteExpense, useExpenses } from "@/lib/use-expenses";
import { cn } from "@/lib/utils";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const rupees2 = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const name = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

export function MoneyView() {
  const mounted = useNow() !== null;
  const { items, error } = useExpenses();
  const { docs } = useDocuments();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [viewing, setViewing] = useState<DocRow | null>(null);

  if (!mounted) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
        <Button onClick={() => setSheet({ type: "add" })} className="rounded-full">
          <Plus className="size-5" weight="bold" />
          Add receipt
        </Button>
      </div>

      <QueueBadge />

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
          <BalancesPanel items={items} onSettle={(m) => setSheet({ type: "settle", ...m })} />
          <ExpenseList items={items} docs={docs ?? []} onEdit={(expense, doc) => setSheet({ type: "edit", expense, doc })} onView={setViewing} />
          <ChecklistPanel items={items} docs={docs} onAdd={(kind) => setSheet({ type: "add", kind })} />
          <DocumentsPanel docs={docs ?? []} onView={setViewing} />
        </>
      ) : null}

      <FaresPanel />

      <ExpenseSheet mode={sheet} onClose={() => setSheet(null)} />
      <Viewer doc={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/* ------------------------------------------------------------- queue */

function QueueBadge() {
  const queue = useUploadQueue();
  if (!queue.length) return null;
  const failed = queue.filter((q) => q.error);
  return (
    <Panel className={cn("py-3", failed.length ? "border-bad/40" : "border-warn/40")}>
      <div className="flex items-center gap-3">
        <CloudArrowUp className={cn("size-6 shrink-0", failed.length ? "text-bad" : "text-warn")} />
        <p className="min-w-0 flex-1 text-[0.95rem] font-medium">
          {queue.length} receipt{queue.length === 1 ? "" : "s"} waiting to upload
        </p>
        <button type="button" onClick={() => void processQueue()} className="h-10 rounded-lg bg-secondary px-3 text-sm font-medium">
          Retry
        </button>
      </div>
      {failed.map((q) => (
        <div key={q.meta.id} className="mt-2 flex items-start gap-2 text-sm">
          <p className="min-w-0 flex-1 text-bad">
            {q.meta.title}: {q.error}
          </p>
          <button type="button" aria-label={`Discard ${q.meta.title}`} onClick={() => void discardUpload(q.meta.id)} className="text-subtle">
            <X className="size-5" />
          </button>
        </div>
      ))}
      {!failed.length && <p className="mt-1 text-xs text-muted-foreground">Saved on this phone. They upload by themselves when there&apos;s signal.</p>}
    </Panel>
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
      <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground tabular">{rupees(total)} spent</span>}>Who owes whom</PanelTitle>
      {moves.length ? (
        <ul className="flex flex-col gap-2">
          {moves.map((m) => (
            <li key={`${m.from}-${m.to}`} className={cn("flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5", (m.from === me || m.to === me) && "ring-1 ring-primary/40")}>
              <p className="min-w-0 flex-1 text-[0.95rem]">
                <span className="font-semibold">{name(m.from)}</span>
                <ArrowRight className="mx-1.5 inline size-3.5 text-subtle" />
                <span className="font-semibold">{name(m.to)}</span>
                <span className="ml-2 font-mono font-semibold tabular">{rupees(m.amount)}</span>
              </p>
              <button type="button" onClick={() => onSettle(m)} className="h-10 shrink-0 rounded-lg bg-card px-3 text-sm font-medium active:scale-[0.98]">
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
                {net[p.id] > 0.5 ? "+" : net[p.id] < -0.5 ? "-" : ""}
                {rupees(Math.abs(net[p.id]))}
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

function ExpenseList({
  items,
  docs,
  onEdit,
  onView,
}: {
  items: Expense[];
  docs: DocRow[];
  onEdit: (e: Expense, doc?: DocRow) => void;
  onView: (d: DocRow) => void;
}) {
  if (!items.length) {
    return (
      <Panel className="border-dashed bg-transparent">
        <p className="text-[0.95rem] text-muted-foreground">No expenses yet. Tap Add receipt after paying for anything shared.</p>
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
              <ExpenseRow key={e.id} e={e} doc={docs.find((d) => d.expense_id === e.id)} onEdit={onEdit} onView={onView} />
            ))}
          </ul>
        </section>
      ))}
      <div className="h-3" />
    </Panel>
  );
}

function Thumb({ doc, onView }: { doc: DocRow; onView: (d: DocRow) => void }) {
  return (
    <button type="button" aria-label={`View bill for ${doc.title}`} onClick={() => onView(doc)} className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary active:scale-[0.97]">
      {doc.mime.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element -- private file streamed through our API, not optimisable
        <img src={docFileUrl(doc)} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <FilePdf className="m-auto size-6 text-primary" />
      )}
    </button>
  );
}

function ExpenseRow({ e, doc, onEdit, onView }: { e: Expense; doc?: DocRow; onEdit: (e: Expense, d?: DocRow) => void; onView: (d: DocRow) => void }) {
  const settlement = e.category === "settlement";
  const splitAll = e.split_between.length === TEAM.length;
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      {doc ? <Thumb doc={doc} onView={onView} /> : <span className="size-11 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.95rem]", settlement && "text-muted-foreground")}>{e.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {settlement ? "Repayment" : `${name(e.paid_by)} paid${splitAll ? "" : `, for ${e.split_between.map(name).join(", ")}`} · ${categoryLabel(e.category)}`}
          {e.note ? ` · ${e.note}` : ""}
        </p>
      </div>
      <span className={cn("font-mono text-[0.95rem] font-semibold tabular", settlement && "text-muted-foreground")}>{rupees(e.amount)}</span>
      {!settlement && (
        <button type="button" aria-label={`Edit ${e.title}`} onClick={() => onEdit(e, doc)} className="inline-flex size-10 items-center justify-center rounded-lg text-subtle active:bg-secondary">
          <PencilSimple className="size-5" />
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete ${e.title}`}
        onClick={async () => {
          const what = doc ? " and its bill (from GitHub too)" : "";
          if (!window.confirm(`Delete "${e.title}" (${rupees(e.amount)})${what} for everyone?`)) return;
          try {
            if (doc) await deleteDoc(doc.id);
            else await deleteExpense(e.id);
            toast.success("Deleted");
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
        className="-ml-2 inline-flex size-10 items-center justify-center rounded-lg text-subtle active:bg-secondary"
      >
        <Trash className="size-5" />
      </button>
    </li>
  );
}

/* --------------------------------------------------------- checklist */

function ChecklistPanel({ items, docs, onAdd }: { items: Expense[]; docs: DocRow[] | null; onAdd: (kind: "receipt" | "ticket") => void }) {
  if (!docs) return null;
  const list = expectedReceipts(docs, items);
  const missing = list.filter((x) => !x.have);
  return (
    <Panel>
      <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground tabular">{list.length - missing.length}/{list.length}</span>}>
        Receipts for the report
      </PanelTitle>
      {missing.length ? (
        <ul className="flex flex-col gap-2">
          {list.map((x) => (
            <li key={x.id} className="flex items-start gap-2.5">
              {x.have ? <CheckCircle className="mt-0.5 size-5 shrink-0 text-ok" weight="fill" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-warn" />}
              <div className="min-w-0 flex-1">
                <p className={cn("text-[0.95rem] leading-snug", x.have && "text-muted-foreground")}>{x.label}</p>
                {!x.have && <p className="text-xs text-muted-foreground">{x.hint}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.95rem] text-ok">Every expected receipt is in. The report is complete.</p>
      )}
      {missing.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onAdd("ticket")} className="h-11 rounded-lg bg-secondary text-sm font-medium">
            Add ticket
          </button>
          <button type="button" onClick={() => onAdd("receipt")} className="h-11 rounded-lg bg-secondary text-sm font-medium">
            Add receipt
          </button>
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------- documents */

function DocumentsPanel({ docs, onView }: { docs: DocRow[]; onView: (d: DocRow) => void }) {
  const files = docs.filter((d) => d.kind === "ticket" || d.kind === "certificate");
  if (!files.length) return null;
  return (
    <Panel>
      <PanelTitle>Tickets and certificates</PanelTitle>
      <ul className="flex flex-col gap-1">
        {files.map((d) => (
          <li key={d.id} className="flex items-center gap-3">
            <Thumb doc={d} onView={onView} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem]">{d.title}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{d.kind}</p>
            </div>
            <button
              type="button"
              aria-label={`Delete ${d.title}`}
              onClick={async () => {
                if (!window.confirm(`Delete "${d.title}" from GitHub for everyone?`)) return;
                try {
                  await deleteDoc(d.id);
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
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------- viewer */

function Viewer({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-auto p-3">
        <DialogTitle className="pr-8 text-base">{doc?.title}</DialogTitle>
        {doc &&
          (doc.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element -- private file streamed through our API
            <img src={docFileUrl(doc)} alt={doc.title ?? "Receipt"} className="w-full rounded-lg" />
          ) : (
            <a href={docFileUrl(doc)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground">
              <FilePdf className="size-5" />
              Open PDF
            </a>
          ))}
        {doc && <p className="font-mono text-xs break-all text-subtle">{doc.path}</p>}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- fares */

/** Rail cost per person each way, from the ticket data (incl. the Yoga cancellation loss). */
function FaresPanel() {
  const fareLegs = LEGS.filter((l) => l.train);
  const ways = [
    { name: "Gujarat to Guwahati", legs: fareLegs.filter((l) => ["L0", "L1", "L2"].includes(l.id)) },
    { name: "Guwahati to Gujarat", legs: fareLegs.filter((l) => ["L3", "L4"].includes(l.id)) },
  ];
  return (
    <Panel>
      <PanelTitle>Rail cost per person</PanelTitle>
      <div className="flex flex-col gap-4">
        {ways.map((w) => {
          const sum = w.legs.reduce((s, l) => s + legCostPerPerson(l.id), 0);
          return (
            <div key={w.name}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{w.name}</p>
                <span className="font-mono text-sm font-semibold tabular">{rupees2(sum)}</span>
              </div>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {w.legs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      <Route leg={l} />
                      {rebookingLoss(l) > 0 && <span className="block text-xs">incl. {rupees2(rebookingLoss(l) / 4)} cancellation loss</span>}
                      {!l.fareTotal && <span className="block text-xs">fare to add with the ticket</span>}
                    </span>
                    <span className="font-mono tabular">{rupees2(legCostPerPerson(l.id))}</span>
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
