"use client";

import { useEffect, useState } from "react";
import type { Expense } from "@/lib/expenses";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";

const KEY = "expenses";

/** Shared expenses, live across all phones and kept offline. */
export function useExpenses() {
  const [items, setItems] = useState<Expense[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<Expense[]>(KEY).then((saved) => {
      if (alive && saved) setItems((cur) => cur ?? saved);
    });
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data, error } = await sb
        .from("expenses")
        .select("*")
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        setError(error.message);
        return;
      }
      const rows = (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Expense[];
      setItems(rows);
      setError("");
      void idbSet(KEY, rows);
    };
    void load();
    const channel = sb
      .channel(channelName("expenses"))
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => void load())
      .subscribe();
    const onFocus = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onFocus);
      void sb.removeChannel(channel);
    };
  }, []);

  return { items, error };
}

/** An expense without a bill (a bill goes through queueUpload instead). */
export async function addExpense(e: Omit<Expense, "id" | "created_at">) {
  const sb = browserDb();
  if (!(await ensureSession())) throw new Error("Can't reach the database. Check your connection.");
  const { error } = await sb.from("expenses").insert(e);
  if (error) throw new Error(error.message);
}

export async function updateExpense(id: string, patch: Partial<Omit<Expense, "id" | "created_at">>) {
  if (!(await ensureSession())) throw new Error("Can't reach the database. Check your connection.");
  const { error } = await browserDb()
    .from("expenses")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string) {
  const { error } = await browserDb().from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
