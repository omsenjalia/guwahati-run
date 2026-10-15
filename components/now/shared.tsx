"use client";

import Link from "next/link";
import { ArrowSquareOut, CloudSun } from "@phosphor-icons/react";
import { CONNECTIONS, DEADLINES, LEGS, PLACES, TATKAL_BOOKER, type PlaceId } from "@/data/trip";
import { LiveStamp, Panel, PanelTitle, Skeleton, StatusPill } from "@/components/bits";
import { Countdown, personName } from "@/components/leg-bits";
import { evaluate } from "@/lib/deadline-rules";
import type { LiveState } from "@/lib/live-types";
import { useWeather } from "@/lib/use-weather";
import { describeWeather } from "@/lib/weather";
import { duration, hhmm, ms, weekdayDate } from "@/lib/time";
import { canBoard, type Step, type tripHealth } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";

export const linkButton =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 text-[0.95rem] font-medium text-primary-foreground transition active:scale-[0.98]";
/** Quiet "go to" link at the foot of a card (instead of another full-width button). */
export const moreLink =
  "-mb-1 mt-4 inline-flex min-h-11 items-center gap-1 self-start text-[0.95rem] font-medium text-primary active:opacity-70";
export const softButton =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 text-[0.95rem] font-medium active:scale-[0.98]";

/* ------------------------------------------------------------ deadline */

const VERDICT_PILL = {
  action: { health: "red", label: "Action needed" },
  upcoming: { health: "amber", label: "Watching" },
  ok: { health: "green", label: "No action" },
  passed: { health: "green", label: "Passed" },
} as const;

const NE = LEGS.find((l) => l.tracked)!;

/** The next date that still matters. North East rules drop out once it's seated. */
export function nextImportantDate(live: LiveState, now: number) {
  const neSettled = canBoard(NE, live) || (live.legs[NE.id]?.chartPrepared ?? false);
  return DEADLINES.find((d) => ms(d.at) > now && !(neSettled && d.leg === NE.id));
}

export function DeadlinePanel({ now, live }: { now: number; live: LiveState }) {
  const d = nextImportantDate(live, now);
  if (!d) return null;
  const at = ms(d.at);
  const soon = at - now < 2 * 3600_000;
  const verdict = evaluate(d, live, now);
  const pill = VERDICT_PILL[verdict.status];
  return (
    <Panel className={cn(verdict.status === "action" && "ring-1 ring-bad/50", soon && verdict.status !== "action" && "ring-1 ring-warn/40")}>
      <PanelTitle aside={<Countdown to={at} now={now} className={cn("text-[0.95rem]", soon && "text-warn")} />}>
        Next important date
      </PanelTitle>
      <p className="tabular text-sm text-muted-foreground">
        {weekdayDate(at)}, {hhmm(at)}
      </p>
      <p className="mt-0.5 text-[1.05rem] font-semibold leading-snug text-pretty">{d.title}</p>
      <div className="mt-4 flex items-start gap-3 border-t pt-4">
        <StatusPill health={pill.health} className="mt-px">
          {pill.label}
        </StatusPill>
        <p className="text-[0.95rem] leading-snug text-pretty">{verdict.message || d.condition}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Owner: <span className="font-medium text-foreground">{personName(d.owner)}</span>
          {d.owner === TATKAL_BOOKER && d.link ? " (Tatkal booker)" : ""}
        </p>
        {d.link && verdict.status !== "ok" && (
          <a href={d.link.href} target="_blank" rel="noreferrer" className={linkButton}>
            {d.link.label}
            <ArrowSquareOut className="size-4" />
          </a>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------- connection plan B */

/** Appears automatically when a Delhi connection turns amber or red (running delay). */
export function ConnectionPlanB({ health, now }: { health: ReturnType<typeof tripHealth>; now: number }) {
  const risky = health.conns.filter((c) => c.health !== "green" && c.outboundDepart > now);
  if (!risky.length) return null;
  return (
    <>
      {risky.map((c) => {
        const cfg = CONNECTIONS.find((x) => x.id === c.id)!;
        return (
          <Panel key={c.id} className={cn(c.health === "red" ? "ring-1 ring-bad/50 bg-bad-soft" : "ring-1 ring-warn/40 bg-warn-soft")}>
            <PanelTitle aside={<StatusPill health={c.health}>{duration(Math.max(0, c.bufferMin) * 60000)} spare</StatusPill>}>
              Plan B: {c.label}
            </PanelTitle>
            <p className="text-[0.95rem] leading-snug">{cfg.planB.text}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Who acts: <span className="font-medium text-foreground">{personName(cfg.planB.owner)}</span>
              </p>
              {cfg.planB.link && (
                <a href={cfg.planB.link.href} target="_blank" rel="noreferrer" className={linkButton}>
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

/** Where we are (or will be next) and where we're heading, today. */
export function WeatherPanel({ focus, mode }: { focus?: Step; mode: "upcoming" | "active" }) {
  const onTrain = mode === "active" && focus?.kind === "train";
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
          <p className="mt-0.5 tabular text-2xl font-semibold">{w.tempC}°</p>
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

/** Forecast for given days at one place (e.g. Guwahati, 30 Oct to 1 Nov). */
export function ForecastPanel({ place, days, title }: { place: PlaceId; days: string[]; title: string }) {
  const w = useWeather(place);
  const rows = days.map((d) => ({ date: d, f: w?.days?.find((x) => x.date === d) }));
  const any = rows.some((r) => r.f);
  return (
    <Panel>
      <PanelTitle aside={<CloudSun className="size-5 text-subtle" />}>{title}</PanelTitle>
      {!w ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : any ? (
        <div className="grid grid-cols-3 gap-2">
          {rows.map(({ date, f }) => (
            <div key={date} className="rounded-lg bg-secondary px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{weekdayDate(`${date}T12:00:00+05:30`)}</p>
              {f ? (
                <>
                  <p className="mt-0.5 tabular text-lg font-semibold">
                    {f.min}-{f.max}°
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {describeWeather(f.code)}
                    {f.rainChance >= 30 && <span className="block text-warn">Rain {f.rainChance}%</span>}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-subtle">Not yet</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">The forecast for these days appears about two weeks ahead.</p>
      )}
      {w && <LiveStamp updatedAt={w.fetchedAt} className="mt-2" />}
    </Panel>
  );
}

/* --------------------------------------------------------- tile link */

export function TileLink({ href, title, sub, children }: { href: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 flex-col justify-center rounded-lg bg-secondary px-3 py-2 active:scale-[0.99]">
      <span className="text-[0.95rem] font-semibold leading-snug">{title}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      {children}
    </Link>
  );
}
