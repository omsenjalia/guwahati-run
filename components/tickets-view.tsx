"use client";

import Link from "next/link";
import { ArrowSquareOut, ChatText, IdentificationCard, Info, Wallet, Warning } from "@phosphor-icons/react";
import { IRCTC_PNR_URL, LEGS, TEAM, type Leg } from "@/data/trip";
import { CopyChip, LiveStamp, Panel, Skeleton, StatusPill, healthText } from "@/components/bits";
import { CoachStrip, Route, TimeRange, personName } from "@/components/leg-bits";
import { NePlanB } from "@/components/plan-b";
import { PnrHistory } from "@/components/pnr-history";
import { smsLink } from "@/lib/links";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { useMe } from "@/lib/me";
import { ms, stamp } from "@/lib/time";
import { canBoard, chartTime, legBerths, legHealth, legPassengers, legSituation, parseStatus } from "@/lib/trip-engine";
import type { LiveState } from "@/lib/live-types";
import { cn } from "@/lib/utils";

export function TicketsView() {
  const now = useNow();
  const live = useLive();
  if (now === null) return <Skeleton className="h-96" />;
  const trains = LEGS.filter((l) => l.kind === "train" || l.kind === "local-train");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <Link
          href="/wallet"
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-[0.95rem] font-medium active:scale-[0.98]"
        >
          <Wallet className="size-5" />
          Wallet
        </Link>
      </div>
      {trains.map((leg) => (
        <TicketCard key={leg.id} leg={leg} live={live} now={now} />
      ))}
    </div>
  );
}

const KIND_TONE = { CNF: "text-ok", RAC: "text-ok", WL: "text-warn", CAN: "text-bad", UNKNOWN: "text-muted-foreground" };

/**
 * One ticket. Only the tracked ticket (North East, until its chart is final)
 * shows live status, chance, history and Plan B; every other ticket is a
 * static card checked by hand on IRCTC.
 */
function TicketCard({ leg, live, now }: { leg: Leg; live: LiveState; now: number }) {
  const me = useMe();
  const l = leg.tracked ? live.legs[leg.id] : undefined;
  const pax = legPassengers(leg, live);
  const berths = legBerths(leg, live);
  const done = ms(leg.arrive) < now;
  const watching = !!leg.tracked && !l?.chartPrepared;
  const boardable = canBoard(leg, live);

  return (
    <>
      <Panel id={leg.id} className={cn("scroll-mt-20 p-0", done && "opacity-55")}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-sm text-muted-foreground tabular">{leg.train?.number}</p>
              <p className="text-lg font-semibold leading-tight">{leg.train?.name}</p>
            </div>
            {!pax.length ? (
              <StatusPill health="green">Unreserved</StatusPill>
            ) : boardable ? (
              <StatusPill health="green">✅ Can board</StatusPill>
            ) : (
              <StatusPill health={legHealth(leg, live)}>{watching ? "Tracking" : undefined}</StatusPill>
            )}
          </div>
          <Route leg={leg} className="mt-2 text-[0.95rem]" />
          <p className="text-sm text-muted-foreground">
            <TimeRange start={ms(leg.depart)} end={ms(leg.arrive)} />
            <span className="ml-2">{leg.travelClass}</span>
          </p>
          {leg.backupTrain && (
            <p className="mt-2 text-sm text-muted-foreground">
              Backup: {leg.backupTrain.number} {leg.backupTrain.name} at{" "}
              <span className="font-mono tabular">{stamp(leg.backupTrain.depart).split(" ").pop()}</span>
            </p>
          )}
        </div>

        {pax.length > 0 && (
          <table className="w-full border-t text-[0.95rem]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pl-4 font-medium">Name</th>
                <th className="py-2 font-medium">Booked</th>
                <th className="py-2 pr-4 text-right font-medium">{watching ? "Now" : "Seat"}</th>
              </tr>
            </thead>
            <tbody>
              {pax.map((p) => {
                const berth = berths.find((b) => b.person === p.person);
                const cur = parseStatus(p.current);
                return (
                  <tr key={p.person} className={cn(p.person === me && "bg-accent/40")}>
                    <td className="py-2.5 pl-4 font-medium">{personName(p.person)}</td>
                    <td className="py-2.5 font-mono text-muted-foreground tabular">{parseStatus(p.booked).label}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={cn("font-mono font-semibold tabular", berth ? "text-ok" : KIND_TONE[cur.kind])}>
                        {berth ? `${berth.coach}/${berth.berth}` : cur.label}
                      </span>
                      {berth && <span className="block text-xs text-muted-foreground">{berth.type}</span>}
                      {p.confirmChance !== undefined && !berth && watching && (
                        <span className="block text-xs text-muted-foreground">{p.confirmChance}% chance</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="flex flex-col gap-3 border-t p-4">
          {!done && watching && <SituationNote leg={leg} live={live} />}
          {watching && <PnrHistory legId={leg.id} />}
          {l?.coachPosition && !done && <CoachStrip order={l.coachPosition} mine={berths.map((b) => b.coach)} />}
          {leg.pnr && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <CopyChip value={leg.pnr} label="PNR" />
                <a
                  href={smsLink("139", `PNR ${leg.pnr}`, /iphone|ipad/i.test(navigator.userAgent))}
                  aria-label={`Text 139 for PNR ${leg.pnr} status`}
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-secondary active:scale-[0.98]"
                >
                  <ChatText className="size-5" />
                </a>
              </div>
              {watching ? (
                <div className="text-right">
                  {!done && (
                    <p className="text-xs text-muted-foreground">
                      Chart <span className="font-mono tabular">{stamp(chartTime(leg.depart))}</span>
                    </p>
                  )}
                  <LiveStamp updatedAt={l?.pnrUpdatedAt ?? l?.updatedAt} stale={l?.stale} />
                </div>
              ) : (
                <a
                  href={IRCTC_PNR_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => navigator.clipboard?.writeText(leg.pnr!).catch(() => {})}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Check on IRCTC
                  <ArrowSquareOut className="size-3.5" />
                </a>
              )}
            </div>
          )}
          {leg.tracked && l?.chartPrepared && <p className={cn("text-xs font-medium", healthText.green)}>Chart prepared. No more checks needed.</p>}
          {leg.fareTotal && (
            <p className="text-sm text-muted-foreground">
              Fare <span className="font-mono text-foreground tabular">₹{leg.fareTotal.toLocaleString("en-IN")}</span> for 4
            </p>
          )}
          <TicketNotes leg={leg} />
        </div>
      </Panel>
      {leg.tracked && !done && <NePlanB live={live} now={now} />}
    </>
  );
}

function TicketNotes({ leg }: { leg: Leg }) {
  const nameNotes = TEAM.flatMap((p) => (p.ticketNameNotes?.[leg.id] ? [`${p.name}: ${p.ticketNameNotes[leg.id]}`] : []));
  const notes = [...nameNotes, ...(leg.notes ?? [])];
  if (!notes.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((n) => (
        <li key={n} className="flex gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-sm leading-snug">
          <IdentificationCard className="mt-0.5 size-4 shrink-0 text-warn" />
          {n}
        </li>
      ))}
    </ul>
  );
}

/** What the tracked ticket's state means and what to do. */
function SituationNote({ leg, live }: { leg: Leg; live: LiveState }) {
  const s = legSituation(leg, live);
  if (!s.advice) return null;
  const tone = s.health === "red" ? "bg-bad-soft" : s.health === "green" ? "bg-ok-soft" : "bg-warn-soft";
  const Icon = s.health === "red" ? Warning : Info;
  return (
    <div className={cn("rounded-lg px-3 py-2.5", tone)}>
      <p className={cn("flex items-center gap-2 text-sm font-semibold", healthText[s.health])}>
        <Icon className="size-4 shrink-0" weight="bold" />
        {s.title}
      </p>
      <p className="mt-1 text-sm leading-snug">{s.advice}</p>
    </div>
  );
}
