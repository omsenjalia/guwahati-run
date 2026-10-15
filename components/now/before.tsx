"use client";

import Link from "next/link";
import { CaretRight, CheckCircle, CircleDashed, CodeBlock, Hourglass, WarningCircle } from "@phosphor-icons/react";
import { BACKUPS, EVENT, LEGS, PLACES, TEAM, type Leg } from "@/data/trip";
import { storedChoice } from "@/lib/ticket-choice";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { Countdown, statusSummary } from "@/components/leg-bits";
import { DeadlinePanel, ForecastPanel, moreLink } from "@/components/now/shared";
import type { LiveState } from "@/lib/live-types";
import { useMe } from "@/lib/me";
import { prepProgress } from "@/lib/prep";
import { dayMonth, hhmm, ms, weekdayDate } from "@/lib/time";
import { canBoard, legPassengers, legSituation } from "@/lib/trip-engine";
import { useChecklist } from "@/lib/use-checklist";
import { cn } from "@/lib/utils";

const FIRST = LEGS[0];

/** Phase A: now until the morning of 28 Oct. A confident countdown, not a worry list. */
export function BeforeTrip({ now, live }: { now: number; live: LiveState }) {
  return (
    <>
      <section className="px-1 pt-2 pb-1">
        <p className="text-sm text-muted-foreground">
          {EVENT.name.replace(" Hackathon Finals", " Finals")}, {EVENT.venue}
        </p>
        <p className="mt-5 text-sm font-medium text-muted-foreground">We leave in</p>
        <Countdown to={ms(FIRST.depart)} now={now} className="mt-1 block text-[3.25rem] leading-none" />
        <p className="mt-3 text-[0.95rem] text-muted-foreground">
          {PLACES[FIRST.from].short}, {weekdayDate(FIRST.depart)} at{" "}
          <span className="tabular font-medium text-foreground">{hhmm(FIRST.depart)}</span>
        </p>
      </section>
      <TripStatus live={live} />
      <PrepPreview now={now} />
      <DeadlinePanel now={now} live={live} />
      <HackathonPrep now={now} />
      <ForecastPanel place="IITG" days={["2026-10-30", "2026-10-31", "2026-11-01"]} title="Guwahati, 30 Oct to 1 Nov" />
    </>
  );
}

/* --------------------------------------------------------- trip status */

/** One line per ticket: seated, still waitlisted (tracked), at risk, or details to come. */
function legStatus(leg: Leg, live: LiveState) {
  if (!leg.pnr) return { Icon: Hourglass, tone: "text-subtle", text: "To add", extra: "" };
  if (canBoard(leg, live)) return { Icon: CheckCircle, tone: "text-ok", text: statusSummary(leg, live), extra: "" };
  const chances = legPassengers(leg, live)
    .map((p) => p.confirmChance)
    .filter((c): c is number => c !== undefined);
  const sit = legSituation(leg, live);
  return {
    Icon: sit.health === "red" ? WarningCircle : CircleDashed,
    tone: sit.health === "red" ? "text-bad" : "text-warn",
    text: statusSummary(leg, live),
    extra: chances.length ? `${Math.min(...chances)}% chance` : "",
  };
}

function TripStatus({ live }: { live: LiveState }) {
  const choice = storedChoice(live);
  // The backup sits right after North East, until one of them is dropped.
  const trains = LEGS.filter((l) => l.kind === "train")
    .flatMap((l) => [l, ...BACKUPS.filter((b) => b.backupFor === l.id)])
    .filter((l) => l.id !== choice?.loser);
  return (
    <Panel>
      <PanelTitle>Trip status</PanelTitle>
      <ul className="flex flex-col">
        {trains.map((leg) => {
          const s = legStatus(leg, live);
          const waiting = leg.tracked && !canBoard(leg, live);
          return (
            <li key={leg.id}>
              <Link href={`/tickets#${leg.id}`} className="-mx-2 flex min-h-15 items-center gap-3 rounded-lg px-2 py-2 transition-colors active:bg-secondary">
                <s.Icon aria-hidden weight={s.Icon === CircleDashed ? "bold" : "fill"} className={cn("size-5 shrink-0", s.tone)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.95rem]">
                      {leg.backupFor && <span className="text-muted-foreground">Backup: </span>}
                      {PLACES[leg.from].short} to {PLACES[leg.to].short}
                    </span>
                    <span className={cn("shrink-0 text-sm font-semibold tabular", waiting && "text-warn")}>{s.text}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {dayMonth(leg.depart)}, {leg.train?.number} {leg.train?.name}
                    </span>
                    {s.extra && <span className={cn("shrink-0", waiting && "text-warn")}>{s.extra}</span>}
                  </span>
                </span>
                <CaretRight className="size-4 shrink-0 text-subtle" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------ prep */

function PrepPreview({ now }: { now: number }) {
  const me = useMe();
  const { items } = useChecklist("prep");
  const everyone = TEAM.map((p) => p.id);
  if (!items) return <Skeleton className="h-40" />;
  if (!items.length) return null;
  const p = prepProgress(items, everyone, me, now);
  return (
    <Panel>
      <PanelTitle aside={<span className="tabular text-sm text-muted-foreground">{p.done}/{p.total} done</span>}>
        Before we go
      </PanelTitle>
      <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className="h-full rounded-full bg-ok" style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} />
      </div>
      {p.next.length ? (
        <ul className="mt-4 flex flex-col gap-3">
          {p.next.slice(0, 3).map((n) => (
            <li key={n.item.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 text-[0.95rem] leading-snug">
                {n.item.label}
                {n.missing.length > 0 && n.item.per_person && (
                  <span className="block text-xs text-muted-foreground">Still to do: {n.missing.join(", ")}</span>
                )}
              </span>
              {n.item.due && (
                <span className={cn("shrink-0 tabular text-xs", n.overdue ? "font-semibold text-bad" : "text-muted-foreground")}>
                  by {dayMonth(`${n.item.due}T12:00:00+05:30`)}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[0.95rem] text-ok">All done. Ready to go.</p>
      )}
      <Link href="/team#prep" className={moreLink}>
        Open the checklist
        <CaretRight className="size-4" />
      </Link>
    </Panel>
  );
}

/* ------------------------------------------------------- hackathon */

function HackathonPrep({ now }: { now: number }) {
  return (
    <Panel className="flex flex-col">
      <PanelTitle aside={<CodeBlock className="size-5 text-subtle" />}>Hackathon</PanelTitle>
      <p className="text-sm text-muted-foreground">Reporting and start {weekdayDate(EVENT.start)}, {hhmm(EVENT.start)} sharp</p>
      <Countdown to={ms(EVENT.start)} now={now} className="mt-1 block text-2xl" />
      <Link href="/hackathon" className={moreLink}>
        Open the hackathon board
        <CaretRight className="size-4" />
      </Link>
    </Panel>
  );
}
