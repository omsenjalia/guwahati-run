"use client";

import Link from "next/link";
import { Bed, FilePdf, HandCoins, MapPinArea, PencilSimpleLine } from "@phosphor-icons/react";
import { BLOCKS, EVENT, EVENT_SCHEDULE, LEGS, PLACES, REST_PLAN, VENUE_NOTES } from "@/data/trip";
import { IIT_TO_KYQ_MIN, returnLeaveBy } from "@/lib/phases";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { Countdown, personName } from "@/components/leg-bits";
import { DeadlinePanel, ForecastPanel, linkButton, softButton } from "@/components/now/shared";
import type { LiveState } from "@/lib/live-types";
import { useMe } from "@/lib/me";
import { HOUR, MIN, hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import { buildSteps } from "@/lib/trip-engine";
import { useDocuments } from "@/lib/receipts";
import { reportRows, reportTotals } from "@/lib/report-data";
import { useExpenses } from "@/lib/use-expenses";
import { cn } from "@/lib/utils";

/* =========================================================== Phase C */

const SUBMISSION = EVENT_SCHEDULE.find((s) => /submission/i.test(s.title));
const JUDGING = EVENT_SCHEDULE.find((s) => /judging/i.test(s.title));

/** Phase C: 30 Oct evening to 1 Nov 10:00. */
export function HackathonPhase({ now }: { now: number }) {
  const me = useMe();
  const start = ms(EVENT.start);
  const started = now >= start;
  const target = !started ? { at: start, label: "Reporting and start" } : SUBMISSION && ms(SUBMISSION.at) > now ? { at: ms(SUBMISSION.at), label: "Submission" } : JUDGING && ms(JUDGING.at) > now ? { at: ms(JUDGING.at), label: "Judging" } : { at: ms(EVENT.end), label: "Event ends" };
  const nextItem = EVENT_SCHEDULE.find((s) => ms(s.at) > now);
  const slot = REST_PLAN.find((r) => now >= ms(r.start) && now < ms(r.end));
  const nextSlot = REST_PLAN.find((r) => ms(r.start) > now);

  return (
    <>
      <Panel className="p-5">
        <p className="text-sm font-medium text-muted-foreground">
          {EVENT.name} @ {EVENT.venue}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{target.label} in</p>
        <Countdown to={target.at} now={now} className="text-[2.75rem] leading-none" />
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="tabular text-foreground">{stamp(target.at)}</span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
          <Fact label="Submission" value={SUBMISSION ? `${stamp(SUBMISSION.at)}${SUBMISSION.tbc ? " (tbc)" : ""}` : "tbc"} />
          <Fact label="Judging" value={JUDGING ? `${stamp(JUDGING.at)}${JUDGING.tbc ? " (tbc)" : ""}` : "tbc"} />
        </dl>
        {nextItem && (
          <p className="mt-3 text-[0.95rem]">
            Next: <span className="font-semibold">{nextItem.title}</span> at <span className="tabular">{hhmm(nextItem.at)}</span>
            {nextItem.tbc && <span className="text-muted-foreground"> (tbc)</span>}
          </p>
        )}
        <Link href="/hackathon" className={cn(linkButton, "mt-4 w-full")}>
          Open the team board
        </Link>
      </Panel>

      <Panel>
        <PanelTitle aside={<Bed className="size-5 text-subtle" />}>Rest schedule</PanelTitle>
        {slot ? (
          <p className="mb-3 rounded-lg bg-accent/50 px-3 py-2.5 text-[0.95rem]">
            Resting now: <span className="font-semibold">{slot.resting.map(personName).join(" and ")}</span> until {hhmm(slot.end)}.
            {me && slot.resting.includes(me) && " That's you: sleep."}
          </p>
        ) : nextSlot ? (
          <p className="mb-3 text-sm text-muted-foreground">
            First rest at {hhmm(nextSlot.start)}: {nextSlot.resting.map(personName).join(" and ")}.
          </p>
        ) : null}
        <ul className="flex flex-col gap-1.5">
          {REST_PLAN.map((r) => (
            <li key={r.start} className={cn("flex justify-between gap-3 text-sm", ms(r.end) <= now && "text-subtle line-through")}>
              <span className="tabular">
                {hhmm(r.start)}-{hhmm(r.end)}
              </span>
              <span>{r.resting.map(personName).join(", ")}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelTitle>Venue notes</PanelTitle>
        <dl className="flex flex-col gap-2 text-[0.95rem]">
          {Object.entries(VENUE_NOTES)
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-14 shrink-0 text-sm capitalize text-muted-foreground">{k === "wifi" ? "Wi-Fi" : k}</dt>
                <dd className="leading-snug">{v}</dd>
              </div>
            ))}
        </dl>
      </Panel>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2.5">
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 tabular text-sm font-semibold">{value}</dd>
    </div>
  );
}

/* =========================================================== Phase D */

const L3 = LEGS.find((l) => l.id === "L3")!;
const L4 = LEGS.find((l) => l.id === "L4")!;
const PICKUP = BLOCKS.find((b) => b.kind === "pickup");

/** Phase D, before the Brahmaputra: free time with a hard "leave IIT by". */
export function FreeTime({ now, live }: { now: number; live: LiveState }) {
  const { depart, atStation, leaveIit, leaveTemple, temple: TEMPLE } = returnLeaveBy(live);
  const late = depart - ms(L3.depart) >= 5 * MIN;

  return (
    <>
      <Panel className="p-5">
        <p className="text-sm font-medium text-muted-foreground">Free time in Guwahati · train {L3.train?.number} at {hhmm(depart)}</p>
        <p className="mt-3 text-sm text-muted-foreground">Leave IIT by</p>
        <p className="tabular text-[2.75rem] font-semibold leading-none">{hhmm(leaveIit)}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <Countdown to={leaveIit} now={now} className="text-sm text-foreground" /> left
          {late && <span className="text-warn"> · train running late, times adjusted</span>}
        </p>
        <p className="mt-4 border-t pt-3 text-[0.95rem] leading-snug">
          Cab to Kamakhya station takes about {IIT_TO_KYQ_MIN} min. Be on the platform by {hhmm(atStation)}.
        </p>
        <Link href="/guide" className={cn(softButton, "mt-3 w-full")}>
          Explore ideas and leave-by times
        </Link>
      </Panel>

      <Panel>
        <PanelTitle aside={<MapPinArea className="size-5 text-subtle" />}>Last stop: Kamakhya Temple</PanelTitle>
        <p className="text-[0.95rem] leading-snug">
          It&apos;s close to the station (about {TEMPLE.toKyqMin} min by cab), so it&apos;s the natural last stop with bags. Leave the
          temple by <span className="tabular font-semibold">{hhmm(leaveTemple)}</span>.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{TEMPLE.why}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(TEMPLE.mapsQuery)}`}
          target="_blank"
          rel="noreferrer"
          className={cn(softButton, "mt-3 w-full")}
        >
          Open in Maps
        </a>
      </Panel>

      <ArrivalReminder />
      <DeadlinePanel now={now} live={live} />
      <ForecastPanel place="KYQ" days={["2026-11-01", "2026-11-02", "2026-11-03"]} title="Weather on the way home" />
    </>
  );
}

/** The 01:42 arrival at Anand and how we get home. */
export function ArrivalReminder() {
  return (
    <Panel>
      <PanelTitle>Home stretch</PanelTitle>
      <p className="text-[0.95rem] leading-snug">
        {L4.train?.name} reaches {PLACES.ANND.short} at{" "}
        <span className="tabular font-semibold">
          {weekdayDate(L4.arrive)} {hhmm(L4.arrive)}
        </span>
        .
      </p>
      {PICKUP?.notes?.map((n) => (
        <p key={n} className="mt-1 text-sm text-muted-foreground">
          {n}
        </p>
      ))}
    </Panel>
  );
}

/* =========================================================== Phase E */

/** Phase E: trip complete, with the three things left to do. */
export function AfterTrip({ live }: { live: LiveState }) {
  const { items } = useExpenses();
  const { docs } = useDocuments();
  const trains = buildSteps(live).filter((s) => s.kind === "train");
  const km = LEGS.reduce((t, l) => t + (l.km ?? 0), 0);
  const hours = Math.round(trains.reduce((t, s) => t + (s.end - s.start), 0) / HOUR);
  const total = items ? reportTotals(reportRows(items, docs ?? null)).total : null;

  return (
    <>
      <Panel className="p-5">
        <p className="text-2xl font-semibold tracking-tight">Trip complete</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {EVENT.name} @ {EVENT.venue}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="By train" value={`${km.toLocaleString("en-IN")} km`} />
          <Stat label="On trains" value={`${hours} h`} />
          <Stat label="Total spent" value={total !== null ? `₹${Math.round(total).toLocaleString("en-IN")}` : "..."} />
        </dl>
        {!items && <Skeleton className="mt-3 h-10 rounded-lg" />}
      </Panel>
      <div className="flex flex-col gap-2">
        <Link href="/grant#report" className={cn(linkButton, "h-14 text-base")}>
          <FilePdf className="size-5" />
          Generate final report (PDF)
        </Link>
        <a href="https://secure.splitwise.com/" target="_blank" rel="noreferrer" className={cn(softButton, "h-14 text-base")}>
          <HandCoins className="size-5" />
          Settle up in Splitwise
        </a>
        <Link href="/journal#post" className={cn(softButton, "h-14 text-base")}>
          <PencilSimpleLine className="size-5" />
          Write recap post
        </Link>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2.5">
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 tabular text-[1.05rem] font-semibold">{value}</dd>
    </div>
  );
}
