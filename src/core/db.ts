import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { currentSession } from "./auth";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import { cacheGet, cacheSet } from "./storage";

/**
 * The shared database for attendees (checklists, board, journal, receipts):
 * the publishable key plus the team's Supabase session from /api/session,
 * which is what row level security checks. Parents never get one.
 */
export const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: true } });

let session: Promise<void> | null = null;

/** Signs the database client in once per app run (again after a failure). */
export function ensureDb() {
  if (currentSession()?.role !== "team") return Promise.reject(new Error("Only for the team"));
  session ??= api<{ access_token: string; refresh_token: string }>("/api/session", { method: "POST" })
    .then(async (t) => {
      const { error } = await db.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token });
      if (error) throw new Error(error.message);
    })
    .catch((e) => {
      session = null;
      throw e;
    });
  return session;
}

/**
 * Rows of one table, shown from the offline copy first, then loaded and
 * kept live (any change to the table reloads). `query` picks the rows.
 */
export function useRows<T>(table: string, query: () => PromiseLike<{ data: unknown; error: { message: string } | null }>, key = table) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      ensureDb()
        .then(() => query())
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          setRows(data as T[]);
          setError("");
          void cacheSet(`gr-rows-${key}`, data);
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the query
    [key],
  );

  useEffect(() => {
    let alive = true;
    void cacheGet<T[]>(`gr-rows-${key}`).then((saved) => alive && saved && setRows((cur) => cur ?? saved));
    void load();
    const channel = db
      .channel(`${key}-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void db.removeChannel(channel);
    };
  }, [table, key, load]);

  return { rows, error, reload: load, setRows };
}
