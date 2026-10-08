"use client";

import Link from "next/link";
import { ArrowSquareOut, CaretRight, CloudSun } from "@phosphor-icons/react";
import { CONNECTIONS, LEGS, PLACES, TATKAL_BOOKER, type PlaceId } from "@/data/trip";
import { TransferPlanCard } from "@/components/transfer-plan";
import { CheckinPanel } from "@/components/checkin-panel";
import { checkpointLabel } from "@/lib/checkins";
import { planTransfers } from "@/lib/transfer-planner";
import { evaluate } from "@/lib/deadline-rules";
import { CopyChip, LiveStamp, Panel, PanelTitle, Skeleton, StatusPill, healthText } from "@/components/bits";
import { Countdown, Route, TimeRange, personName, statusSummary } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { useMe } from "@/lib/me";
import { useWeather } from "@/lib/use-weather";
import { describeWeather } from "@/lib/weather";
import { duration, hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import {
  buildSteps,
  computeNow,
  legHealth,
  nextDeadline,
  parseStatus,
  personBerth,
  tripHealth,
  type Step,
} from "@/lib/trip-engine";
import type { LiveState } from "@/lib/live-types";
import { cn } from "@/lib/utils";

export function NowView() {
  const now = useNow();
  const live = useLive();
  if (now === null) return <NowSkeleton />;

  const steps = buildSteps(live);
  const state = computeNow(steps, now);
  const health = tripHealth(live, now);

  return (
    <div className="flex flex-col gap-3">
      <Hero state={state} now={now} live={live} />
      <PlanBPanel health={health} now={now} />
      {state.phase !== "pre-trip" && <CheckinPanel place={checkpointLabel(state)} now={now} />}
      <HealthPanel health={health} live={live} />
      <DeadlinePanel now={now} live={live} />
      <WeatherPanel focus={state.focus} mode={state.focusMode} />
    </div>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero({ state, now, live }: { state: ReturnType<typeof computeNow>; now: number; live: LiveState }) {
  const me = useMe();
  const step = state.focus;
  if (!step) {
    return (
      <Panel className="py-8">
        <p className="text-2xl font-semibold tracking-tight">Home safe.</p>
        <p className="mt-2 text-muted-foreground">{state.instruction}</p>
      </Panel>
    );
  }
  const leg = step.leg;
  const label =
    state.phase === "pre-trip" ? "Trip starts in" : state.focusMode === "active" ? "Right now" : "Next up";
  const legLive = leg ? live.legs[leg.id] : undefined;
  // Show the transfer plan for a transfer, or while on the train before one.
  const plans = planTransfers(live);
  const nextLeg = leg ? LEGS[LEGS.findIndex((l) => l.id === leg.id) + 1] : undefined;
  const plan =
    plans.find((p) => p.legId === leg?.id) ??
    (state.focusMode === "active" && nextLeg?.kind === "transfer" && step.end - now < 3 * 3600_000
      ? plans.find((p) => p.legId === nextLeg.id)
      : undefined);
  const hasStatus = leg?.passengers?.length;

  return (
    <Panel className="relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {leg && hasStatus ? <StatusPill health={legHealth(leg, live)} /> : null}
      </div>

      {state.countdownTo && (
        <div className="mt-2">
          <Countdown to={state.countdownTo} now={now} className="text-[2.75rem] leading-none" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            {state.countdownLabel}{" "}
            <span className="font-mono tabular text-foreground">{stamp(state.countdownTo)}</span>
          </p>
        </div>
      )}

      <div className="mt-5 border-t pt-4">
        <p className="text-xl font-semibold leading-snug tracking-tight">{step.title}</p>
        {leg && leg.kind !== "transfer" && <Route leg={leg} className="mt-1 text-muted-foreground" />}
        <p className="mt-1 text-sm text-muted-foreground">
          <TimeRange start={step.start} end={step.end} />
          {step.approx && <span className="ml-1.5">(approx.)</span>}
        </p>
        <Delay step={step} />
      </div>

      <p className="mt-4 text-[1.05rem] font-medium leading-snug text-primary">{state.instruction}</p>

      {plan && <TransferPlanCard plan={plan} now={now} className="mt-4" />}

      {leg && (leg.kind === "train" || leg.kind === "local-train") && (
        <dl className="mt-4 grid grid-cols-[4.25rem_5.25rem_1fr] gap-2">
          <Fact label="Class" value={leg.travelClass ?? "-"} />
          <Fact label="Platform" value={legLive?.platform ?? "TBA"} />
          <Fact
            label={me ? `${personName(me)}'s seat` : "Seats"}
            value={
              me
                ? (() => {
                    const b = personBerth(leg, live, me);
                    if (b) return `${b.coach}/${b.berth}`;
                    const p = live.legs[leg.id]?.passengers?.find((x) => x.person === me);
                    const booked = leg.passengers?.find((x) => x.person === me)?.booked;
                    return parseStatus(p?.current ?? booked).label || "-";
                  })()
                : statusSummary(leg, live, true) || (leg.travelClass === "UR" ? "Open" : "-")
            }
          />
        </dl>
      )}

      {leg?.pnr && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <CopyChip value={leg.pnr} label="PNR" />
          <LiveStamp updatedAt={legLive?.updatedAt} stale={legLive?.stale} fallback="Status as booked" className="text-right" />
        </div>
      )}
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2.5">
      <dt className="truncate text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-[0.95rem] font-semibold tabular">{value}</dd>
    </div>
  );
}

function Delay({ step }: { step: Step }) {
  const late = Math.round((step.end - step.plannedEnd) / 60000);
  if (Math.abs(late) < 5) return null;
  return (
    <p className={cn("mt-1 text-sm font-medium", late > 0 ? "text-warn" : "text-ok")}>
      {late > 0 ? `Running ${duration(late * 60000)} late` : `${duration(-late * 60000)} early`}
      <span className="ml-1.5 font-normal text-muted-foreground">(was {hhmm(step.plannedEnd)})</span>
    </p>
  );
}

/* -------------------------------------------------------------- health */

function HealthPanel({ health, live }: { health: ReturnType<typeof tripHealth>; live: LiveState }) {
  if (!health.legs.length) return null;
  return (
    <Panel>
      <PanelTitle aside={<StatusPill health={health.overall} />}>Trip health</PanelTitle>
      <ul className="flex flex-col">
        {health.legs.map(({ leg, health: h }) => (
          <li key={leg.id}>
            <Link
              href={`/tickets#${leg.id}`}
              className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 active:bg-secondary"
            >
              <span className="w-14 shrink-0 font-mono text-sm text-muted-foreground tabular">{leg.train?.number}</span>
              <span className="min-w-0 flex-1 truncate text-[0.95rem]">{leg.train?.name}</span>
              <span className={cn("font-mono text-sm font-semibold tabular", healthText[h])}>{statusSummary(leg, live, true)}</span>
              <CaretRight className="size-4 shrink-0 text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
      {health.conns.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3">
          {health.conns.map((c) => (
            <div key={c.id}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={cn("font-mono text-lg font-semibold tabular", healthText[c.health])}>
                {duration(c.bufferMin * 60000)}
              </p>
              <p className="text-xs text-subtle">spare after transfer</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------ deadline */

const VERDICT_PILL = {
  action: { health: "red", label: "Action needed" },
  upcoming: { health: "amber", label: "Watching" },
  ok: { health: "green", label: "No action" },
  passed: { health: "green", label: "Passed" },
} as const;

function DeadlinePanel({ now, live }: { now: number; live: LiveState }) {
  const d = nextDeadline(now);
  if (!d) return null;
  const at = ms(d.at);
  const soon = at - now < 2 * 3600_000;
  const verdict = evaluate(d, live, now);
  const pill = VERDICT_PILL[verdict.status];
  return (
    <Panel className={cn(verdict.status === "action" && "border-bad/50", soon && verdict.status !== "action" && "border-warn/40")}>
      <PanelTitle aside={<Countdown to={at} now={now} className={cn("text-[0.95rem]", soon && "text-warn")} />}>
        Next deadline
      </PanelTitle>
      <p className="text-[1.05rem] font-semibold leading-snug">{d.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {weekdayDate(at)}, <span className="font-mono tabular">{hhmm(at)}</span>
      </p>
      <div className="mt-3 flex flex-col gap-2 rounded-lg bg-secondary px-3 py-2.5">
        <StatusPill health={pill.health} className="self-start">
          {pill.label}
        </StatusPill>
        <p className="text-[0.95rem] leading-snug">{verdict.message || d.condition}</p>
      </div>
      <p className="mt-3 text-sm leading-snug text-muted-foreground">
        Rule: if {d.condition.charAt(0).toLowerCase()}
        {d.condition.slice(1)} {d.action}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Owner: <span className="font-medium text-foreground">{personName(d.owner)}</span>
          {d.owner === TATKAL_BOOKER && d.link ? " (Tatkal booker)" : ""}
        </p>
        {d.link && (
          <a
            href={d.link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98]"
          >
            {d.link.label}
            <ArrowSquareOut className="size-4" />
          </a>
        )}
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- plan B */

/** Appears automatically when a Delhi connection turns amber or red. */
function PlanBPanel({ health, now }: { health: ReturnType<typeof tripHealth>; now: number }) {
  const risky = health.conns.filter((c) => c.health !== "green" && c.outboundDepart > now);
  if (!risky.length) return null;
  return (
    <>
      {risky.map((c) => {
        const cfg = CONNECTIONS.find((x) => x.id === c.id)!;
        return (
          <Panel key={c.id} className={cn(c.health === "red" ? "border-bad/50 bg-bad-soft" : "border-warn/40 bg-warn-soft")}>
            <PanelTitle aside={<StatusPill health={c.health}>{duration(Math.max(0, c.bufferMin) * 60000)} spare</StatusPill>}>
              Plan B: {c.label}
            </PanelTitle>
            <p className="text-[0.95rem] leading-snug">{cfg.planB.text}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Who acts: <span className="font-medium text-foreground">{personName(cfg.planB.owner)}</span>
              </p>
              {cfg.planB.link && (
                <a
                  href={cfg.planB.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-[0.95rem] font-medium text-primary-foreground active:scale-[0.98]"
                >
                  {cfg.planB.link.label}
                  <ArrowSquareOut className="size-4" />
                </a>
              )}
            </div>
          </Panel>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------- weather */

function WeatherPanel({ focus, mode }: { focus?: Step; mode: "upcoming" | "active" }) {
  // Where we are (or will be next) and where we're heading.
  const onTrain = mode === "active" && (focus?.kind === "train" || focus?.kind === "local-train");
  const here: PlaceId | undefined = onTrain
    ? focus?.to
    : focus?.from && mode === "upcoming"
      ? focus.from
      : focus?.place ?? focus?.from;
  const there: PlaceId | undefined = focus?.to && focus.to !== here ? focus.to : undefined;
  return (
    <Panel>
      <PanelTitle aside={<CloudSun className="size-5 text-subtle" />}>Weather</PanelTitle>
      <div className="grid grid-cols-2 gap-3">
        <WeatherCell id={here} />
        {there && <WeatherCell id={there} />}
      </div>
    </Panel>
  );
}

function WeatherCell({ id }: { id?: PlaceId }) {
  const w = useWeather(id);
  if (!id) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{PLACES[id].city}</p>
      {w ? (
        <>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular">{w.tempC}°</p>
          <p className="text-sm text-muted-foreground">
            {describeWeather(w.code)}, {w.todayMin}-{w.todayMax}°
            {w.rainChance >= 30 && <span className="text-warn"> Rain {w.rainChance}%</span>}
          </p>
          <LiveStamp updatedAt={w.fetchedAt} className="mt-1" />
        </>
      ) : (
        <Skeleton className="mt-1 h-14 rounded-lg" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ skeleton */

function NowSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-[22rem]" />
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
    </div>
  );
}
