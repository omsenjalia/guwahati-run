import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { PersonId } from "@/data/trip";
import type { Expense } from "@/lib/expenses";
import { EMPTY_LIVE, type LiveState } from "@/lib/live-types";
import type { PersonLocation } from "@/lib/locations";
import { api } from "./api";
import { cacheGet, cacheSet } from "./storage";
import { createStore, useStore } from "./store";
import { applyTrip } from "./trip-sync";

/**
 * The app's one data feed (/api/parent/state, for parents and attendees):
 * shown from the offline copy instantly, refreshed every minute while the
 * app is open and whenever it comes back to the foreground.
 */

export type Checkin = { person: PersonId; place: string | null; lat: number | null; lon: number | null; created_at: string };

export type Feed = {
  live: LiveState;
  locations: Partial<Record<PersonId, PersonLocation>>;
  checkins: Partial<Record<PersonId, Checkin>>;
  expenses: Expense[];
  /** When the feed was last fetched (epoch ms); 0 = never. */
  fetchedAt: number;
  error?: string;
  loading: boolean;
};

type Raw = {
  legs: LiveState["legs"];
  state: LiveState["state"];
  locations: Feed["locations"];
  checkins: Feed["checkins"];
  expenses: Expense[];
  /** Hash of the server's trip plan (changes when it's edited in developer options). */
  tripHash?: string;
  at: number;
};

const KEY = "gr-feed";
const TRIP_KEY = "gr-trip";
let tripHash: string | undefined;

/** Picks up an edited trip plan: fetched only when the server's hash differs from ours. */
async function syncTrip(hash?: string) {
  if (!hash || hash === tripHash) return;
  const r = await api<{ hash: string; trip: Record<string, unknown> }>("/api/trip");
  applyTrip(r.trip);
  tripHash = r.hash;
  void cacheSet(TRIP_KEY, r);
}
const EMPTY: Feed = { live: EMPTY_LIVE, locations: {}, checkins: {}, expenses: [], fetchedAt: 0, loading: true };
const store = createStore<Feed>(EMPTY);
let booted = false;

export async function refresh() {
  store.set((f) => ({ ...f, loading: true }));
  try {
    const r = await api<Raw>("/api/parent/state");
    await syncTrip(r.tripHash).catch(() => {});
    const next: Feed = {
      live: { legs: r.legs, state: r.state, syncedAt: r.at },
      locations: r.locations,
      checkins: r.checkins,
      expenses: r.expenses,
      fetchedAt: r.at,
      loading: false,
    };
    store.set(next);
    void cacheSet(KEY, next);
  } catch (e) {
    store.set((f) => ({ ...f, loading: false, error: e instanceof Error ? e.message : String(e) }));
  }
}

/** Starts the feed once per app run (call from the signed-in layout). */
export function useFeedSync() {
  useEffect(() => {
    if (!booted) {
      booted = true;
      void cacheGet<{ hash: string; trip: Record<string, unknown> }>(TRIP_KEY).then((saved) => {
        if (saved && !tripHash) {
          applyTrip(saved.trip);
          tripHash = saved.hash;
        }
      });
      void cacheGet<Feed>(KEY).then((saved) => {
        if (saved && !store.get().fetchedAt) store.set({ ...saved, loading: true });
      });
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && void refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
}

export const useFeed = () => useStore(store);
export const useLive = () => useStore(store).live;
export const clearFeed = () => store.set(EMPTY);

/** "now", re-rendering every `everyMs`. Add ?at=2026-10-29T03:30 on web to preview a moment. */
const offset = (() => {
  try {
    const at = typeof location !== "undefined" ? new URLSearchParams(location.search).get("at") : null;
    return at ? Date.parse(at.length <= 16 ? `${at}:00+05:30` : at) - Date.now() : 0;
  } catch {
    return 0;
  }
})();
const clock = createStore(Date.now() + offset);
setInterval(() => clock.set(Date.now() + offset), 1000);
export function useNow(everyMs = 30_000) {
  return useSyncExternalStore(
    clock.subscribe,
    () => Math.floor(clock.get() / everyMs) * everyMs,
    () => Math.floor(clock.get() / everyMs) * everyMs,
  );
}
