/**
 * Passcode auth. The cookie holds an HMAC of the role, never the passcode,
 * so it can't be forged without AUTH_SECRET. Uses Web Crypto so it runs in
 * both the proxy and route handlers.
 */

export type Role = "team" | "parent";
export const AUTH_COOKIE = "gr_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 60; // 60 days, covers the whole trip

const enc = new TextEncoder();

async function hmac(message: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signRole(role: Role) {
  return `${role}.${await hmac(`gr:${role}`)}`;
}

export async function verifyCookie(value: string | undefined): Promise<Role | null> {
  if (!value) return null;
  const [role] = value.split(".");
  if (role !== "team" && role !== "parent") return null;
  const expected = await signRole(role);
  return timingSafeEqual(value, expected) ? role : null;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Which role a typed passcode unlocks. */
export function roleForPasscode(input: string): Role | null {
  const typed = input.trim();
  if (!typed) return null;
  if (process.env.TEAM_PASSCODE && timingSafeEqual(typed, process.env.TEAM_PASSCODE)) return "team";
  if (process.env.PARENT_PASSCODE && timingSafeEqual(typed, process.env.PARENT_PASSCODE)) return "parent";
  return null;
}
