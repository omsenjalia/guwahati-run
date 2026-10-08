"use client";

import { Car, Subway } from "@phosphor-icons/react";
import { StatusPill } from "@/components/bits";
import { hhmm } from "@/lib/time";
import type { TransferPlan } from "@/lib/transfer-planner";
import { cn } from "@/lib/utils";

/** Recommended metro/cab plan for one transfer, recalculated from the live ETA. */
export function TransferPlanCard({ plan, now, className }: { plan: TransferPlan; now: number; className?: string }) {
  const Icon = plan.mode === "metro" ? Subway : Car;
  const late = plan.leaveBy !== undefined && now > plan.leaveBy;
  return (
    <div className={cn("rounded-lg bg-secondary p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <Icon className="size-5 text-primary" weight="bold" />
          {plan.mode === "metro" ? "Take the metro" : "Take a cab"}
        </p>
        <StatusPill health={late ? "red" : plan.health}>
          {late ? "Switch to cab" : plan.health === "green" ? "On track" : plan.health === "amber" ? "Tight" : "At risk"}
        </StatusPill>
      </div>
      {plan.lines.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {plan.lines.map((l, i) => (
            <span key={l.name} className="inline-flex items-center gap-1.5 text-sm">
              {i > 0 && <span className="text-subtle">then</span>}
              <span className="inline-block h-2.5 w-5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
              {l.name}
            </span>
          ))}
        </div>
      )}
      {plan.mode === "metro" && (
        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
          {plan.route}
          {plan.interchange ? `. Change at ${plan.interchange}.` : ""}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{plan.leaveBy !== undefined ? "Leave by" : "Start"}</dt>
          <dd className="font-mono font-semibold tabular">{hhmm(plan.leaveBy ?? plan.start)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Takes</dt>
          <dd className="font-mono font-semibold tabular">{plan.minutes} min</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cost, 4 of us</dt>
          <dd className="font-mono font-semibold tabular">~₹{plan.costTotal}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-subtle">{plan.reason}</p>
    </div>
  );
}
