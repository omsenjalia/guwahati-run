"use client";

import { useState } from "react";
import { Check, Lightbulb } from "@phosphor-icons/react";
import { GRANT } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { grantEstimate, type GrantScenario } from "@/lib/grant";
import { useMe } from "@/lib/me";
import { useChecklist } from "@/lib/use-checklist";
import { useExpenses } from "@/lib/use-expenses";
import { CATEGORIES, spendingPerPerson } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const SCENARIOS: { id: GrantScenario; label: string; hint: string }[] = [
  { id: "booked", label: "3A accepted", hint: "College reimburses the classes we booked." },
  { id: "economy", label: "Sleeper rate", hint: "College pays only the most economical class (policy wording)." },
];

export function GrantView() {
  const [scenario, setScenario] = useState<GrantScenario>("booked");
  const g = grantEstimate(scenario);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Grant</h1>

      <div role="tablist" aria-label="Fare rule" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={scenario === s.id}
            onClick={() => setScenario(s.id)}
            className={cn(
              "h-11 rounded-lg text-[0.95rem] font-medium transition",
              scenario === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="-mt-1 px-1 text-sm text-muted-foreground">{SCENARIOS.find((s) => s.id === scenario)!.hint}</p>

      <Panel className="p-5">
        <p className="text-sm text-muted-foreground">Expected grant per student</p>
        <p className="mt-1 font-mono text-[2.5rem] font-semibold leading-none tabular">{rupees(g.grantPerPerson)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {g.capped
            ? `Capped at the ${rupees(GRANT.capPerStudent)} limit. Eligible costs are ${rupees(g.eligiblePerPerson)}.`
            : `Under the ${rupees(GRANT.capPerStudent)} limit by ${rupees(GRANT.capPerStudent - g.eligiblePerPerson)}.`}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
          <Stat label="We spend" value={rupees(g.spentPerPerson)} />
          <Stat label="Grant" value={rupees(g.grantPerPerson)} tone="text-ok" />
          <Stat label="Own pocket" value={rupees(g.ownPerPerson)} tone={g.ownPerPerson > 0 ? "text-warn" : undefined} />
        </dl>
        <p className="mt-3 text-xs text-subtle">
          Team of 4: {rupees(g.team.grant)} grant out of {rupees(g.team.spent)} spent.
        </p>
      </Panel>

      <Panel>
        <PanelTitle>What we can claim, per person</PanelTitle>
        <ul className="flex flex-col gap-3">
          {g.lines.map((l) => {
            const reduced = l.claimPerPerson < l.paidPerPerson - 0.5;
            return (
              <li key={l.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.95rem] leading-snug">{l.label}</p>
                  {l.note && (reduced || l.kind !== "train" || !l.economyPerPerson) && (
                    <p className="text-xs leading-snug text-muted-foreground">{l.note}</p>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono tabular">
                  <p className="text-[0.95rem] font-semibold">{rupees(l.claimPerPerson)}</p>
                  {reduced && <p className="text-xs text-muted-foreground line-through">{rupees(l.paidPerPerson)}</p>}
                </div>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-sm text-muted-foreground">Eligible total</span>
            <span className="font-mono font-semibold tabular">{rupees(g.eligiblePerPerson)}</span>
          </li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Not covered: local travel under 25 km from BVM (getting to Anand station, the 01:42 pickup). Food and stay only
          with prior approval. Amounts for metro and cabs are estimates until we have the bills.
        </p>
      </Panel>

      <RecordedPanel />

      {g.capped && (
        <Panel className="border-primary/30">
          <PanelTitle aside={<Lightbulb className="size-5 text-primary" />}>Worth asking</PanelTitle>
          <p className="text-[0.95rem] leading-relaxed">
            Our costs exceed the {rupees(GRANT.capPerStudent)} cap. The policy lets the institution give more for larger events,
            case by case (up to {rupees(GRANT.maxPerEventCaseByCase)} per event). A national hackathon final at an IIT is a
            fair case: ask the SSIP coordinator, with this breakdown.
          </p>
        </Panel>
      )}

      <DocumentsPanel />

      <p className="px-1 pb-2 text-xs leading-relaxed text-subtle">{GRANT.policy}</p>
    </div>
  );
}

/** Real spending entered in Money that counts for the grant, per person. */
function RecordedPanel() {
  const me = useMe();
  const { items } = useExpenses();
  if (!items) return null;
  const spend = spendingPerPerson(items);
  const grantable = items.filter((e) => CATEGORIES.find((c) => c.id === e.category)?.grant);
  const withBill = grantable.filter((e) => e.receipt_path).length;
  const person = me ?? "oms";
  return (
    <Panel>
      <PanelTitle>Recorded in Money so far</PanelTitle>
      <dl className="grid grid-cols-2 gap-3">
        <Stat label={`${personName(person)}'s grant-eligible share`} value={rupees(spend[person].grantable)} />
        <Stat label="Bills attached" value={`${withBill} of ${grantable.length}`} tone={withBill < grantable.length ? "text-warn" : "text-ok"} />
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Tickets, registration and local travel count. Attach a bill photo to each so the claim has proof.
      </p>
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-mono text-[1.05rem] font-semibold tabular", tone)}>{value}</dd>
    </div>
  );
}

/** Shared checklist: ticking on one phone shows on all four. */
function DocumentsPanel() {
  const me = useMe();
  const { items, toggle } = useChecklist("grant");
  const done = items?.filter((i) => i.done).length ?? 0;
  return (
    <Panel>
      <PanelTitle aside={items && <span className="text-sm text-muted-foreground">{done}/{items.length}</span>}>
        Documents for the claim
      </PanelTitle>
      {!items ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item, me)}
                aria-pressed={item.done}
                className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1.5 text-left active:bg-secondary"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                    item.done ? "border-ok bg-ok text-background" : "border-input",
                  )}
                >
                  {item.done && <Check className="size-4" weight="bold" />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[0.95rem] leading-snug", item.done && "text-muted-foreground line-through")}>
                    {item.label}
                  </span>
                  {item.done && item.done_by && <span className="text-xs text-subtle">by {personName(item.done_by)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
