"use client";

import { FilePdf, FileXls, Lightbulb } from "@phosphor-icons/react";
import { buildClaims, claimCsv } from "@/lib/claim";
import { GRANT } from "@/data/trip";
import { Panel, PanelTitle } from "@/components/bits";
import { ChecklistPanel } from "@/components/checklist-panel";
import { personName } from "@/components/leg-bits";
import { grantEstimate } from "@/lib/grant";
import { useMe } from "@/lib/me";
import { useExpenses } from "@/lib/use-expenses";
import { CATEGORIES, spendingPerPerson } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function GrantView() {
  const g = grantEstimate();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Grant</h1>

      <p className="-mt-1 px-1 text-sm text-muted-foreground">
        Train fares count at sleeper class, the most economical, as the policy says.
      </p>

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
          Not covered: local travel under 25 km from BVM (getting to Anand station, the ride home at 2 am). Food and stay only
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

      <ExportPanel />

      <ChecklistPanel owner="grant" title="Documents for the claim" />

      <p className="px-1 pb-2 text-xs leading-relaxed text-subtle">{GRANT.policy}</p>
    </div>
  );
}

/** Claim report (print/PDF) and spreadsheet for the SSIP committee. */
function ExportPanel() {
  const { items } = useExpenses();
  function download() {
    if (!items) return;
    const blob = new Blob([claimCsv(buildClaims(items))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "guwahati-run-grant-claim.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <Panel>
      <PanelTitle>Claim for the college</PanelTitle>
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        Every ticket and bill per student, train fares at sleeper rate, with the limit applied. Built from tickets and the Money tab.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href="/claim" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98]">
          <FilePdf className="size-5" />
          PDF report
        </a>
        <button
          type="button"
          onClick={download}
          disabled={!items}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary text-[0.95rem] font-medium active:scale-[0.98] disabled:opacity-50"
        >
          <FileXls className="size-5" />
          Excel file
        </button>
      </div>
    </Panel>
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
        <Stat label={`${personName(person)} spent on claimable items`} value={rupees(spend[person].grantable)} />
        <Stat label="Bills attached" value={`${withBill} of ${grantable.length}`} tone={withBill < grantable.length ? "text-warn" : "text-ok"} />
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Actual spend at the prices paid; the grant above uses sleeper fares. Attach a bill photo to each item so the claim has proof.
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
