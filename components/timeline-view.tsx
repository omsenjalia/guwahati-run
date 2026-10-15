"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Train,
  Subway,
  Car,
  CodeBlock,
  Bed,
  ForkKnife,
  MapPinArea,
  House,
  Mountains,
  CalendarPlus,
} from "@phosphor-icons/react";
import { PLACES } from "@/data/trip";
import { Panel, Skeleton } from "@/components/bits";
import { TransferPlanCard } from "@/components/transfer-plan";
import { planTransfers } from "@/lib/transfer-planner";
import { Route, statusSummary } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { mapsLink, olaLink, rapidoLink, uberLink } from "@/lib/links";
import { toast } from "sonner";
import { hhmm, istDateKey, weekdayDate } from "@/lib/time";
import { buildSteps, type Step, type StepKind } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";

const ICONS: Record<StepKind, typeof Train> = {
  train: Train,
  transfer: Subway,
  event: CodeBlock,
  stay: House,
  explore: Mountains,
  pickup: Car,
  meal: ForkKnife,
  sleep: Bed,
};

export function TimelineView({ calendarPath }: { calendarPath?: string }) {
  const now = useNow();
  const live = useLive();
  const currentRef = useRef<HTMLLIElement>(null);
  const ready = now !== null;

  useEffect(() => {
    if (ready) currentRef.current?.scrollIntoView({ block: "center" });
  }, [ready]);

  if (now === null) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const steps = buildSteps(live);
  const days = new Map<string, Step[]>();
  for (const s of steps) {
    const k = istDateKey(s.start);
    days.set(k, [...(days.get(k) ?? []), s]);
  }
  // The first step that hasn't ended yet gets the "you are here" marker.
  const currentId = steps.find((s) => !s.minor && s.end > now)?.id;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
          <Link href="/guide" className="text-sm font-medium text-primary">
            Station guides, meals, explore
          </Link>
        </div>
        {calendarPath && <CalendarButton path={calendarPath} />}
      </div>

      {[...days.entries()].map(([key, items]) => (
        <section key={key} aria-label={weekdayDate(items[0].start)}>
          <h2 className="sticky top-[calc(3.25rem+env(safe-area-inset-top))] z-10 -mx-4 bg-background/90 px-4 py-2 text-sm font-semibold text-muted-foreground backdrop-blur">
            {weekdayDate(items[0].start)}
          </h2>
          <ol className="relative mt-1">
            {items.map((s) => {
              const isCurrent = s.id === currentId;
              return (
                <li key={s.id} ref={isCurrent ? currentRef : undefined}>
                  <StepRow step={s} now={now} current={isCurrent} live={live} />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function StepRow({
  step,
  now,
  current,
  live,
}: {
  step: Step;
  now: number;
  current: boolean;
  live: ReturnType<typeof useLive>;
}) {
  const Icon = ICONS[step.kind];
  const past = step.end <= now;
  const shifted = Math.abs(step.start - step.plannedStart) >= 5 * 60000;
  const leg = step.leg;
  const plan = leg?.kind === "transfer" ? planTransfers(live).find((p) => p.legId === leg.id) : undefined;

  if (step.minor) {
    return (
      <div className={cn("flex min-h-10 items-center gap-3 pl-1", past && "opacity-45")}>
        <span className="w-12 shrink-0 tabular text-xs text-subtle">{hhmm(step.start)}</span>
        <Icon className="size-4 shrink-0 text-subtle" />
        <span className="text-sm text-muted-foreground">{step.title}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 py-1.5", past && "opacity-45")}>
      <div className="w-12 shrink-0 pt-3.5 pl-1">
        <p className="tabular text-sm font-semibold">{hhmm(step.start)}</p>
        {shifted && <p className="tabular text-xs text-subtle line-through">{hhmm(step.plannedStart)}</p>}
      </div>
      <Panel className={cn("min-w-0 flex-1 p-4", current && "ring-1 ring-primary/50")}>
        <div className="flex items-start gap-2.5">
          <Icon className={cn("mt-0.5 size-5 shrink-0", current ? "text-primary" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{step.title}</p>
            {leg && leg.kind !== "transfer" && <Route leg={leg} className="text-sm text-muted-foreground" />}
            {/* The plan below spells out the route; the hint is only for when there's no plan. */}
            {leg?.kind === "transfer" && !(plan && !past) && <p className="text-sm text-muted-foreground">{leg.modeHint}</p>}
            {step.block && step.kind !== "event" && (
              <p className="text-sm text-muted-foreground">{PLACES[step.block.place].name}</p>
            )}
            <p className="mt-1 text-xs text-subtle">
              until <span className="tabular">{hhmm(step.end)}</span>
              {step.approx && " (approx.)"}
              {leg?.pnr && <span className="ml-2 tabular">{statusSummary(leg, live)}</span>}
            </p>
            {step.block?.notes?.map((n) => (
              <p key={n} className="mt-1.5 text-sm">
                {n}
              </p>
            ))}
          </div>
        </div>
        {leg?.kind === "transfer" && plan && !past && <TransferPlanCard plan={plan} now={now} className="mt-3" />}
        {leg?.kind === "transfer" && <TransferLinks from={leg.from} to={leg.to} road={plan?.mode !== "metro"} />}
        {step.kind === "pickup" && (
          <a
            href={rapidoLink(/android/i.test(navigator.userAgent))}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex h-11 items-center justify-center rounded-lg bg-secondary text-sm font-medium active:scale-[0.98]"
          >
            Open Rapido
          </a>
        )}
      </Panel>
    </div>
  );
}

function TransferLinks({ from, to, road }: { from: keyof typeof PLACES; to: keyof typeof PLACES; road: boolean }) {
  const a = PLACES[from];
  const b = PLACES[to];
  const isAndroid = /android/i.test(navigator.userAgent);
  const link = "inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-secondary text-sm font-medium transition active:scale-[0.98]";
  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      <a className={link} href={mapsLink(a, b, road ? "driving" : "transit")} target="_blank" rel="noreferrer">
        <MapPinArea className="size-4" /> Maps
      </a>
      <a className={link} href={uberLink(a, b)} target="_blank" rel="noreferrer">
        Uber
      </a>
      <a className={link} href={olaLink(a, b)} target="_blank" rel="noreferrer">
        Ola
      </a>
      <a
        className={link}
        href={rapidoLink(isAndroid)}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          // Rapido can't be pre-filled, so put the destination on the clipboard.
          navigator.clipboard
            ?.writeText(b.name)
            .then(() => toast.success(`Copied "${b.name}". Paste it into Rapido.`))
            .catch(() => {});
        }}
      >
        Rapido
      </a>
    </div>
  );
}

function CalendarButton({ path }: { path: string }) {
  return (
    <a
      href={`webcal://${typeof window !== "undefined" ? window.location.host : ""}${path}`}
      className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium active:scale-[0.98]"
    >
      <CalendarPlus className="size-4" />
      Add to calendar
    </a>
  );
}
