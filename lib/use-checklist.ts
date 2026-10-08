"use client";

import { useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";
import { idbGet, idbSet } from "@/lib/offline/idb";

/**
 * A checklist shared by all 4 phones (packing_items rows with one owner),
 * live via Realtime and kept offline in IndexedDB.
 */
export type CheckItem = { id: string; label: string; done: boolean; done_by: string | null; sort: number };

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
      const { data } = await sb.from("packing_items").select("id, label, done, done_by, sort").eq("owner", owner);
      if (data) apply(data as CheckItem[]);
    };
    void load();
    const channel = sb
      .channel(`checklist-${owner}`)
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

  return { items, toggle };
}
