"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_LIVE, type LiveState } from "@/lib/live-types";

/**
 * In-memory live state for the UI. Filled from the offline copy (IndexedDB)
 * at startup, then kept current by lib/sync.ts (Supabase Realtime).
 */

let state: LiveState = EMPTY_LIVE;
const listeners = new Set<() => void>();

export function getLive() {
  return state;
}

export function setLive(next: LiveState | ((prev: LiveState) => LiveState)) {
  state = typeof next === "function" ? next(state) : next;
  listeners.forEach((l) => l());
}

export function useLive(): LiveState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY_LIVE,
  );
}
