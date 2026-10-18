import { API_URL } from "./config";
import { currentSession, savedSession, signOut } from "./auth";

/** Calls our server with the signed-in token. Throws with the server's message. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const s = currentSession() ?? (await savedSession());
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(s ? { Authorization: `Bearer ${s.token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.json().catch(() => ({}));
  // Token no longer valid (e.g. the server's secret changed): sign in again.
  if (res.status === 401 && s && currentSession()) void signOut();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}
