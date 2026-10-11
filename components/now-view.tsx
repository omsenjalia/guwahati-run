"use client";

import { Skeleton } from "@/components/bits";
import { BeforeTrip } from "@/components/now/before";
import { AfterTrip, ArrivalReminder, FreeTime, HackathonPhase } from "@/components/now/event";
import { TravelDay } from "@/components/now/travel";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { inFreeTime, phaseAt } from "@/lib/phases";

/**
 * Home screen. Switches by IST date and time (lib/phases.ts):
 * A before the trip, B onward travel, C hackathon, D free time then the
 * trains home, E after the trip. The SOS button is in the top bar on every phase.
 */
export function NowView() {
  const now = useNow();
  const live = useLive();
  if (now === null) return <NowSkeleton />;
  const phase = phaseAt(now);

  return (
    <div className="flex flex-col gap-3">
      {phase === "before" && <BeforeTrip now={now} live={live} />}
      {phase === "travel" && <TravelDay now={now} live={live} direction="out" />}
      {phase === "hackathon" && <HackathonPhase now={now} />}
      {phase === "return" &&
        (inFreeTime(now, live) ? (
          <FreeTime now={now} live={live} />
        ) : (
          <>
            <TravelDay now={now} live={live} direction="back" />
            <ArrivalReminder />
          </>
        ))}
      {phase === "after" && <AfterTrip live={live} />}
    </div>
  );
}

function NowSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-[22rem]" />
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
    </div>
  );
}
