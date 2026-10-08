"use client";

import { useEffect } from "react";
import { DEADLINES, EVENT, LEGS, PLACES, REMINDERS, TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { personName, statusSummary } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useLive } from "@/lib/live-store";
import { startSync } from "@/lib/sync";
import { hhmm, ms, stamp } from "@/lib/time";
import { buildSteps } from "@/lib/trip-engine";

/**
 * One printable page with everything needed if every phone dies:
 * tickets, berths, times, transfers, deadlines, contacts. Light theme only.
 */
export function PrintView() {
  const now = useNow();
  const live = useLive();
  useEffect(() => startSync(), []);
  if (now === null) return null;
  const steps = buildSteps(live).filter((s) => !s.minor);

  return (
    <main className="print-page mx-auto max-w-3xl bg-white px-4 py-6 text-[13px] leading-snug text-zinc-900 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <a href="/team" className="text-sm text-zinc-600 underline">
          Back
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
        >
          Print or save as PDF
        </button>
      </div>

      <header className="flex items-baseline justify-between border-b-2 border-zinc-900 pb-1">
        <h1 className="text-lg font-bold">Guwahati Run: paper backup</h1>
        <p className="text-[11px] text-zinc-600">Printed {stamp(now)} IST. Statuses as of then.</p>
      </header>

      <section className="mt-3">
        <h2 className="font-bold">Itinerary</h2>
        <table className="mt-1 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-400 text-[11px] uppercase text-zinc-600">
              <th className="py-1 pr-2">When</th>
              <th className="py-1 pr-2">What</th>
              <th className="py-1 pr-2">Route</th>
              <th className="py-1">PNR, status</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => {
              const leg = s.leg;
              const l = leg ? live.legs[leg.id] : undefined;
              return (
                <tr key={s.id} className="border-b border-zinc-200 align-top">
                  <td className="py-1 pr-2 font-mono whitespace-nowrap">
                    {stamp(s.start)}
                    <br />
                    <span className="text-zinc-600">to {hhmm(s.end)}</span>
                  </td>
                  <td className="py-1 pr-2">
                    <b>{s.title}</b>
                    {leg?.travelClass && ` (${leg.travelClass})`}
                    {leg?.modeHint && <div className="text-zinc-600">{leg.modeHint}</div>}
                  </td>
                  <td className="py-1 pr-2">
                    {leg ? `${PLACES[leg.from].name} to ${PLACES[leg.to].name}` : s.place ? PLACES[s.place].name : ""}
                    {l?.platform && <div className="text-zinc-600">Platform {l.platform}</div>}
                  </td>
                  <td className="py-1 font-mono">
                    {leg?.pnr ?? ""}
                    {leg?.pnr && <div>{statusSummary(leg, live)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-4 print:grid-cols-2">
        <div>
          <h2 className="font-bold">Deadlines (owner: {personName(DEADLINES[0].owner)})</h2>
          <ul className="mt-1">
            {DEADLINES.map((d) => (
              <li key={d.id} className="border-b border-zinc-200 py-0.5">
                <span className="font-mono">{stamp(ms(d.at))}</span> {d.title}
              </li>
            ))}
          </ul>
          <h2 className="mt-3 font-bold">Hackathon</h2>
          <p>
            {EVENT.name}, {EVENT.venue}. {stamp(ms(EVENT.start))} to {stamp(ms(EVENT.end))}.
          </p>
          <h2 className="mt-3 font-bold">Remember</h2>
          <ul className="mt-1 list-disc pl-4">
            {REMINDERS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-bold">Team</h2>
          <ul className="mt-1">
            {TEAM.map((p) => (
              <li key={p.id} className="border-b border-zinc-200 py-0.5">
                <b>{p.name}</b> ({p.age}) {p.phone || "phone: ________"}
                <div className="text-zinc-600">
                  {p.guardian.name || "Guardian: ________"} {p.guardian.phone}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <b>Anand 4 Nov 01:42:</b> Rapido or auto home, stay together
          </p>
          <h2 className="mt-3 font-bold">Numbers</h2>
          <ul className="mt-1">
            {USEFUL_NUMBERS.map((n) => (
              <li key={n.number}>
                <span className="font-mono font-bold">{n.number}</span> {n.label}
              </li>
            ))}
            <li>
              PNR by SMS: text <span className="font-mono">PNR &lt;number&gt;</span> to <b>139</b>
            </li>
          </ul>
          {LEGS.some((l) => l.berths?.length) && (
            <>
              <h2 className="mt-3 font-bold">Garib Rath berths</h2>
              <p>
                {(live.legs.L4?.berths ?? LEGS.find((l) => l.id === "L4")?.berths ?? [])
                  .map((b) => `${personName(b.person)} ${b.coach}/${b.berth} ${b.type}`)
                  .join(", ")}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
