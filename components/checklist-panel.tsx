"use client";

import { useState } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { useMe } from "@/lib/me";
import { useChecklist } from "@/lib/use-checklist";
import { cn } from "@/lib/utils";

/** A checklist shared by all phones (packing lists, grant documents). */
export function ChecklistPanel({ owner, title, editable = true }: { owner: string; title: string; editable?: boolean }) {
  const me = useMe();
  const { items, toggle, add, remove } = useChecklist(owner);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const done = items?.filter((i) => i.done).length ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    await add(label).catch(() => setDraft(label));
  }

  return (
    <Panel>
      <PanelTitle
        aside={
          <div className="flex items-center gap-3">
            {items && (
              <span className="text-sm text-muted-foreground">
                {done}/{items.length}
              </span>
            )}
            {editable && items && items.length > 0 && (
              <button type="button" onClick={() => setEditing((v) => !v)} className="text-sm font-medium text-primary">
                {editing ? "Done" : "Edit"}
              </button>
            )}
          </div>
        }
      >
        {title}
      </PanelTitle>
      {!items ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="flex items-center">
              <button
                type="button"
                onClick={() => toggle(item, me)}
                aria-pressed={item.done}
                className="-ml-2 flex min-h-12 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left active:bg-secondary"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                    item.done ? "border-ok bg-ok text-background" : "border-input",
                  )}
                >
                  {item.done && <Check className="size-4" weight="bold" />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[0.95rem] leading-snug", item.done && "text-muted-foreground line-through")}>
                    {item.label}
                  </span>
                  {item.done && item.done_by && owner !== item.done_by && (
                    <span className="text-xs text-subtle">by {personName(item.done_by)}</span>
                  )}
                </span>
              </button>
              {editing && (
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => remove(item)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle active:bg-secondary"
                >
                  <X className="size-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && items && (
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <label htmlFor={`add-${owner}`} className="sr-only">
            Add an item to {title}
          </label>
          <input
            id={`add-${owner}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an item"
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <button
            type="submit"
            aria-label="Add item"
            disabled={!draft.trim()}
            className="inline-flex size-11 items-center justify-center rounded-lg bg-secondary disabled:opacity-50"
          >
            <Plus className="size-5" />
          </button>
        </form>
      )}
    </Panel>
  );
}
