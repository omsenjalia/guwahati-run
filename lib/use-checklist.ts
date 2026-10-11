"use client";

import { useEffect, useState } from "react";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";
import { idbGet, idbSet } from "@/lib/offline/idb";

/**
 * A checklist shared by all 4 phones (packing_items rows with one owner),
 * live via Realtime and kept offline in IndexedDB.
 */
export type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  done_by: string | null;
  sort: number;
  /** Prep list only: deadline (YYYY-MM-DD), and who has ticked a per-person item. */
  due?: string | null;
  per_person?: boolean;
  done_people?: string[];
};

const BASE = "id, label, done, done_by, sort";
// The prep list has extra columns (supabase/003_confirmed_trip.sql).
const cols = (owner: string) => (owner === "prep" ? `${BASE}, due, per_person, done_people` : BASE);

export function useChecklist(owner: string) {
  const [items, setItems] = useState<CheckItem[] | null>(null);
  const key = `checklist-${owner}`;

  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    const apply = (next: CheckItem[]) => {
      if (!alive) return;
      const sorted = [...next].sort((a, b) => a.sort - b.sort);
      setItems(sorted);
      void idbSet(key, sorted);
    };
    idbGet<CheckItem[]>(key).then((saved) => {
      if (alive && saved) setItems((cur) => cur ?? saved);
    });
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data } = await sb.from("packing_items").select(cols(owner)).eq("owner", owner);
      if (data) apply(data as unknown as CheckItem[]);
    };
    void load();
    const channel = sb
      .channel(channelName(`checklist-${owner}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "packing_items", filter: `owner=eq.${owner}` }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(channel);
    };
  }, [owner, key]);

  async function toggle(item: CheckItem, by: string | null) {
    const done = !item.done;
    setItems((cur) => cur?.map((i) => (i.id === item.id ? { ...i, done, done_by: done ? by : null } : i)) ?? cur);
    await browserDb()
      .from("packing_items")
      .update({ done, done_by: done ? by : null, updated_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  async function add(label: string) {
    const sort = (items?.reduce((m, i) => Math.max(m, i.sort), 0) ?? 0) + 1;
    const { data, error } = await browserDb()
      .from("packing_items")
      .insert({ owner, label, sort })
      .select(cols(owner))
      .single();
    if (error) throw new Error(error.message);
    setItems((cur) => [...(cur ?? []), data as unknown as CheckItem]);
  }

  /** Per-person item: tick or untick for one person; done once all 4 have. */
  async function togglePerson(item: CheckItem, person: string, everyone: string[]) {
    const had = item.done_people ?? [];
    const done_people = had.includes(person) ? had.filter((p) => p !== person) : [...had, person];
    const done = everyone.every((p) => done_people.includes(p));
    setItems((cur) => cur?.map((i) => (i.id === item.id ? { ...i, done_people, done } : i)) ?? cur);
    await browserDb()
      .from("packing_items")
      .update({ done_people, done, done_by: done ? person : null, updated_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  async function remove(item: CheckItem) {
    setItems((cur) => cur?.filter((i) => i.id !== item.id) ?? cur);
    await browserDb().from("packing_items").delete().eq("id", item.id);
  }

  return { items, toggle, togglePerson, add, remove };
}
