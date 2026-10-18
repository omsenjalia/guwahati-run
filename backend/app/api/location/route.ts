import { sessionFrom } from "@/lib/auth";
import { serverDb } from "@/lib/supabase/server";
import { MIN } from "@/lib/time";

/**
 * An attendee's phone reports where it is (every 30 min, from the background
 * task). The person comes from the token, never from the body.
 */
export async function POST(request: Request) {
  const s = await sessionFrom(request);
  if (s?.role !== "team") return Response.json({ error: "Attendees only" }, { status: 403 });
  const b = (await request.json().catch(() => ({}))) as { lat?: unknown; lon?: unknown; accuracy?: unknown; at?: unknown };
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Bad coordinates" }, { status: 400 });
  }
  const now = Date.now();
  // Deferred fixes arrive late: keep the phone's time, unless it's in the future or ancient.
  const at = Number(b.at);
  const when = Number.isFinite(at) && at <= now + MIN && at > now - 24 * 60 * MIN ? at : now;
  const accuracy = Number.isFinite(Number(b.accuracy)) ? Number(b.accuracy) : null;

  const db = serverDb();
  const { data: prev } = await db.from("locations").select("updated_at").eq("person", s.person).maybeSingle();
  if (prev && Date.parse(prev.updated_at) >= when) return Response.json({ ok: true, skipped: "older than saved" });
  const { error } = await db
    .from("locations")
    .upsert({ person: s.person, lat, lon, accuracy, updated_at: new Date(when).toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
