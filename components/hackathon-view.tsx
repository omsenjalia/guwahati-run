"use client";

import { EVENT } from "@/data/trip";
import { Panel, Skeleton } from "@/components/bits";
import { Countdown } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { ms, stamp } from "@/lib/time";

export function HackathonView() {
  const now = useNow();
  if (now === null) return <Skeleton className="h-64" />;
  const start = ms(EVENT.start);
  const end = ms(EVENT.end);
  const live = now >= start && now < end;
  const target = now < start ? start : end;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Hackathon</h1>
      <Panel className="p-5">
        <p className="text-sm text-muted-foreground">{now < start ? "Starts in" : live ? "Ends in" : "Finished"}</p>
        {now < end && <Countdown to={target} now={now} className="mt-1 block text-[2.75rem] leading-none" />}
        <p className="mt-4 text-lg font-semibold">{EVENT.name}</p>
        <p className="text-sm text-muted-foreground">{EVENT.venue}</p>
        <p className="mt-1 font-mono text-sm tabular text-muted-foreground">
          {stamp(start)} to {stamp(end)}
        </p>
      </Panel>
    </div>
  );
}
