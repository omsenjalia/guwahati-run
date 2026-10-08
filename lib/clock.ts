"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared ticking clock for the whole app.
 *
 * Testing aid: open any page with ?at=2026-10-29T04:30 (IST) to pretend it is
 * that moment. The simulated clock keeps ticking from there and survives
 * navigation until you open ?at=off.
 */

const SIM_KEY = "gr-sim";
let offset = 0;
let now = 0;
let started = false;
const listeners = new Set<() => void>();

function readSimulation() {
  try {
    const at = new URLSearchParams(window.location.search).get("at");
    if (at === "off") sessionStorage.removeItem(SIM_KEY);
    else if (at) {
      const iso = /[+Z]/.test(at.slice(10)) ? at : `${at}+05:30`;
      const target = new Date(iso).getTime();
      if (!Number.isNaN(target)) sessionStorage.setItem(SIM_KEY, String(target - Date.now()));
    }
    offset = Number(sessionStorage.getItem(SIM_KEY) ?? 0) || 0;
  } catch {
    offset = 0;
  }
}

function start() {
  if (started) return;
  started = true;
  readSimulation();
  now = Date.now() + offset;
  setInterval(() => {
    now = Date.now() + offset;
    listeners.forEach((l) => l());
  }, 1000);
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function snapshot() {
  start();
  return now;
}

/** Current time in epoch ms, ticking every second. null during server render. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function useIsSimulated() {
  useNow();
  return started && offset !== 0;
}
