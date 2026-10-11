"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FilePdf, IdentificationBadge, X } from "@phosphor-icons/react";
import { LEGS, PLACES, TEAM, type Leg } from "@/data/trip";
import { CopyChip, Skeleton } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { docFileUrl } from "@/lib/documents";
import { useLive } from "@/lib/live-store";
import { useDocuments } from "@/lib/receipts";
import { ms, stamp, weekdayDate } from "@/lib/time";
import { canBoard, legBerths, legPassengers, parseStatus } from "@/lib/trip-engine";
import type { LiveState } from "@/lib/live-types";
import { cn } from "@/lib/utils";

const TICKETS = LEGS.filter((l) => l.pnr);
const fullName = (id: string) => TEAM.find((p) => p.id === id)?.name ?? id;

/**
 * Every ticket in one swipeable strip, readable offline (static data plus
 * the last synced status). "Show to TTE" fills the screen with the PNR,
 * names and seats in large type.
 */
export function WalletView() {
  const now = useNow();
  const live = useLive();
  const { docs } = useDocuments();
  const [tte, setTte] = useState<Leg | null>(null);
  if (now === null) return <Skeleton className="h-96" />;
  // Start on the next ticket we'll use.
  const start = Math.max(0, TICKETS.findIndex((l) => ms(l.arrive) > now));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link href="/tickets" aria-label="Back to tickets" className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg active:bg-secondary">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Ticket wallet</h1>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">Swipe between tickets. Works offline.</p>

      <ol
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
        ref={(el) => {
          // Scroll to the next ticket once, on first render.
          if (el && !el.dataset.placed) {
            el.dataset.placed = "1";
            el.children[start]?.scrollIntoView({ inline: "start", block: "nearest" });
          }
        }}
      >
        {TICKETS.map((leg) => {
          const pdf = docs?.find((d) => d.kind === "ticket" && d.leg_id === leg.id);
          return (
            <li key={leg.id} className={cn("w-[86%] shrink-0 snap-start rounded-2xl border bg-card p-4", ms(leg.arrive) < now && "opacity-55")}>
              <TicketFace leg={leg} live={live} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTte(leg)}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98]"
                >
                  <IdentificationBadge className="size-5" />
                  Show to TTE
                </button>
                {pdf ? (
                  <a href={docFileUrl(pdf)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-secondary text-[0.95rem] font-medium">
                    <FilePdf className="size-5" />
                    E-ticket
                  </a>
                ) : (
                  <Link href="/money" className="inline-flex h-12 items-center justify-center rounded-lg bg-secondary px-2 text-center text-sm text-muted-foreground">
                    Add e-ticket PDF
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-subtle">Carry original photo ID. Open each e-ticket once with signal so it&apos;s saved on this phone.</p>
      {tte && <TteScreen leg={tte} live={live} onClose={() => setTte(null)} />}
    </div>
  );
}

function seatFor(leg: Leg, live: LiveState, person: string) {
  const b = legBerths(leg, live).find((x) => x.person === person);
  if (b) return { main: `${b.coach}/${b.berth}`, sub: b.type };
  const p = legPassengers(leg, live).find((x) => x.person === person);
  return { main: parseStatus(p?.current).label, sub: "" };
}

function TicketFace({ leg, live }: { leg: Leg; live: LiveState }) {
  const ok = canBoard(leg, live);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted-foreground tabular">
            {leg.train?.number} · {leg.travelClass}
          </p>
          <p className="text-lg font-semibold leading-tight">{leg.train?.name}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
          {ok ? "✅ Can board" : "Waitlisted"}
        </span>
      </div>
      <p className="mt-2 text-[0.95rem]">
        {PLACES[leg.from].short} to {PLACES[leg.to].short}
        {leg.ticketTo && <span className="block text-xs text-muted-foreground">Ticket is to {leg.ticketTo}; we get off at {PLACES[leg.to].short}.</span>}
      </p>
      <p className="font-mono text-sm tabular text-muted-foreground">
        {weekdayDate(leg.depart)} · {stamp(leg.depart).split(" ").pop()} to {stamp(leg.arrive)}
      </p>
      <div className="mt-3">
        <CopyChip value={leg.pnr!} label="PNR" className="w-full justify-between text-lg" />
      </div>
      <ul className="mt-3 flex flex-col divide-y">
        {TEAM.filter((p) => leg.passengers?.some((x) => x.person === p.id)).map((p) => {
          const s = seatFor(leg, live, p.id);
          return (
            <li key={p.id} className="flex items-baseline justify-between gap-2 py-1.5">
              <span className="text-[0.95rem]">{personName(p.id)}</span>
              <span className="font-mono text-[0.95rem] font-semibold tabular">
                {s.main}
                {s.sub && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{s.sub}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Full screen, high contrast, big type: hand the phone to the TTE. */
function TteScreen({ leg, live, onClose }: { leg: Leg; live: LiveState; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={`Ticket for ${leg.train?.name}`} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white p-6 text-black">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 inline-flex size-12 items-center justify-center rounded-full bg-black/10">
        <X className="size-6" />
      </button>
      <p className="mt-10 text-lg">
        {leg.train?.number} {leg.train?.name} · {leg.travelClass}
      </p>
      <p className="text-base text-black/70">
        {PLACES[leg.from].name} to {PLACES[leg.to].name}, {weekdayDate(leg.depart)}
      </p>
      <p className="mt-6 text-sm uppercase tracking-wider text-black/60">PNR</p>
      <p className="font-mono text-[3.25rem] leading-none font-bold tracking-wider tabular">{leg.pnr}</p>
      <ul className="mt-8 flex flex-col gap-4">
        {TEAM.filter((p) => leg.passengers?.some((x) => x.person === p.id)).map((p) => {
          const s = seatFor(leg, live, p.id);
          return (
            <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-black/15 pb-3">
              <span className="text-2xl font-semibold">{fullName(p.id)}</span>
              <span className="shrink-0 font-mono text-3xl font-bold tabular">{s.main}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto pt-8 text-sm text-black/60">All 4 of us carry original photo ID.</p>
    </div>
  );
}
