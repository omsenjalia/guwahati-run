"use client";

import { useState } from "react";
import { ArrowSquareOut, Drop, ForkKnife, MapPinArea, Warning } from "@phosphor-icons/react";
import { EXPLORE, EXPLORE_RETURN_MARGIN_MIN, STATION_GUIDES } from "@/data/guides";
import { LEGS, PLACES } from "@/data/trip";
import { Panel, PanelTitle, Skeleton, StatusPill } from "@/components/bits";
import { Countdown } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { ECATERING_URL, planMeals } from "@/lib/meal-planner";
import { MIN, hhmm, ms, stamp } from "@/lib/time";
import { buildSteps } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";

type Tab = "stations" | "food" | "explore";
const TABS: { id: Tab; label: string }[] = [
  { id: "stations", label: "Stations" },
  { id: "food", label: "Food" },
  { id: "explore", label: "Explore" },
];

export function GuideView() {
  const now = useNow();
  const [tab, setTab] = useState<Tab>("stations");
  if (now === null) return <Skeleton className="h-96" />;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Guides</h1>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("h-11 rounded-lg text-[0.95rem] font-medium", tab === t.id ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "stations" && <Stations />}
      {tab === "food" && <Food now={now} />}
      {tab === "explore" && <Explore now={now} />}
    </div>
  );
}

/* ------------------------------------------------------------ stations */

function Stations() {
  return (
    <>
      {STATION_GUIDES.map((g) => {
        const p = PLACES[g.id];
        return (
          <Panel key={g.id}>
            <PanelTitle aside={<span className="font-mono text-sm text-muted-foreground">{p.code}</span>}>{p.name}</PanelTitle>
            <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-[0.95rem] leading-snug">
              <dt className="text-muted-foreground">Exit</dt>
              <dd>{g.exit}</dd>
              <dt className="text-muted-foreground">Getting on</dt>
              <dd>{g.transport}</dd>
              <dt className="text-muted-foreground">Food</dt>
              <dd>{g.food}</dd>
              <dt className="text-muted-foreground">Facilities</dt>
              <dd>{g.facilities}</dd>
            </dl>
            {g.tip && <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm leading-snug text-accent-foreground">{g.tip}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " railway station")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium"
              >
                <MapPinArea className="size-4" /> Map
              </a>
              {g.verify && <span className="text-xs text-subtle">Worth a quick check on the map</span>}
            </div>
          </Panel>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- food */

function Food({ now }: { now: number }) {
  const live = useLive();
  const { meals, water } = planMeals(live);
  if (!meals.length) {
    return (
      <Panel className="border-dashed bg-transparent">
        <p className="text-[0.95rem] text-muted-foreground">Train timetables haven&apos;t synced yet. They update daily.</p>
      </Panel>
    );
  }
  const upcoming = meals.filter((m) => m.at > now - 30 * MIN);
  return (
    <>
      <Panel>
        <PanelTitle aside={<ForkKnife className="size-5 text-subtle" />}>Meals on the train</PanelTitle>
        <p className="text-sm text-muted-foreground">
          Best stop near each mealtime (longest halt), adjusted for delays. Order IRCTC e-catering at least 2 hours ahead, with PNR and coach.
        </p>
        <ul className="mt-3 flex flex-col">
          {upcoming.map((m) => {
            const leg = LEGS.find((l) => l.id === m.legId)!;
            const orderSoon = m.orderBy > now && m.orderBy - now < 3 * 3600_000;
            return (
              <li key={`${m.legId}-${m.at}`} className="border-t py-2.5 first:border-t-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">
                    {m.meal} <span className="font-normal text-muted-foreground">at {m.station}</span>
                  </p>
                  <span className="font-mono text-sm tabular">{stamp(m.at)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {leg.train?.name}, {m.haltMin} min halt. Order by {hhmm(m.orderBy)}.
                </p>
                {orderSoon && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warn">
                    <Warning className="size-3.5" weight="bold" />
                    Order in <Countdown to={m.orderBy} now={now} className="text-xs" />
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <a
          href={ECATERING_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground active:scale-[0.98]"
        >
          IRCTC e-catering <ArrowSquareOut className="size-4" />
        </a>
        <p className="mt-2 text-center text-xs text-subtle">Or call 1323</p>
      </Panel>

      {water.length > 0 && (
        <Panel>
          <PanelTitle aside={<Drop className="size-5 text-subtle" />}>Water refills</PanelTitle>
          <p className="text-sm text-muted-foreground">Long halts to buy sealed Rail Neer and snacks. Keep 2 litres each on the long legs.</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[0.95rem]">
            {water
              .filter((w) => w.at > now)
              .map((w) => (
                <li key={`${w.legId}-${w.at}`} className="flex justify-between gap-3">
                  <span>{w.station}</span>
                  <span className="font-mono text-sm text-muted-foreground tabular">
                    {stamp(w.at)}, {w.haltMin} min
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* ------------------------------------------------------------- explore */

function Explore({ now }: { now: number }) {
  const live = useLive();
  const train = buildSteps(live).find((s) => s.id === "L3")!;
  const beAtStation = train.start - EXPLORE_RETURN_MARGIN_MIN * MIN;
  const freeFrom = ms("2026-11-01T11:00:00+05:30");
  const late = train.start - train.plannedStart >= 5 * MIN;
  return (
    <>
      <Panel>
        <PanelTitle>Free time on 1 Nov</PanelTitle>
        <p className="text-[0.95rem] leading-snug">
          From {hhmm(freeFrom)} until the Brahmaputra Express at {hhmm(train.start)}
          {late && <span className="text-warn"> (running late, was {hhmm(train.plannedStart)})</span>}. Be at Kamakhya by{" "}
          <span className="font-mono font-semibold tabular">{hhmm(beAtStation)}</span> with bags.
        </p>
        <p className="mt-2 text-xs text-subtle">Leave-by times move automatically if the train is late.</p>
      </Panel>
      {EXPLORE.map((e) => {
        const leaveBy = beAtStation - e.toKyqMin * MIN;
        const arriveBy = leaveBy - e.stayMin * MIN;
        const fits = Math.max(now, freeFrom) <= arriveBy;
        const gone = now > leaveBy;
        return (
          <Panel key={e.name}>
            <PanelTitle aside={<StatusPill health={gone ? "red" : fits ? "green" : "amber"}>{gone ? "Too late" : fits ? "Fits" : "Tight"}</StatusPill>}>
              {e.name}
            </PanelTitle>
            <p className="text-[0.95rem] leading-snug text-muted-foreground">{e.why}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Spend</dt>
                <dd className="font-mono font-semibold tabular">{e.stayMin} min</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">To Kamakhya</dt>
                <dd className="font-mono font-semibold tabular">{e.toKyqMin} min</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Leave by</dt>
                <dd className="font-mono font-semibold tabular">{hhmm(leaveBy)}</dd>
              </div>
            </dl>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.mapsQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium"
            >
              <MapPinArea className="size-4" /> Map
            </a>
          </Panel>
        );
      })}
    </>
  );
}
