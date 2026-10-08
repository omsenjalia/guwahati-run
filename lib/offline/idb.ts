"use client";

import { openDB, type IDBPDatabase } from "idb";

/**
 * The phone's offline copy. One key-value store; values are whole snapshots
 * (live state, check-ins, packing...). Survives restarts and airplane mode.
 */

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  dbPromise ??= openDB("guwahati-run", 1, {
    upgrade(d) {
      d.createObjectStore("kv");
    },
  });
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await (await db()).get("kv", key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown) {
  try {
    await (await db()).put("kv", value, key);
  } catch {
    // Private mode or storage full: the app still works from memory.
  }
}
