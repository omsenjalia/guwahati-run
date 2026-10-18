import { isDeveloper, sessionFrom } from "@/lib/auth";
import { GitHubError, readText, updateText } from "@/lib/github";
import { TRIP_PATH, checkTripSource } from "@/lib/trip-file";

export const maxDuration = 60;

/**
 * The trip plan file (data/trip.ts) from GitHub, for the developer
 * options editor (Om only). PUT { text, sha } checks it and commits it to
 * main; Vercel redeploys in about 2 minutes and every phone picks the new
 * plan up from /api/trip (no app update needed).
 */
export async function GET(request: Request) {
  if (!isDeveloper(await sessionFrom(request))) return Response.json({ error: "Developer only" }, { status: 403 });
  try {
    return Response.json(await readText(TRIP_PATH), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  if (!isDeveloper(await sessionFrom(request))) return Response.json({ error: "Developer only" }, { status: 403 });
  const { text, sha, message } = (await request.json().catch(() => ({}))) as { text?: string; sha?: string; message?: string };
  if (typeof text !== "string" || typeof sha !== "string") return Response.json({ error: "Need text and sha" }, { status: 400 });
  const problem = checkTripSource(text);
  if (problem) return Response.json({ error: `Not saved. ${problem}` }, { status: 422 });
  try {
    const r = await updateText(TRIP_PATH, text, sha, (message?.trim() || "Trip plan edited in the app").slice(0, 200));
    return Response.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof GitHubError && e.status === 409) {
      return Response.json({ error: "The file changed since you opened it. Reload it and make your edit again." }, { status: 409 });
    }
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
