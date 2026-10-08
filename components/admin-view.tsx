"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Panel, PanelTitle } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { stamp } from "@/lib/time";
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
