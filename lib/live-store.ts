"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_LIVE, type LiveState } from "@/lib/live-types";

/**
 * Client-side holder for live state. Phase 1 serves the static trip data only;
 * phase 2 hydrates this from IndexedDB and Supabase Realtime.
 */

let state: LiveState = EMPTY_LIVE;
const listeners = new Set<() => void>();

export function setLive(next: LiveState) {
  state = next;
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
