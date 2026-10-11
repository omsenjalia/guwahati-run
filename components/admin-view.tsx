"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Panel, PanelTitle } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { ago, stamp } from "@/lib/time";
import { useNow } from "@/lib/clock";
import { browserDb } from "@/lib/supabase/browser";
import { ensureSession, refresh } from "@/lib/sync";
import { cn } from "@/lib/utils";

type Check = {
  group: string;
  label: string;
  ok: boolean;
  source?: string;
  ms: number;
  summary: string;
  error?: string;
};

/** Hidden admin screen: provider self-test now, job health panel later. */
export function AdminView() {
  const [result, setResult] = useState<{ ranAt: number; checks: Check[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/selftest", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const groups = result ? [...new Set(result.checks.map((c) => c.group))] : [];
  const passed = result?.checks.filter((c) => c.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">System</h1>
      <DataSourcesPanel />
      <JobsPanel />
      <Panel>
        <PanelTitle>Data source self-test</PanelTitle>
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          Calls every train-data source with our real PNRs and trains. Takes about 10 seconds.
        </p>
        <Button onClick={run} disabled={busy} size="lg" className="mt-4 w-full">
          <ArrowClockwise className={cn("size-5", busy && "animate-spin")} />
          {busy ? "Running" : result ? "Run again" : "Run self-test"}
        </Button>
        {error && <p className="mt-3 text-sm text-bad">Self-test failed to run: {error}</p>}
        {result && (
          <p className="mt-3 text-sm text-muted-foreground">
            {passed} of {result.checks.length} passed. Ran {stamp(result.ranAt)}.
          </p>
        )}
      </Panel>

      {groups.map((g) => (
        <Panel key={g}>
          <PanelTitle>{g}</PanelTitle>
          <ul className="flex flex-col gap-3">
            {result!.checks
              .filter((c) => c.group === g)
              .map((c) => (
                <li key={c.label} className="flex gap-2.5">
                  {c.ok ? (
                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-ok" weight="fill" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-bad" weight="fill" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{c.label}</p>
                    <p className="text-sm leading-snug text-muted-foreground">{c.ok ? c.summary : c.error}</p>
                    <p className="text-xs text-subtle">
                      {c.source ?? "no source"}, {c.ms} ms
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

type JobRun = { id: number; job: string; started_at: string; ok: boolean | null; message: string | null; source: string | null };

const JOBS = [
  { id: "pnr-sync", label: "North East PNR tracker" },
  { id: "live-status", label: "Live running status" },
  { id: "weather", label: "Weather" },
  { id: "watchers", label: "Connections, deadlines and alerts" },
  { id: "schedules", label: "Train timetables (meal planner)" },
  { id: "seed", label: "Trip data seed" },
];

async function fetchRuns(): Promise<{ runs?: JobRun[]; note?: string }> {
  if (!(await ensureSession())) return { note: "Can't reach the database. Is the SQL setup done?" };
  const { data, error } = await browserDb()
    .from("job_runs")
    .select("id, job, started_at, ok, message, source")
    .order("started_at", { ascending: false })
    .limit(60);
  return error ? { note: `Database: ${error.message}` } : { runs: data as JobRun[] };
}

type GithubHealth = { ok: boolean; checkedAt?: number; repo?: string; private?: boolean; lastUpload?: string | null; error?: string };

/**
 * Data sources health: when each outside source last worked, and the last
 * error if it's failing now. North East tracker and running status come
 * from the background job log; GitHub is checked live.
 */
function DataSourcesPanel() {
  const now = useNow();
  const [runs, setRuns] = useState<JobRun[] | null>(null);
  const [gh, setGh] = useState<GithubHealth | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRuns().then((r) => alive && r.runs && setRuns(r.runs));
    fetch("/api/admin/github", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setGh(j))
      .catch((e) => alive && setGh({ ok: false, error: (e as Error).message }));
    return () => {
      alive = false;
    };
  }, []);

  const source = (job: string, label: string, provider: string) => {
    const mine = runs?.filter((r) => r.job === job) ?? [];
    const lastOk = mine.find((r) => r.ok);
    const latest = mine[0];
    return { label, provider, lastOk: lastOk ? Date.parse(lastOk.started_at) : undefined, error: latest && !latest.ok ? latest.message : undefined, known: !!runs };
  };
  const rows = [
    source("pnr-sync", "North East tracker (PNR 2164635217)", "ConfirmTkt"),
    source("live-status", "Running status (delay, ETA, position)", "ConfirmTkt"),
    {
      label: "Receipts storage",
      provider: gh?.repo ? `GitHub ${gh.repo}${gh.private === false ? " (PUBLIC!)" : ""}` : "GitHub",
      lastOk: gh?.ok ? gh.checkedAt : undefined,
      error: gh && !gh.ok ? gh.error : undefined,
      known: !!gh,
      note: gh?.lastUpload && now ? `last upload ${ago(Date.parse(gh.lastUpload), now)}` : gh?.ok ? "no uploads yet" : undefined,
    },
  ];

  return (
    <Panel>
      <PanelTitle>Data sources health</PanelTitle>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex gap-2.5">
            {!r.known ? (
              <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-input" />
            ) : r.error ? (
              <XCircle className="mt-0.5 size-5 shrink-0 text-bad" weight="fill" />
            ) : r.lastOk ? (
              <CheckCircle className="mt-0.5 size-5 shrink-0 text-ok" weight="fill" />
            ) : (
              <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-input" />
            )}
            <div className="min-w-0">
              <p className="font-medium leading-snug">{r.label}</p>
              <p className="text-sm leading-snug text-muted-foreground">
                {r.provider}
                {r.lastOk && now ? `, last worked ${ago(r.lastOk, now)}` : r.known ? ", no success yet" : ""}
                {"note" in r && r.note ? `, ${r.note}` : ""}
              </p>
              {r.error && <p className="text-sm leading-snug break-words text-bad">{r.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** System health: latest run of each background job, plus a manual trigger. */
function JobsPanel() {
  const now = useNow();
  const [runs, setRuns] = useState<JobRun[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchRuns().then((r) => {
      if (!alive) return;
      if (r.runs) setRuns(r.runs);
      if (r.note) setNote(r.note);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  async function runNow() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/jobs/tick?force=pnr-sync,live-status,weather", { method: "POST" });
      const body = await res.json();
      setNote(body.ok ? "All jobs ran." : `Some jobs failed${body.error ? `: ${body.error}` : ""}.`);
      await refresh();
      setVersion((v) => v + 1);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>Background jobs</PanelTitle>
      <ul className="flex flex-col gap-3">
        {JOBS.map((j) => {
          const last = runs?.find((r) => r.job === j.id);
          return (
            <li key={j.id} className="flex gap-2.5">
              {!last ? (
                <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-input" />
              ) : last.ok ? (
                <CheckCircle className="mt-0.5 size-5 shrink-0 text-ok" weight="fill" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-bad" weight="fill" />
              )}
              <div className="min-w-0">
                <p className="font-medium leading-snug">{j.label}</p>
                <p className="text-sm leading-snug break-words text-muted-foreground">
                  {last ? last.message : runs ? "Not run yet" : "Loading"}
                </p>
                {last && now && (
                  <p className="text-xs text-subtle">
                    {ago(Date.parse(last.started_at), now)}
                    {last.source ? `, ${last.source}` : ""}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Button onClick={runNow} disabled={busy} variant="secondary" size="lg" className="mt-4 w-full">
        <ArrowClockwise className={cn("size-5", busy && "animate-spin")} />
        {busy ? "Running jobs" : "Run all jobs now"}
      </Button>
      {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
    </Panel>
  );
}
