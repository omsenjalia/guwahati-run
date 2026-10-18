/**
 * App sign-in. Attendees use their own password, parents use the parent
 * passcode and say whose parent they are. The app keeps a bearer token
 * "<role>:<person>.<hmac>" (an HMAC of the role and person, never the
 * password), so it can't be forged without AUTH_SECRET. Uses Web Crypto so
 * it runs in both the proxy and route handlers.
 */
import { TEAM, type PersonId } from "@/data/trip";

/** team = a trip attendee. */
export type Role = "team" | "parent";
export type Session = { role: Role; person: PersonId };

const enc = new TextEncoder();

async function hmac(message: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Deterministic secret derived from AUTH_SECRET (e.g. the shared Supabase user's password). */
export async function deriveSecret(purpose: string) {
  return hmac(`gr:derive:${purpose}`);
}

export async function signSession(s: Session) {
  return `${s.role}:${s.person}.${await hmac(`gr:${s.role}:${s.person}`)}`;
}

const isPerson = (p: string): p is PersonId => TEAM.some((t) => t.id === p);

export async function verifyToken(value: string | null | undefined): Promise<Session | null> {
  if (!value) return null;
  const [role, person] = value.split(".")[0].split(":");
  if ((role !== "team" && role !== "parent") || !isPerson(person)) return null;
  const expected = await signSession({ role, person });
  return timingSafeEqual(value, expected) ? { role, person } : null;
}

/** Developer options (edit live data, jobs, the trip file): Om's attendee account only. */
export const DEVELOPER: PersonId = "oms";
export const isDeveloper = (s: Session | null) => s?.role === "team" && s.person === DEVELOPER;

/** The signed-in session from the Authorization header, if any. */
export const sessionFrom = (request: Request) =>
  verifyToken(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** ATTENDEE_PASSWORDS="oms:1234,omk:1234,heet:1234,sujal:1234" */
function attendeePassword(person: PersonId) {
  for (const pair of (process.env.ATTENDEE_PASSWORDS ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (pair.slice(0, i).trim() === person) return pair.slice(i + 1).trim();
  }
  return null;
}

/** Checks a sign-in attempt; returns the session it unlocks. */
export function login(role: string, person: string, password: string): Session | null {
  const typed = password.trim();
  if (!typed || !isPerson(person)) return null;
  if (role === "team") {
    const expected = attendeePassword(person);
    return expected && timingSafeEqual(typed, expected) ? { role, person } : null;
  }
  if (role === "parent") {
    const expected = process.env.PARENT_PASSCODE;
    return expected && timingSafeEqual(typed, expected) ? { role, person } : null;
  }
  return null;
}
