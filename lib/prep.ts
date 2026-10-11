import { TEAM } from "@/data/trip";
import { istDateKey } from "@/lib/time";
import type { CheckItem } from "@/lib/use-checklist";

const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

/**
 * Prep checklist progress. A per-person item counts once per person, so
 * "12/20 done" means 12 ticks out of 20 needed. `next` is what's still open,
 * soonest deadline first; with `me` set, items I've already done drop out.
 */
export function prepProgress(items: CheckItem[], everyone: string[], me: string | null, now = Date.now()) {
  const today = istDateKey(now);
  let total = 0;
  let done = 0;
  const next: { item: CheckItem; missing: string[]; overdue: boolean }[] = [];
  for (const item of items) {
    if (item.per_person) {
      const ticked = everyone.filter((p) => item.done_people?.includes(p));
      total += everyone.length;
      done += ticked.length;
      const missing = everyone.filter((p) => !ticked.includes(p));
      if (missing.length && (!me || missing.includes(me))) {
        next.push({ item, missing: missing.map(short), overdue: !!item.due && item.due < today });
      }
    } else {
      total += 1;
      if (item.done) done += 1;
      else next.push({ item, missing: [], overdue: !!item.due && item.due < today });
    }
  }
  next.sort((a, b) => (a.item.due ?? "9999").localeCompare(b.item.due ?? "9999") || a.item.sort - b.item.sort);
  return { total, done, next };
}
