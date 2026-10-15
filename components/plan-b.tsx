"use client";

import { useEffect, useState } from "react";
import { AirplaneTilt, ArrowClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { DEADLINES, IRCTC_BOOK_URL, LEGS, NE_ALTERNATIVES, TATKAL_BOOKER } from "@/data/trip";
import { Panel, PanelTitle, StatusPill } from "@/components/bits";
import { Countdown, personName, statusSummary } from "@/components/leg-bits";
import { evaluate } from "@/lib/deadline-rules";
import type { LiveState } from "@/lib/live-types";
import { HOUR, hhmm, ms, stamp } from "@/lib/time";
import { canBoard, chartTime, legSituation } from "@/lib/trip-engine";
import { BACKUP, choiceText, storedChoice } from "@/lib/ticket-choice";
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
  // Nothing to plan once North East or its backup can board.
  if (sit.kind !== "waitlisted" || canBoard(BACKUP, live) || now > ms(NE.depart)) return null;
  const charted = live.legs[NE.id]?.chartPrepared ?? false;
  const tatkalAt = ms(TATKAL.at);
  const verdict = evaluate(TATKAL, live, now);
  const tatkalOpen = now < tatkalAt + 2 * HOUR;

  return (
    <Panel className={cn(charted ? "ring-1 ring-bad/50 bg-bad-soft" : "ring-1 ring-warn/40")}>
      <PanelTitle aside={<StatusPill health={charted ? "red" : "amber"}>{charted ? "Act now" : "Plan B ready"}</StatusPill>}>
        Plan B: 12506 North East
      </PanelTitle>

      <p className="mb-3 text-sm leading-snug text-pretty">
        Backup booked: <span className="font-semibold">{BACKUP.train!.number} {BACKUP.train!.name}</span>, Delhi Jn {hhmm(BACKUP.depart)},{" "}
        <span className="tabular">{statusSummary(BACKUP, live)}</span>. Whichever clears first, we take; North East if both do.
      </p>

      {!charted && tatkalOpen && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">Tatkal decision, {stamp(tatkalAt)}</p>
            <Countdown to={tatkalAt} now={now} className="text-sm" />
          </div>
          <p className="text-[0.95rem] leading-snug text-pretty">{verdict.message}</p>
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

/**
 * North East vs backup: the rule while both are waitlisted, then the
 * decision (and which PNR to cancel) once one clears.
 */
export function ChoiceBanner({ live }: { live: LiveState }) {
  const choice = storedChoice(live);
  if (!choice) {
    return (
      <Panel className="py-3">
        <p className="text-sm leading-snug">
          <span className="font-semibold">Two tickets for 29 Oct.</span> Whichever of 12506 North East or the backup {BACKUP.train!.number} clears first
          (anyone confirmed or RAC), we keep; if both clear together, North East. The app alerts everyone to cancel the other.
        </p>
      </Panel>
    );
  }
  const t = choiceText(choice);
  return (
    <Panel className="ring-1 ring-bad/40 bg-bad-soft">
      <PanelTitle aside={<StatusPill health="red">Action</StatusPill>}>{t.title}</PanelTitle>
      <p className="text-[0.95rem] leading-snug">{t.action}</p>
      <a
        href="https://www.irctc.co.in/nget/txn/cancel-ticket"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[0.95rem] font-medium text-primary-foreground"
      >
        Cancel {t.lose.train!.number} on IRCTC
        <ArrowSquareOut className="size-4" />
      </a>
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
              <span className="tabular">{t.number}</span> {t.name}
            </p>
            {t.depart && <span className="tabular text-sm">{hhmm(t.depart)}</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            {t.from} to {t.to}
            {t.arrive ? `, arrives ${stamp(t.arrive)}` : ""}
          </p>
          {t.classes.length > 0 ? (
            <p className="mt-1 tabular text-sm">
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
