"use client";

import { Check } from "@phosphor-icons/react";
import { TEAM } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { useNow } from "@/lib/clock";
import { useMe } from "@/lib/me";
import { prepProgress } from "@/lib/prep";
import { dayMonth, istDateKey } from "@/lib/time";
import { useChecklist } from "@/lib/use-checklist";
import { cn } from "@/lib/utils";

const EVERYONE = TEAM.map((p) => p.id);

/**
 * Before-the-trip checklist shared by all 4 phones. Per-person items have a
 * tick for each of us (tap your own name); deadlines turn red once passed.
 */
export function PrepPanel() {
  const me = useMe();
  const now = useNow();
  const { items, toggle, togglePerson } = useChecklist("prep");
  if (!items || now === null) return <Skeleton className="h-64" />;
  if (!items.length) return null;
  const today = istDateKey(now);
  const p = prepProgress(items, EVERYONE, null, now);
  const sorted = [...items].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.sort - b.sort);

  return (
    <Panel id="prep" className="scroll-mt-20">
      <PanelTitle aside={<span className="tabular text-sm text-muted-foreground">{p.done}/{p.total} done</span>}>
        Prep checklist
      </PanelTitle>
      <ul className="flex flex-col gap-4">
        {sorted.map((item) => {
          const overdue = !item.done && !!item.due && item.due < today;
          return (
            <li key={item.id}>
              <div className="flex items-start justify-between gap-3">
                {item.per_person ? (
                  <p className={cn("text-[0.95rem] leading-snug", item.done && "text-muted-foreground line-through")}>{item.label}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(item, me)}
                    aria-pressed={item.done}
                    className="-ml-1 flex min-h-11 items-center gap-3 rounded-lg px-1 text-left active:bg-secondary"
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border-2", item.done ? "border-ok bg-ok text-background" : "border-input")}>
                      {item.done && <Check className="size-4" weight="bold" />}
                    </span>
                    <span className={cn("text-[0.95rem] leading-snug", item.done && "text-muted-foreground line-through")}>
                      {item.label}
                      {item.done && item.done_by && <span className="block text-xs text-subtle no-underline">by {personName(item.done_by)}</span>}
                    </span>
                  </button>
                )}
                {item.due && (
                  <span className={cn("shrink-0 pt-0.5 tabular text-xs", overdue ? "font-semibold text-bad" : "text-muted-foreground")}>
                    {overdue ? "overdue " : "by "}
                    {dayMonth(`${item.due}T12:00:00+05:30`)}
                  </span>
                )}
              </div>
              {item.per_person && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEAM.map((person) => {
                    const on = item.done_people?.includes(person.id) ?? false;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${person.short}: ${item.label}`}
                        onClick={() => togglePerson(item, person.id, EVERYONE)}
                        className={cn(
                          "inline-flex h-9 items-center justify-center gap-1 rounded-full border px-3 text-[0.8rem] font-medium transition active:scale-[0.97]",
                          on ? "border-transparent bg-ok-soft text-ok" : "border-input text-muted-foreground",
                          person.id === me && !on && "border-primary/70 text-foreground",
                        )}
                      >
                        {on && <Check className="size-3.5" weight="bold" />}
                        {person.short}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
