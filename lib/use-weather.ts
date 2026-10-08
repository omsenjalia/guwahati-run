"use client";

import { useEffect, useSyncExternalStore } from "react";
import { PLACES, type PlaceId } from "@/data/trip";
import { fetchWeather, type Weather } from "@/lib/weather";
import { HOUR } from "@/lib/time";
import { useLive } from "@/lib/live-store";

/**
 * Weather per place, cached on the phone for 3 hours and shown offline.
 * The background job keeps a synced copy; the phone only fetches itself
 * when that copy is missing or older than 3 hours.
 */

const KEY = (id: string) => `gr-weather-${id}`;
const TTL = 3 * HOUR;
const memory = new Map<PlaceId, Weather | null>();
const inflight = new Set<PlaceId>();
const listeners = new Set<() => void>();

function read(id: PlaceId): Weather | null {
  if (!memory.has(id)) {
    try {
      const raw = localStorage.getItem(KEY(id));
      memory.set(id, raw ? (JSON.parse(raw) as Weather) : null);
    } catch {
      memory.set(id, null);
    }
  }
  return memory.get(id) ?? null;
}

function refresh(id: PlaceId) {
  const current = read(id);
  if ((current && Date.now() - current.fetchedAt < TTL) || inflight.has(id)) return;
  inflight.add(id);
  fetchWeather(PLACES[id])
    .then((w) => {
      memory.set(id, w);
      try {
        localStorage.setItem(KEY(id), JSON.stringify(w));
      } catch {}
      listeners.forEach((l) => l());
    })
    .catch(() => {})
    .finally(() => inflight.delete(id));
}

export function useWeather(id: PlaceId | undefined) {
  // Prefer the background job's copy (synced to every phone).
  const synced = useLive().state.weather?.[id ?? ""];
  const local = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (id ? read(id) : null),
    () => null,
  );
  const syncedAt = synced?.fetchedAt;
  useEffect(() => {
    if (id && !(syncedAt && Date.now() - syncedAt < TTL)) refresh(id);
  }, [id, syncedAt]);
  if (synced && (!local || synced.fetchedAt >= local.fetchedAt)) return synced;
  return local;
}
