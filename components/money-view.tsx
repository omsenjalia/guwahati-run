"use client";

import { LEGS, TRIP } from "@/data/trip";
import { Panel, PanelTitle } from "@/components/bits";
import { Route } from "@/components/leg-bits";
import { farePerPerson } from "@/lib/trip-engine";
import { cn } from "@/lib/utils";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const OUTBOUND = ["L0", "L1", "L2"];

export function MoneyView() {
  const fareLegs = LEGS.filter((l) => l.fareTotal);
  const ways = [
    { name: "Gujarat to Guwahati", legs: fareLegs.filter((l) => OUTBOUND.includes(l.id)) },
    { name: "Guwahati to Gujarat", legs: fareLegs.filter((l) => !OUTBOUND.includes(l.id)) },
  ];
  const total = fareLegs.reduce((s, l) => s + farePerPerson(l), 0);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Money</h1>

      <Panel>
        <p className="text-sm text-muted-foreground">Train fares per person</p>
        <p className="mt-1 font-mono text-[2.25rem] font-semibold leading-none tabular">{rupees(total)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Target is {rupees(TRIP.perPersonEachWayTarget)} each way, {rupees(TRIP.perPersonEachWayTarget * 2)} total.
        </p>
      </Panel>

      {ways.map((w) => {
        const sum = w.legs.reduce((s, l) => s + farePerPerson(l), 0);
        const over = sum - TRIP.perPersonEachWayTarget;
        return (
          <Panel key={w.name}>
            <PanelTitle
              aside={
                <span className={cn("text-sm font-semibold", over > 0 ? "text-warn" : "text-ok")}>
                  {over > 0 ? `${rupees(over)} over` : `${rupees(-over)} under`}
                </span>
              }
            >
              {w.name}
            </PanelTitle>
            <ul className="flex flex-col gap-2.5">
              {w.legs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.95rem] font-medium">{l.train?.name}</p>
                    <Route leg={l} className="text-sm text-muted-foreground" />
                  </div>
                  <span className="font-mono text-[0.95rem] tabular">{rupees(farePerPerson(l))}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 border-t pt-2.5">
                <span className="text-sm text-muted-foreground">Per person</span>
                <span className="font-mono text-[0.95rem] font-semibold tabular">{rupees(sum)}</span>
              </li>
            </ul>
          </Panel>
        );
      })}

      <Panel className="border-dashed bg-transparent">
        <PanelTitle>Splitwise</PanelTitle>
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          Balances and recent expenses from our Splitwise group will show here once it is connected. Cabs, metro and food
          go into Splitwise as usual.
        </p>
      </Panel>
    </div>
  );
}
