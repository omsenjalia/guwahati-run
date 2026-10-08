"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bed, Pause, Play, Plus, Trash } from "@phosphor-icons/react";
import { EVENT, EVENT_SCHEDULE, REST_PLAN, TEAM, VENUE_NOTES } from "@/data/trip";
import { Panel, PanelTitle, Skeleton, StatusPill } from "@/components/bits";
import { ChecklistPanel } from "@/components/checklist-panel";
import { Countdown, personName } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useMe } from "@/lib/me";
import { hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import { useBoard, type Card, type CardStatus } from "@/lib/use-board";
import { cn } from "@/lib/utils";

export function HackathonView() {
  const now = useNow();
  if (now === null) return <Skeleton className="h-64" />;
  const start = ms(EVENT.start);
  const end = ms(EVENT.end);
  const live = now >= start && now < end;
  const submission = EVENT_SCHEDULE.find((s) => /submission/i.test(s.title));
  const nextItem = EVENT_SCHEDULE.find((s) => ms(s.at) > now);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Hackathon</h1>

      <Panel className="p-5">
        <p className="text-sm text-muted-foreground">
          {now < start ? "Hacking starts in" : live ? (submission && ms(submission.at) > now ? "Submission in" : "Ends in") : "Finished"}
        </p>
        {now < end && (
          <Countdown
            to={now < start ? start : submission && ms(submission.at) > now ? ms(submission.at) : end}
            now={now}
            className="mt-1 block text-[2.75rem] leading-none"
          />
        )}
        <p className="mt-4 text-lg font-semibold">{EVENT.name}</p>
        <p className="text-sm text-muted-foreground">
          {EVENT.venue}. {stamp(start)} to {stamp(end)}
        </p>
        {nextItem && (
          <p className="mt-3 text-[0.95rem] text-primary">
            Next: {nextItem.title} at {hhmm(ms(nextItem.at))}
            {nextItem.tbc ? " (tbc)" : ""}
          </p>
        )}
      </Panel>

      <RestPanel now={now} />
      <BoardPanel />
      <PitchTimer />
      <ChecklistPanel owner="demo" title="Demo day checklist" />

      <Panel>
        <PanelTitle>Schedule</PanelTitle>
        <ol className="flex flex-col">
          {EVENT_SCHEDULE.map((s) => {
            const t = ms(s.at);
            const past = t < now;
            return (
              <li key={s.at + s.title} className={cn("flex gap-3 py-1.5", past && "opacity-45")}>
                <span className="w-24 shrink-0 font-mono text-sm tabular">
                  {weekdayDate(t).split(",")[0]} {hhmm(t)}
                </span>
                <span className="text-[0.95rem]">
                  {s.title}
                  {s.tbc && <span className="ml-1 text-xs text-subtle">tbc</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel>
        <PanelTitle>Venue notes</PanelTitle>
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-[0.95rem]">
          <dt className="text-muted-foreground">Wi-Fi</dt>
          <dd>{VENUE_NOTES.wifi}</dd>
          <dt className="text-muted-foreground">Power</dt>
          <dd>{VENUE_NOTES.power}</dd>
          <dt className="text-muted-foreground">Food</dt>
          <dd>{VENUE_NOTES.food}</dd>
          {VENUE_NOTES.help && (
            <>
              <dt className="text-muted-foreground">Help</dt>
              <dd>{VENUE_NOTES.help}</dd>
            </>
          )}
        </dl>
        <ul className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
          {TEAM.map((p) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">{p.role || "Role not set"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- rest */

function RestPanel({ now }: { now: number }) {
  const me = useMe();
  const current = REST_PLAN.find((s) => now >= ms(s.start) && now < ms(s.end));
  const next = REST_PLAN.find((s) => ms(s.start) > now);
  const mine = me ? REST_PLAN.find((s) => s.resting.includes(me) && ms(s.end) > now) : undefined;
  if (!current && !next) return null;
  return (
    <Panel>
      <PanelTitle aside={<Bed className="size-5 text-subtle" />}>Rest rotation</PanelTitle>
      {current ? (
        <p className="text-[1.05rem] font-semibold">
          Resting now: {current.resting.map(personName).join(" and ")}
          <span className="block text-sm font-normal text-muted-foreground">Until {hhmm(ms(current.end))}. Keep it quiet.</span>
        </p>
      ) : (
        <p className="text-[0.95rem]">
          First rest slot {weekdayDate(ms(next!.start)).split(",")[0]} {hhmm(ms(next!.start))}:{" "}
          {next!.resting.map(personName).join(" and ")}
        </p>
      )}
      {mine && (
        <p className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          {mine === current
            ? `Your turn to sleep. Up at ${hhmm(ms(mine.end))}.`
            : `Your next rest: ${hhmm(ms(mine.start))} to ${hhmm(ms(mine.end))}`}
        </p>
      )}
      <ol className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {REST_PLAN.map((s) => (
          <li key={s.start} className={cn("rounded-lg bg-secondary px-3 py-2", s === current && "ring-1 ring-primary")}>
            <span className="font-mono tabular">
              {hhmm(ms(s.start))}-{hhmm(ms(s.end))}
            </span>
            <span className="block text-muted-foreground">{s.resting.map(personName).join(", ")}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/* --------------------------------------------------------------- board */

const COLUMNS: { id: CardStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

function BoardPanel() {
  const me = useMe();
  const { cards, add, move, remove } = useBoard();
  const [col, setCol] = useState<CardStatus>("todo");
  const [draft, setDraft] = useState("");
  const shown = cards?.filter((c) => c.status === col) ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await add(title, me).catch(() => setDraft(title));
    setCol("todo");
  }

  return (
    <Panel>
      <PanelTitle>Team board</PanelTitle>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {COLUMNS.map((c) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={col === c.id}
            onClick={() => setCol(c.id)}
            className={cn("h-10 rounded-lg text-sm font-medium", col === c.id ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {c.label} <span className="font-mono text-xs text-subtle">{cards?.filter((x) => x.status === c.id).length ?? 0}</span>
          </button>
        ))}
      </div>
      {!cards ? (
        <Skeleton className="mt-3 h-24 rounded-lg" />
      ) : (
        <ul className="mt-2 flex flex-col">
          {shown.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nothing here.</li>}
          {shown.map((c) => (
            <BoardCard key={c.id} card={c} onMove={move} onRemove={remove} />
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <label htmlFor="new-card" className="sr-only">
          New task
        </label>
        <input
          id="new-card"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New task"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary"
        />
        <button type="submit" aria-label="Add task" disabled={!draft.trim()} className="inline-flex size-11 items-center justify-center rounded-lg bg-secondary disabled:opacity-50">
          <Plus className="size-5" />
        </button>
      </form>
    </Panel>
  );
}

function BoardCard({ card, onMove, onRemove }: { card: Card; onMove: (c: Card, s: CardStatus) => void; onRemove: (c: Card) => void }) {
  const i = COLUMNS.findIndex((c) => c.id === card.status);
  const prev = COLUMNS[i - 1];
  const next = COLUMNS[i + 1];
  return (
    <li className="flex items-center gap-1 py-1">
      {prev && (
        <button type="button" aria-label={`Move to ${prev.label}`} onClick={() => onMove(card, prev.id)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-subtle active:bg-secondary">
          <ArrowLeft className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1 px-1">
        <p className={cn("text-[0.95rem] leading-snug", card.status === "done" && "text-muted-foreground line-through")}>{card.title}</p>
        {card.assignee && <p className="text-xs text-subtle">{personName(card.assignee)}</p>}
      </div>
      {card.status === "done" ? (
        <button type="button" aria-label={`Delete ${card.title}`} onClick={() => onRemove(card)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-subtle active:bg-secondary">
          <Trash className="size-4" />
        </button>
      ) : (
        next && (
          <button type="button" aria-label={`Move to ${next.label}`} onClick={() => onMove(card, next.id)} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-secondary px-3 text-sm font-medium active:scale-[0.98]">
            {next.label}
            <ArrowRight className="size-4" />
          </button>
        )
      )}
    </li>
  );
}

/* --------------------------------------------------------- pitch timer */

function PitchTimer() {
  const [length, setLength] = useState(180);
  const [left, setLeft] = useState(180);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          navigator.vibrate?.([300, 150, 300]);
          return 0;
        }
        if (l === 31) navigator.vibrate?.(150);
        return l - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <Panel>
      <PanelTitle aside={left <= 30 && left > 0 ? <StatusPill health="amber">Wrap up</StatusPill> : left === 0 ? <StatusPill health="red">Time</StatusPill> : null}>
        Pitch timer
      </PanelTitle>
      <p className={cn("text-center font-mono text-6xl font-semibold tabular", left <= 30 && "text-warn", left === 0 && "text-bad")}>
        {mm}:{ss}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[120, 180, 300].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setRunning(false);
              setLength(s);
              setLeft(s);
            }}
            className={cn("h-11 rounded-lg border text-sm font-medium", length === s ? "border-primary bg-accent text-accent-foreground" : "bg-secondary")}
          >
            {s / 60} min
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (left === 0) setLeft(length);
            setRunning((r) => !r);
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground active:scale-[0.98]"
        >
          {running ? <Pause className="size-5" weight="fill" /> : <Play className="size-5" weight="fill" />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(length);
          }}
          className="h-12 rounded-lg bg-secondary font-medium active:scale-[0.98]"
        >
          Reset
        </button>
      </div>
    </Panel>
  );
}
