"use client";

import { useState } from "react";
import { Eye, FilePdf, FileXls, Lightbulb } from "@phosphor-icons/react";
import { toast } from "sonner";
import { defaultSummary, reportCsv, reportRows } from "@/lib/report-data";
import { GRANT } from "@/data/trip";
import { Panel, PanelTitle } from "@/components/bits";
import { ChecklistPanel } from "@/components/checklist-panel";
import { grantEstimate } from "@/lib/grant";
import { useExpenses } from "@/lib/use-expenses";
import { useDocuments } from "@/lib/receipts";
import { CATEGORIES } from "@/lib/expenses";
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

      <ReportPanel />

      <ChecklistPanel owner="grant" title="Documents for the claim" />

      <p className="px-1 pb-2 text-xs leading-relaxed text-subtle">{GRANT.policy}</p>
    </div>
  );
}

const SUMMARY_KEY = "gr-report-summary";

/**
 * The final report for the college: edit the summary paragraph, preview,
 * then download (which also saves a copy to documents/reports/ in GitHub).
 */
function ReportPanel() {
  const { items } = useExpenses();
  const { docs } = useDocuments();
  const [summary, setSummary] = useState(() => {
    try {
      return localStorage.getItem(SUMMARY_KEY) ?? defaultSummary();
    } catch {
      return defaultSummary();
    }
  });
  const [busy, setBusy] = useState<"" | "preview" | "download">("");
  const [error, setError] = useState("");

  function edit(v: string) {
    setSummary(v);
    try {
      localStorage.setItem(SUMMARY_KEY, v);
    } catch {}
  }

  async function make(mode: "preview" | "download") {
    setBusy(mode);
    setError("");
    // Open the tab now: phones block pop-ups that open after a wait.
    const tab = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, summary }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (tab) tab.location.href = body.url;
      else window.location.href = body.url;
      if (mode === "download") toast.success("Report ready. A copy is saved in GitHub (documents/reports).");
    } catch (e) {
      tab?.close();
      setError(navigator.onLine ? (e as Error).message : "Needs internet to build the report.");
    } finally {
      setBusy("");
    }
  }

  function csv() {
    if (!items) return;
    const blob = new Blob([reportCsv(reportRows(items, docs ?? []))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "WhyCode4U_Travel_Report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const rows = items ? reportRows(items, docs ?? []) : [];
  const withRef = rows.filter((r) => r.ref).length;

  return (
    <Panel id="report" className="scroll-mt-20">
      <PanelTitle>Final report for the college</PanelTitle>
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        Cover, trip summary, every expense with receipt numbers, requested vs spent, and every receipt attached. A4, prints well in black and white.
      </p>
      {items && (
        <p className="mt-2 text-sm">
          {rows.length} items, {withRef} with a receipt.{" "}
          {withRef < rows.length && <span className="text-warn">Add the missing bills in Money first.</span>}
        </p>
      )}
      <label htmlFor="report-summary" className="mt-4 block text-sm font-medium">
        Trip summary (page 2)
      </label>
      <textarea
        id="report-summary"
        value={summary}
        onChange={(e) => edit(e.target.value)}
        rows={6}
        className="mt-1.5 w-full rounded-lg border border-input bg-card p-3 text-[0.95rem] leading-relaxed outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      <button type="button" onClick={() => edit(defaultSummary())} className="mt-1 text-sm font-medium text-primary">
        Reset to the automatic text
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => make("preview")}
          disabled={!!busy}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary text-[0.95rem] font-medium active:scale-[0.98] disabled:opacity-60"
        >
          <Eye className="size-5" />
          {busy === "preview" ? "Building" : "Preview"}
        </button>
        <button
          type="button"
          onClick={() => make("download")}
          disabled={!!busy}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          <FilePdf className="size-5" />
          {busy === "download" ? "Building" : "Download"}
        </button>
      </div>
      <button
        type="button"
        onClick={csv}
        disabled={!items}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-muted-foreground active:bg-secondary disabled:opacity-50"
      >
        <FileXls className="size-5" />
        Expense table as Excel
      </button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </Panel>
  );
}

/** Claimable spending recorded so far (tickets plus Money), and how much has a bill. */
function RecordedPanel() {
  const { items } = useExpenses();
  const { docs } = useDocuments();
  if (!items) return null;
  const rows = reportRows(items, docs ?? []);
  const grantable = rows.filter((r) => r.category === "Train" || CATEGORIES.find((c) => c.label === r.category)?.grant);
  const claimable = grantable.reduce((t, r) => t + r.amount, 0);
  const withBill = grantable.filter((r) => r.docIds.length).length;
  return (
    <Panel>
      <PanelTitle>Recorded in Money so far</PanelTitle>
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Claimable spend, team" value={rupees(claimable)} />
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
