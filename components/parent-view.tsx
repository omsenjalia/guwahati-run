"use client";

import { useEffect, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { PLACES, TEAM } from "@/data/trip";
import { LiveStamp, Panel, PanelTitle, Skeleton } from "@/components/bits";
import { useNow } from "@/lib/clock";
import type { LegLive, LiveState } from "@/lib/live-types";
import { ago, hhmm, stamp, weekdayDate } from "@/lib/time";
import { buildSteps, computeNow } from "@/lib/trip-engine";

type ParentData = {
  legs: Record<string, LegLive>;
  checkins: Record<string, { person: string; place: string | null; lat: number | null; lon: number | null; created_at: string }>;
  at: number;
};

const KEY = "gr-parent-state";

/**
 * Read-only view for parents and guardians: where we are, the next arrival
 * and the latest check-ins. No PNRs, berths or money. Refreshes every minute.
 */
export function ParentView() {
  const now = useNow();
  const [data, setData] = useState<ParentData | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setTimeout(() => alive && setData((d) => d ?? JSON.parse(saved)), 0);
    } catch {}
    const load = async () => {
      try {
        const res = await fetch("/api/parent/state", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as ParentData;
        if (!alive) return;
        setData(j);
        localStorage.setItem(KEY, JSON.stringify(j));
      } catch {}
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (now === null) return <Skeleton className="h-80" />;

  const live: LiveState = { legs: data?.legs ?? {}, state: {} };
  const steps = buildSteps(live);
  const { current, next, phase } = computeNow(steps, now);
  const shown = current ?? next;
  const nextArrival = steps.find((s) => !s.minor && s.kind === "train" && s.end > now);
  const arrivalLive = nextArrival?.leg ? data?.legs[nextArrival.leg.id] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Where the team is</h1>
      <p className="text-sm text-muted-foreground">Heet, Om Kumar, Om Senjalia and Sujal. Times are IST.</p>

      <Panel className="p-5">
        <p className="text-sm text-muted-foreground">
          {phase === "pre-trip" ? "Trip starts 28 Oct" : phase === "post-trip" ? "Trip finished" : current ? "Right now" : "Next"}
        </p>
        <p className="mt-1 text-xl font-semibold leading-snug">{shown?.title ?? "Home"}</p>
        {shown?.from && shown.to && (
          <p className="text-muted-foreground">
            {PLACES[shown.from].short} to {PLACES[shown.to].short}
          </p>
        )}
        {shown && phase !== "post-trip" && (
          <p className="mt-1 font-mono text-sm text-muted-foreground tabular">
            {stamp(shown.start)} to {stamp(shown.end)}
          </p>
        )}
      </Panel>

      {nextArrival?.to && (
        <Panel>
          <PanelTitle>Next arrival</PanelTitle>
          <p className="text-lg font-semibold">{PLACES[nextArrival.to].name}</p>
          <p className="font-mono text-muted-foreground tabular">
            {weekdayDate(nextArrival.end)}, {hhmm(nextArrival.end)}
          </p>
          {nextArrival.end - nextArrival.plannedEnd > 10 * 60000 && (
            <p className="mt-1 text-sm text-warn">Running late. Originally {stamp(nextArrival.plannedEnd)}.</p>
          )}
          {arrivalLive?.lastStation && arrivalLive.departed && !arrivalLive.terminated && (
            <p className="mt-1 text-sm text-muted-foreground">Train is near {arrivalLive.lastStation}.</p>
          )}
          <LiveStamp updatedAt={arrivalLive?.updatedAt} fallback="As scheduled" className="mt-2" />
        </Panel>
      )}

      <Panel>
        <PanelTitle>Latest check-ins</PanelTitle>
        <ul className="flex flex-col gap-3">
          {TEAM.map((p) => {
            const c = data?.checkins[p.id];
            return (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c ? `${c.place ?? "Checked in"}, ${ago(Date.parse(c.created_at), now)}` : "No check-in yet"}
                  </p>
                </div>
                {c?.lat != null && c.lon != null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Show where ${p.name} checked in`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary"
                  >
                    <MapPin className="size-5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
