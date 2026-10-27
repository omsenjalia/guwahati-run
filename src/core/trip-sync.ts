import * as trip from "@/data/trip";

/**
 * The trip plan (data/trip.ts) is built into the app, but Om can edit it
 * from developer options. Each feed carries the server's plan hash; when it
 * differs, the app fetches /api/trip and patches the built-in lists and
 * objects in place, so every screen (and helper holding a reference to a
 * leg) sees the new plan without an app update.
 * shortcut: plain string/number exports (BOOKING_OWNER, the IRCTC links) can't be patched; changing those needs a new APK.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null;

/** Makes `target` deep-equal `source`, keeping existing objects (and their identity) where shapes match. */
export function patchInPlace(target: Obj | unknown[], source: Obj | unknown[]) {
  if (Array.isArray(target) && Array.isArray(source)) {
    source.forEach((v, i) => {
      const cur = target[i];
      if (isObj(cur) && isObj(v) && Array.isArray(cur) === Array.isArray(v)) patchInPlace(cur, v);
      else target[i] = v;
    });
    target.length = source.length;
    return;
  }
  const t = target as Obj;
  const s = source as Obj;
  for (const k of Object.keys(t)) if (!(k in s)) delete t[k];
  for (const [k, v] of Object.entries(s)) {
    const cur = t[k];
    if (isObj(cur) && isObj(v) && Array.isArray(cur) === Array.isArray(v)) patchInPlace(cur, v);
    else t[k] = v;
  }
}

/** Applies a plan from the server to the built-in trip module (object exports only). */
export function applyTrip(next: Obj) {
  const mod = trip as unknown as Obj;
  for (const [name, value] of Object.entries(next)) {
    const cur = mod[name];
    if (isObj(cur) && isObj(value) && Array.isArray(cur) === Array.isArray(value)) patchInPlace(cur, value);
  }
}
