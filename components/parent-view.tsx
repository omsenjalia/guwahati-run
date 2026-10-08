"use client";

import { PLACES } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { hhmm, stamp, weekdayDate } from "@/lib/time";
import { buildSteps, computeNow } from "@/lib/trip-engine";

/**
 * Read-only view for parents and guardians: where we are and the next arrival.
 * Deliberately shows no PNRs, berths or money.
 */
export function ParentView() {
  const now = useNow();
  const live = useLive();
  if (now === null) return <Skeleton className="h-80" />;
  const steps = buildSteps(live);
  const { current, next, phase } = computeNow(steps, now);
  const nextArrival = steps.find((s) => !s.minor && (s.kind === "train" || s.kind === "local-train") && s.end > now);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Where the team is</h1>
      <p className="text-sm text-muted-foreground">Heet, Om Kumar, Om Senjalia and Sujal. Times are IST.</p>

      <Panel className="p-5">
        <p className="text-sm text-muted-foreground">
          {phase === "pre-trip" ? "Trip has not started" : phase === "post-trip" ? "Trip finished" : "Right now"}
        </p>
        <p className="mt-1 text-xl font-semibold leading-snug">{current?.title ?? next?.title ?? "Home"}</p>
        {current?.from && current.to && (
          <p className="text-muted-foreground">
            {PLACES[current.from].short} to {PLACES[current.to].short}
          </p>
        )}
      </Panel>

      {nextArrival && (
        <Panel>
          <PanelTitle>Next arrival</PanelTitle>
          <p className="text-lg font-semibold">{nextArrival.to && PLACES[nextArrival.to].name}</p>
          <p className="font-mono text-muted-foreground tabular">
            {weekdayDate(nextArrival.end)}, {hhmm(nextArrival.end)}
          </p>
          {nextArrival.end - nextArrival.plannedEnd > 10 * 60000 && (
            <p className="mt-1 text-sm text-warn">Running late. Originally {stamp(nextArrival.plannedEnd)}.</p>
          )}
        </Panel>
      )}

      <Panel className="border-dashed bg-transparent">
        <PanelTitle>Latest check-in</PanelTitle>
        <p className="text-sm text-muted-foreground">Check-ins from the team will appear here.</p>
      </Panel>
    </div>
  );
}
