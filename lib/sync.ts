"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { LegId } from "@/data/trip";
import type { LegLive, LiveState } from "@/lib/live-types";
import { getLive, setLive } from "@/lib/live-store";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb } from "@/lib/supabase/browser";

/**
 * Keeps this phone's copy in step with the cloud:
 * 1. Show the offline copy (IndexedDB) instantly.
 * 2. Make sure we have a Supabase session (from the team passcode cookie).
 * 3. Load everything, then listen for Realtime changes.
 * 4. Re-load whenever the app comes back to the foreground or online.
 * Every change is saved back to IndexedDB, so the app keeps working offline.
 */

const LIVE_KEY = "live-state";
let started = false;
let channel: RealtimeChannel | null = null;

type LegRow = { leg_id: string; data: LegLive; source: string | null; stale: boolean; updated_at: string };
type StateRow = { key: string; value: unknown };
type OverrideRow = { leg_id: string; data: Partial<LegLive> };

export function startSync() {
  if (started) return;
  started = true;
  void boot();
  window.addEventListener("online", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
}

async function boot() {
  const saved = await idbGet<LiveState>(LIVE_KEY);
  if (saved) setLive((cur) => (cur.syncedAt && cur.syncedAt > (saved.syncedAt ?? 0) ? cur : { ...saved, state: saved.state ?? {} }));
  await refresh();
  subscribe();
}

export async function ensureSession() {
  const sb = browserDb();
  const { data } = await sb.auth.getSession();
  if (data.session) return true;
  const res = await fetch("/api/session", { method: "POST" }).catch(() => null);
  if (!res?.ok) return false;
  const t = await res.json();
  const { error } = await sb.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token });
  return !error;
}

let overrides: Record<string, Partial<LegLive>> = {};

function rowToLeg(r: LegRow): LegLive {
  const base: LegLive = { ...r.data, legId: r.leg_id as LegId, stale: r.stale, source: r.source ?? r.data.source };
  base.updatedAt ??= Date.parse(r.updated_at);
  // Hidden admin overrides win over fetched data.
  return { ...base, ...(overrides[r.leg_id] ?? {}) };
}

export async function refresh() {
  if (!navigator.onLine) return;
  if (!(await ensureSession())) return;
  const sb = browserDb();
  const [legs, states, ovr] = await Promise.all([
    sb.from("leg_live").select("leg_id, data, source, stale, updated_at"),
    sb.from("app_state").select("key, value"),
    sb.from("overrides").select("leg_id, data"),
  ]);
  if (legs.error || states.error) return;
  overrides = Object.fromEntries(((ovr.data ?? []) as OverrideRow[]).map((o) => [o.leg_id, o.data]));
  const next: LiveState = {
    legs: Object.fromEntries((legs.data as LegRow[]).map((r) => [r.leg_id, rowToLeg(r)])),
    state: Object.fromEntries((states.data as StateRow[]).map((s) => [s.key, s.value])),
    syncedAt: Date.now(),
  };
  setLive(next);
  await idbSet(LIVE_KEY, next);
}

function subscribe() {
  if (channel) return;
  const sb = browserDb();
  channel = sb
    .channel("live")
    .on("postgres_changes", { event: "*", schema: "public", table: "leg_live" }, (p) => {
      const row = p.new as LegRow;
      if (!row?.leg_id) return;
      patch((s) => ({ ...s, legs: { ...s.legs, [row.leg_id]: rowToLeg(row) } }));
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (p) => {
      const row = p.new as StateRow;
      if (!row?.key) return;
      patch((s) => ({ ...s, state: { ...s.state, [row.key]: row.value } }));
    })
    .subscribe((status) => {
      // Reconnected after a gap: catch up on anything missed.
      if (status === "SUBSCRIBED") void refresh();
    });
}

function patch(fn: (s: LiveState) => LiveState) {
  setLive((s) => fn({ ...s, syncedAt: Date.now() }));
  void idbSet(LIVE_KEY, getLive());
}
