import type { PersonId } from "@/data/trip";
import { API_URL } from "./config";
import { secure } from "./storage";
import { createStore, useStore } from "./store";

/** team = an attendee on the trip; parent = a parent following one attendee (person). */
export type Role = "team" | "parent";
export type Session = { role: Role; person: PersonId; token: string };

const KEY = "gr-session";
const store = createStore<{ ready: boolean; session: Session | null }>({ ready: false, session: null });
const signOutHooks = new Set<() => Promise<void> | void>();

export const useAuth = () => useStore(store);
export const currentSession = () => store.get().session;
/** Runs on sign out (e.g. stop background location). */
export const onSignOut = (fn: () => Promise<void> | void) => signOutHooks.add(fn);

/** The saved session, read straight from storage (works in the background task too). */
export async function savedSession(): Promise<Session | null> {
  try {
    const raw = await secure.get(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function loadSession() {
  store.set({ ready: true, session: await savedSession() });
}

/** Checks the password with the server; nothing is saved yet (see saveSession). */
export async function signIn(role: Role, person: PersonId, password: string): Promise<Session> {
  const res = await fetch(`${API_URL}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, person, password }),
  }).catch(() => null);
  if (!res) throw new Error("No connection. Try again when you have signal.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Sign-in failed (${res.status})`);
  return { role: body.role, person: body.person, token: body.token };
}

/** Stores the session. activate=false keeps the app on the current screen (e.g. to ask for location first). */
export async function saveSession(session: Session, activate = true) {
  await secure.set(KEY, JSON.stringify(session));
  if (activate) store.set({ ready: true, session });
}

export async function signOut() {
  for (const fn of signOutHooks) await Promise.resolve(fn()).catch(() => {});
  await secure.del(KEY);
  store.set({ ready: true, session: null });
}
