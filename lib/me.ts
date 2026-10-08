"use client";

import { useSyncExternalStore } from "react";
import type { PersonId } from "@/data/trip";

/** Which team member owns this phone. Picked once on the Team screen. */

const KEY = "gr-me";
const listeners = new Set<() => void>();

function read(): PersonId | null {
  try {
    return (localStorage.getItem(KEY) as PersonId | null) ?? null;
  } catch {
    return null;
  }
}

export function setMe(id: PersonId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((l) => l());
}

export function useMe(): PersonId | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
}
