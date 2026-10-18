let cached: { json: string; hash: string } | null = null;

/**
 * This deployment's trip plan as JSON, and a short hash of it. Phones compare
 * the hash (in /api/parent/state) and fetch /api/trip when it changes, so a
 * plan edited in developer options reaches the app without an update.
 */
export async function tripData() {
  if (cached) return cached;
  const trip = await import("@/data/trip");
  const json = JSON.stringify({ ...trip });
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(json));
  const hash = Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
  cached = { json, hash };
  return cached;
}
