import { useState } from "react";
import { api } from "@/core/api";
import { refresh, useNow } from "@/core/data";
import { db, ensureDb } from "@/core/db";
import { useLoad } from "@/core/use-load";
import { ago, stamp } from "@/lib/time";
import { Button, Card, InfoRow, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

type JobRun = { id: number; job: string; started_at: string; ok: boolean | null; message: string | null; source: string | null };
type GithubHealth = { ok: boolean; checkedAt?: number; repo?: string; private?: boolean; lastUpload?: string | null; error?: string };
type Check = { group: string; label: string; ok: boolean; source?: string; ms: number; summary: string; error?: string };

const JOBS = [
  { id: "pnr-sync", label: "PNR tracker" },
  { id: "live-status", label: "Live running status" },
  { id: "weather", label: "Weather" },
  { id: "watchers", label: "Connections, deadlines and alerts" },
  { id: "schedules", label: "Train timetables (meal planner)" },
  { id: "watches", label: "Extra PNRs and waitlist routes" },
  { id: "seed", label: "Trip data seed" },
];

async function loadRuns() {
  await ensureDb();
  const { data, error } = await db.from("job_runs").select("id, job, started_at, ok, message, source").order("started_at", { ascending: false }).limit(80);
  if (error) throw new Error(error.message);
  return data as JobRun[];
}

/** Is everything working: outside data sources, each background job's last run, and a live self-test. */
export default function System() {
  const now = useNow();
  const runs = useLoad(loadRuns);
  const gh = useLoad(() => api<GithubHealth>("/api/admin/github"));
  const [busy, setBusy] = useState<"" | "jobs" | "test">("");
  const [note, setNote] = useState("");
  const [test, setTest] = useState<{ ranAt: number; checks: Check[] } | null>(null);

  const lastOk = (job: string) => runs.data?.find((r) => r.job === job && r.ok);
  const latest = (job: string) => runs.data?.find((r) => r.job === job);

  async function runJobs() {
    setBusy("jobs");
    setNote("");
    try {
      const r = await api<{ ok: boolean; error?: string }>("/api/jobs/tick?force=pnr-sync,live-status,weather", { method: "POST" });
      setNote(r.ok ? "All jobs ran." : `Some jobs failed${r.error ? `: ${r.error}` : ""}.`);
      await Promise.all([runs.reload(), refresh()]);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function selfTest() {
    setBusy("test");
    try {
      setTest(await api("/api/admin/selftest"));
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const sources = [
    { job: "pnr-sync", label: "PNR tracker", provider: "ConfirmTkt" },
    { job: "live-status", label: "Running status (delay, ETA, position)", provider: "ConfirmTkt" },
  ];

  return (
    <Page title="System status">
      <Section title="Data sources">
        <Card style={{ gap: 14 }}>
          {sources.map((s) => {
            const ok = lastOk(s.job);
            const last = latest(s.job);
            return (
              <InfoRow
                key={s.job}
                icon={last && !last.ok ? "close-circle" : ok ? "check-circle" : "circle-outline"}
                tone={last && !last.ok ? "bad" : ok ? "good" : "neutral"}
                label={s.label}
                value={
                  <T v="caption" color={last && !last.ok ? "bad" : "muted"}>
                    {s.provider}
                    {ok ? `, last worked ${ago(Date.parse(ok.started_at), now)}` : runs.data ? ", no success yet" : ""}
                    {last && !last.ok ? `\n${last.message}` : ""}
                  </T>
                }
              />
            );
          })}
          <InfoRow
            icon={gh.data?.ok ? "check-circle" : gh.data || gh.error ? "close-circle" : "circle-outline"}
            tone={gh.data?.ok ? "good" : gh.data || gh.error ? "bad" : "neutral"}
            label="Receipts storage"
            value={
              <T v="caption" color={gh.data?.ok ? "muted" : "bad"}>
                {gh.data?.ok
                  ? `GitHub ${gh.data.repo}${gh.data.private === false ? " (PUBLIC!)" : ""}, ${gh.data.lastUpload ? `last upload ${ago(Date.parse(gh.data.lastUpload), now)}` : "no uploads yet"}`
                  : (gh.data?.error ?? gh.error) || "Checking"}
              </T>
            }
          />
        </Card>
      </Section>

      <Section title="Background jobs">
        <Card style={{ gap: 14 }}>
          {!!runs.error && (
            <T v="caption" color="bad">
              {runs.error}
            </T>
          )}
          {JOBS.map((j) => {
            const last = latest(j.id);
            return (
              <InfoRow
                key={j.id}
                icon={!last ? "circle-outline" : last.ok ? "check-circle" : "close-circle"}
                tone={!last ? "neutral" : last.ok ? "good" : "bad"}
                label={last ? `${j.label} · ${ago(Date.parse(last.started_at), now)}${last.source ? `, ${last.source}` : ""}` : j.label}
                value={
                  <T v="caption" color="muted">
                    {last?.message ?? (runs.data ? "Not run yet" : "Loading")}
                  </T>
                }
              />
            );
          })}
          <Button label="Run PNR, live status and weather now" icon="refresh" kind="secondary" loading={busy === "jobs"} disabled={!!busy} onPress={() => void runJobs()} />
          {!!note && (
            <T v="caption" color="muted">
              {note}
            </T>
          )}
        </Card>
      </Section>

      <Section title="Data source self-test">
        <Card style={{ gap: 12 }}>
          <T v="body" color="muted">
            Calls every train-data source with our real PNRs and trains. Takes about 10 seconds.
          </T>
          <Button label={test ? "Run again" : "Run self-test"} icon="stethoscope" loading={busy === "test"} disabled={!!busy} onPress={() => void selfTest()} />
          {test && (
            <T v="label">
              {test.checks.filter((x) => x.ok).length} of {test.checks.length} passed. Ran {stamp(test.ranAt)}.
            </T>
          )}
          {test?.checks.map((x) => (
            <InfoRow
              key={x.group + x.label}
              icon={x.ok ? "check-circle" : "close-circle"}
              tone={x.ok ? "good" : "bad"}
              label={`${x.group}: ${x.label}`}
              value={
                <T v="caption" color="muted">
                  {x.ok ? x.summary : x.error}
                  {`\n${x.source ?? "no source"}, ${x.ms} ms`}
                </T>
              }
            />
          ))}
        </Card>
      </Section>
    </Page>
  );
}
