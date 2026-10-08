"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { PLACES, TEAM, type Leg } from "@/data/trip";
import type { LiveState } from "@/lib/live-types";
import { legBerths, legPassengers, parseStatus } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";
import { countdownParts, stamp } from "@/lib/time";

export const personName = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

/** "PQWL 24-27", "G8/18-22", "RAC 38, RAC 40" */
export function statusSummary(leg: Leg, live: LiveState, compact = false) {
  const berths = legBerths(leg, live);
  if (berths.length) {
    const coaches = [...new Set(berths.map((b) => b.coach))];
    if (compact) return `CNF ${coaches.join(", ")}`;
    return coaches.length === 1
      ? `${coaches[0]}/${berths.map((b) => b.berth).join(", ")}`
      : berths.map((b) => `${b.coach}/${b.berth}`).join(", ");
  }
  const parsed = legPassengers(leg, live).map((p) => parseStatus(p.current));
  if (!parsed.length) return "";
  const prefix = parsed[0].label.split(" ")[0];
  const nums = parsed.map((p) => p.number);
  const sameKind = parsed.every((p) => p.label.split(" ")[0] === prefix && p.number !== undefined);
  if (sameKind) {
    const sorted = (nums as number[]).slice().sort((a, b) => a - b);
    const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (consecutive) return `${prefix} ${sorted[0]}-${sorted[sorted.length - 1]}`;
  }
  return parsed.map((p) => p.label).join(", ");
}

export function Route({ leg, className }: { leg: Leg; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {PLACES[leg.from].short}
      <ArrowRight className="size-3.5 opacity-60" aria-label="to" />
      {PLACES[leg.to].short}
    </span>
  );
}

export function TimeRange({ start, end }: { start: number; end: number }) {
  return (
    <span className="font-mono tabular">
      {stamp(start)} <span className="opacity-50">to</span> {stamp(end)}
    </span>
  );
}

/** Big departure-board countdown. */
export function Countdown({ to, now, className }: { to: number; now: number; className?: string }) {
  const diff = to - now;
  const { days, hours, minutes, seconds } = countdownParts(diff);
  const pad = (n: number) => String(n).padStart(2, "0");
  const text =
    diff <= 0
      ? "Now"
      : days > 0
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return (
    <span className={cn("font-mono font-semibold tracking-tight tabular", className)} aria-live="off">
      {text}
    </span>
  );
}

/**
 * Coach order on the platform, engine end first (from the PNR provider),
 * with our coaches highlighted. Scrolls sideways on narrow phones.
 */
export function CoachStrip({ order, mine }: { order: string; mine: string[] }) {
  const coaches = order.split(/\s+/).filter(Boolean);
  const ours = new Set(mine);
  const label = (c: string) => (c === "L" ? "Engine" : c);
  const idx = coaches.findIndex((c) => ours.has(c));
  const where =
    idx < 0 ? "" : idx < coaches.length / 3 ? "near the engine end" : idx > (coaches.length * 2) / 3 ? "at the far end, away from the engine" : "in the middle";
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        Coach order on the platform{where && <span className="text-foreground">. Ours are {where}</span>}
      </p>
      <ol className="-mx-4 mt-1.5 flex gap-1 overflow-x-auto px-4 pb-1" aria-label="Coach order, engine first">
        {coaches.map((c, i) => (
          <li
            key={`${c}-${i}`}
            className={cn(
              "flex h-8 min-w-9 shrink-0 items-center justify-center rounded-md px-1.5 font-mono text-xs tabular",
              ours.has(c) ? "bg-primary font-semibold text-primary-foreground" : c === "L" ? "bg-foreground/80 text-background" : "bg-secondary text-muted-foreground",
            )}
          >
            {label(c)}
          </li>
        ))}
      </ol>
    </div>
  );
}
