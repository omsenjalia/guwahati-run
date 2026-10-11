"use client";

import { ArrowSquareOut, ForkKnife } from "@phosphor-icons/react";
import { LEGS, PLACES, type Leg } from "@/data/trip";
import { CopyChip, LiveStamp, Panel, PanelTitle } from "@/components/bits";
import { Countdown, Route, TimeRange, personName } from "@/components/leg-bits";
import { CheckinPanel } from "@/components/checkin-panel";
import { NePlanB } from "@/components/plan-b";
import { TransferPlanCard } from "@/components/transfer-plan";
import { ConnectionPlanB, DeadlinePanel, WeatherPanel, softButton } from "@/components/now/shared";
import { checkpointLabel } from "@/lib/checkins";
import type { LiveState } from "@/lib/live-types";
import { ECATERING_URL, planMeals } from "@/lib/meal-planner";
import { useMe } from "@/lib/me";
import { ROUTE_BACK, ROUTE_OUT, journeyProgress } from "@/lib/phases";
import { duration, hhmm, stamp } from "@/lib/time";
import { planTransfers, type TransferPlan } from "@/lib/transfer-planner";
import {
  buildSteps,
  computeNow,
  legBerths,
  legPassengers,
  parseStatus,
  tripHealth,
  type NowState,
  type Step,
} from "@/lib/trip-engine";
import { cn } from "@/lib/utils";

/** Phase B (and the return half of D): the current or next step, seats, next action, transfer. */
export function TravelDay({ now, live, direction }: { now: number; live: LiveState; direction: "out" | "back" }) {
  const steps = buildSteps(live);
  const state = computeNow(steps, now);
  const health = tripHealth(live, now);
  // The train we're on, or the next one.
  const trainStep =
    [state.current, state.focus, state.next].find((s) => s?.kind === "train" || s?.kind === "local-train") ??
    steps.find((s) => !s.minor && (s.kind === "train" || s.kind === "local-train") && s.end > now);
  const plan = nextTransfer(state, live, now);

  return (
    <>
      <TravelHero state={state} now={now} live={live} />
      <ConnectionPlanB health={health} now={now} />
      {direction === "out" && <NePlanB live={live} now={now} compact />}
      {plan && <NextAction plan={plan} now={now} />}
      {trainStep?.leg && trainStep.leg.passengers?.length ? <OurSeats leg={trainStep.leg} live={live} /> : null}
      <JourneyBar steps={steps} now={now} direction={direction} />
      {trainStep?.leg && <FoodStations leg={trainStep.leg} live={live} now={now} />}
      <CheckinPanel place={checkpointLabel(state)} now={now} />
      <DeadlinePanel now={now} live={live} />
      <WeatherPanel focus={state.focus} mode={state.focusMode} />
    </>
  );
}

/* ---------------------------------------------------------------- hero */

function TravelHero({ state, now, live }: { state: NowState; now: number; live: LiveState }) {
  const step = state.focus;
  if (!step) return null;
  const leg = step.leg;
  const onTrain = state.focusMode === "active" && (step.kind === "train" || step.kind === "local-train");
  const legLive = leg ? live.legs[leg.id] : undefined;
  const headline = onTrain
    ? `On ${leg?.train?.name} · next: ${PLACES[step.to!].short} ${hhmm(step.end)}`
    : state.focusMode === "active"
      ? step.title
      : `Next: ${step.title}`;

  return (
    <Panel className="relative overflow-hidden p-5">
      <p className="text-sm font-medium text-muted-foreground">{state.focusMode === "active" ? "Right now" : "Next up"}</p>
      <p className="mt-1 text-xl font-semibold leading-snug tracking-tight">{headline}</p>
      {state.countdownTo && (
        <div className="mt-3">
          <Countdown to={state.countdownTo} now={now} className="text-[2.5rem] leading-none" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            {state.countdownLabel} <span className="font-mono tabular text-foreground">{stamp(state.countdownTo)}</span>
          </p>
        </div>
      )}
      <div className="mt-4 border-t pt-3">
        {leg && leg.kind !== "transfer" && <Route leg={leg} className="text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">
          <TimeRange start={step.start} end={step.end} />
          {step.approx && <span className="ml-1.5">(approx.)</span>}
        </p>
        <Delay step={step} />
        {legLive?.lastStation && onTrain && now - (legLive.liveUpdatedAt ?? 0) < 30 * 60_000 && <p className="mt-0.5 text-sm text-muted-foreground">Near {legLive.lastStation}</p>}
      </div>
      <p className="mt-3 text-[1.05rem] font-medium leading-snug text-primary">{state.instruction}</p>
      {leg?.pnr && (leg.kind === "train" || leg.kind === "local-train") && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <CopyChip value={leg.pnr} label="PNR" />
          <div className="text-right">
            {legLive?.platform && !onTrain && <p className="text-sm font-semibold">Platform {legLive.platform}</p>}
            <LiveStamp updatedAt={legLive?.liveUpdatedAt} stale={legLive?.stale} fallback="Live times from 3h before departure" />
          </div>
        </div>
      )}
    </Panel>
  );
}

function Delay({ step }: { step: Step }) {
  const late = Math.round((step.end - step.plannedEnd) / 60000);
  if (Math.abs(late) < 5) return <p className="mt-0.5 text-sm font-medium text-ok">On time</p>;
  return (
    <p className={cn("mt-0.5 text-sm font-medium", late > 0 ? "text-warn" : "text-ok")}>
      {late > 0 ? `Running ${duration(late * 60000)} late` : `${duration(-late * 60000)} early`}
      <span className="ml-1.5 font-normal text-muted-foreground">
        (ETA {hhmm(step.end)}, was {hhmm(step.plannedEnd)})
      </span>
    </p>
  );
}

/* --------------------------------------------------------- next action */

/** The transfer we're in, or the one right after the train we're on (within 6 hours). */
function nextTransfer(state: NowState, live: LiveState, now: number) {
  const plans = planTransfers(live);
  const leg = state.focus?.leg;
  if (leg?.kind === "transfer") return plans.find((p) => p.legId === leg.id);
  const i = LEGS.findIndex((l) => l.id === leg?.id);
  const after = LEGS[i + 1];
  if (after?.kind !== "transfer") return undefined;
  const p = plans.find((x) => x.legId === after.id);
  return p && p.start - now < 6 * 3600_000 ? p : undefined;
}

function NextAction({ plan, now }: { plan: TransferPlan; now: number }) {
  const leg = LEGS.find((l) => l.id === plan.legId)!;
  const from = PLACES[leg.from].short;
  const to = PLACES[leg.to].short;
  const how = plan.mode === "metro" ? `metro to ${to}` : `${plan.route.toLowerCase()} to ${to}`;
  return (
    <Panel className="border-primary/30">
      <PanelTitle>Next action</PanelTitle>
      <p className="text-[1.05rem] font-semibold leading-snug">
        Get off at {from}, then {how}
        {plan.leaveBy !== undefined ? `, leave by ${hhmm(plan.leaveBy)}` : ""}.
      </p>
      <TransferPlanCard plan={plan} now={now} className="mt-3" />
    </Panel>
  );
}

/* --------------------------------------------------------------- seats */

function OurSeats({ leg, live }: { leg: Leg; live: LiveState }) {
  const me = useMe();
  const berths = legBerths(leg, live);
  const pax = legPassengers(leg, live);
  return (
    <Panel>
      <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground tabular">{leg.train?.number}</span>}>
        Our seats
      </PanelTitle>
      <ul className="grid grid-cols-2 gap-2">
        {pax.map((p) => {
          const b = berths.find((x) => x.person === p.person);
          const s = parseStatus(p.current);
          return (
            <li key={p.person} className={cn("rounded-lg bg-secondary px-3 py-2.5", p.person === me && "ring-2 ring-primary/50")}>
              <p className="text-xs text-muted-foreground">{personName(p.person)}</p>
              <p className={cn("font-mono text-lg font-semibold tabular", s.kind === "WL" && !b && "text-warn")}>
                {b ? `${b.coach}/${b.berth}` : s.label}
              </p>
              {b && <p className="text-xs text-muted-foreground">{b.type}</p>}
            </li>
          );
        })}
      </ul>
      {!berths.length && pax.some((p) => parseStatus(p.current).kind === "RAC") && (
        <p className="mt-2 text-xs text-subtle">RAC: coach and seat show on the chart. Ask the TTE for a vacant berth after departure.</p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------- journey bar */

function JourneyBar({ steps, now, direction }: { steps: Step[]; now: number; direction: "out" | "back" }) {
  const stops = direction === "out" ? ROUTE_OUT : ROUTE_BACK;
  const legIds = direction === "out" ? ["L0", "L1", "L2"] : ["L3", "L4"];
  const legs = LEGS.filter((l) => legIds.includes(l.id));
  const total = legs.reduce((t, l) => t + (l.km ?? 0), 0);
  // Station positions by distance along the route.
  let acc = 0;
  const marks = [0, ...legs.map((l) => (acc += l.km ?? 0) / total)];
  const where = journeyProgress(steps, now, direction);
  const atStops = direction === "out" ? [marks[0], marks[1], marks[2], marks[3]] : [marks[0], marks[1], marks[2]];
  return (
    <Panel>
      <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground tabular">{Math.round(where * total)} / {total} km</span>}>
        Journey
      </PanelTitle>
      <div className="relative mx-2 mt-2 h-2 rounded-full bg-secondary">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${where * 100}%` }} />
        {atStops.map((m, i) => (
          <span
            key={stops[i]}
            className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card", where >= m - 0.001 ? "bg-primary" : "bg-muted-foreground/40")}
            style={{ left: `${m * 100}%` }}
          />
        ))}
        <span
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-primary shadow"
          style={{ left: `${where * 100}%` }}
          aria-label={`${Math.round(where * 100)}% of the way`}
        />
      </div>
      <div className="relative mt-3 h-4 text-xs text-muted-foreground">
        {atStops.map((m, i) => (
          <span
            key={stops[i]}
            className={cn("absolute whitespace-nowrap", i === 0 ? "left-0" : i === atStops.length - 1 ? "right-0" : "-translate-x-1/2")}
            style={i === 0 || i === atStops.length - 1 ? undefined : { left: `${m * 100}%` }}
          >
            {PLACES[stops[i]].short}
          </span>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ food */

function FoodStations({ leg, live, now }: { leg: Leg; live: LiveState; now: number }) {
  const { meals } = planMeals(live);
  const upcoming = meals.filter((m) => m.legId === leg.id && m.at > now).slice(0, 3);
  if (!upcoming.length) return null;
  return (
    <Panel>
      <PanelTitle aside={<ForkKnife className="size-5 text-subtle" />}>Food stations</PanelTitle>
      <ul className="flex flex-col gap-2">
        {upcoming.map((m) => (
          <li key={`${m.code}-${m.at}`} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[0.95rem] font-medium">
                {m.meal}: {m.station}
              </span>
              <span className="block text-xs text-muted-foreground">
                {m.haltMin} min halt · order by {hhmm(m.orderBy)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm tabular">{hhmm(m.at)}</span>
          </li>
        ))}
      </ul>
      <a href={ECATERING_URL} target="_blank" rel="noreferrer" className={cn(softButton, "mt-3 w-full")}>
        Order on IRCTC e-catering
        <ArrowSquareOut className="size-4" />
      </a>
      <p className="mt-2 text-xs text-subtle">Our PNR: {leg.pnr}. Delivered to your seat at the station.</p>
    </Panel>
  );
}
