"use client";

import { useEffect, useState } from "react";
import { AirplaneTilt, ArrowClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { DEADLINES, IRCTC_BOOK_URL, LEGS, NE_ALTERNATIVES, TATKAL_BOOKER } from "@/data/trip";
import { Panel, PanelTitle, StatusPill } from "@/components/bits";
import { Countdown, personName } from "@/components/leg-bits";
import { evaluate } from "@/lib/deadline-rules";
import type { LiveState } from "@/lib/live-types";
import { HOUR, hhmm, ms, stamp } from "@/lib/time";
import { chartTime, legSituation } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";
import type { Alternative } from "@/app/api/alternatives/route";

const NE = LEGS.find((l) => l.tracked)!;
const TATKAL = DEADLINES.find((d) => d.id === "ne-tatkal")!;

/**
 * Plan B for the one waitlisted ticket (12506 North East Express).
 * Shown only while all 4 of us are still waitlisted:
 *   before 28 Oct 10:00  the Tatkal decision, with today's verdict
 *   after the chart      live alternatives from Delhi on 29 Oct, plus flights
 */
export function NePlanB({ live, now, compact }: { live: LiveState; now: number; compact?: boolean }) {
  const sit = legSituation(NE, live);
  if (sit.kind !== "waitlisted" || now > ms(NE.depart)) return null;
  const charted = live.legs[NE.id]?.chartPrepared ?? false;
  const tatkalAt = ms(TATKAL.at);
  const verdict = evaluate(TATKAL, live, now);
  const tatkalOpen = now < tatkalAt + 2 * HOUR;

  return (
    <Panel className={cn(charted ? "border-bad/50 bg-bad-soft" : "border-warn/40")}>
      <PanelTitle aside={<StatusPill health={charted ? "red" : "amber"}>{charted ? "Act now" : "Plan B ready"}</StatusPill>}>
        Plan B: 12506 North East
      </PanelTitle>

      {!charted && tatkalOpen && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">Tatkal decision, {stamp(tatkalAt)}</p>
            <Countdown to={tatkalAt} now={now} className="text-sm" />
          </div>
          <p className="rounded-lg bg-secondary px-3 py-2.5 text-[0.95rem] leading-snug">{verdict.message}</p>
          {!compact && (
            <p className="text-sm leading-snug text-muted-foreground">
              Rule: if the chance is under about 70% or GNWL is still above about 15-20 that morning, book AC Tatkal for all 4.
              We&apos;ll be in Ahmedabad (Yoga leaves 11:25), so book from there.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Tatkal booker: <span className="font-medium text-foreground">{personName(TATKAL_BOOKER)}</span>
            </p>
            <a
              href={IRCTC_BOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98]"
            >
              Open IRCTC
              <ArrowSquareOut className="size-4" />
            </a>
          </div>
        </div>
      )}

      {charted ? (
        <>
          <p className="text-[0.95rem] leading-snug">
            All 4 still waitlisted after the chart. The ticket cancels and refunds itself. Use the Tatkal ticket if we booked one;
            otherwise pick one of these for today:
          </p>
          <Alternatives />
        </>
      ) : (
        (!compact || !tatkalOpen) && (
          <p className={cn("text-sm leading-snug text-muted-foreground", tatkalOpen && "mt-3 border-t pt-3")}>
            Chart around {stamp(chartTime(NE.depart))}. If even 1 of us gets RAC or a berth, all 4 can board on this PNR. If all
            4 are still waitlisted, this card switches to live alternatives from Delhi.
          </p>
        )
      )}
    </Panel>
  );
}

type AltResponse = { fetchedAt: number; trains: Alternative[] };

/** Other Delhi to Guwahati trains on 29 Oct, fetched live, plus flights as a last resort. */
async function fetchAlternatives(): Promise<AltResponse> {
  const res = await fetch("/api/alternatives", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function Alternatives() {
  const [data, setData] = useState<AltResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const settle = (p: Promise<AltResponse>) =>
    p
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(navigator.onLine ? (e as Error).message : "Offline. Connect to check seats."))
      .finally(() => setBusy(false));

  function load() {
    setBusy(true);
    void settle(fetchAlternatives());
  }

  useEffect(() => {
    void settle(fetchAlternatives());
  }, []);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {data?.trains.map((t) => (
        <div key={t.number} className="rounded-lg bg-card px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">
              <span className="font-mono tabular">{t.number}</span> {t.name}
            </p>
            {t.depart && <span className="font-mono text-sm tabular">{hhmm(t.depart)}</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            {t.from} to {t.to}
            {t.arrive ? `, arrives ${stamp(t.arrive)}` : ""}
          </p>
          {t.classes.length > 0 ? (
            <p className="mt-1 font-mono text-sm tabular">
              {t.classes
                .map((c) => `${c.travelClass} ${c.status}${c.confirmChance !== undefined ? ` (${c.confirmChance}%)` : ""}`)
                .join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-warn">{t.error}</p>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-bad">Couldn&apos;t load alternatives: {error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-secondary text-sm font-medium active:scale-[0.98] disabled:opacity-60"
        >
          <ArrowClockwise className={cn("size-4", busy && "animate-spin")} />
          {busy ? "Checking" : "Refresh"}
        </button>
        <a
          href={NE_ALTERNATIVES.flightsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-secondary text-sm font-medium active:scale-[0.98]"
        >
          <AirplaneTilt className="size-4" />
          Check flights
        </a>
      </div>
      <a
        href={IRCTC_BOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground active:scale-[0.98]"
      >
        Book on IRCTC
        <ArrowSquareOut className="size-4" />
      </a>
      {data && <p className="text-xs text-subtle">Seats as of {hhmm(data.fetchedAt)}. Flights only as a last resort.</p>}
    </div>
  );
}
