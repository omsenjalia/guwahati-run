import type { LegLive } from "@/lib/live-types";
import { serverDb } from "@/lib/supabase/server";

/**
 * Data for the parent view (parent or team passcode, enforced by proxy.ts).
 * Deliberately limited: timing and position only. No PNRs, berths or money.
 */
export async function GET() {
  const db = serverDb();
  const [legs, checkins] = await Promise.all([
    db.from("leg_live").select("leg_id, data"),
    db.from("checkins").select("person, place, lat, lon, created_at").order("created_at", { ascending: false }).limit(40),
  ]);
  const safeLegs = Object.fromEntries(
    (legs.data ?? []).map((r) => {
      const d = r.data as LegLive;
      return [
        r.leg_id,
        {
          legId: r.leg_id,
          expectedDepart: d.expectedDepart,
          expectedArrive: d.expectedArrive,
          delayMin: d.delayMin,
          lastStation: d.lastStation,
          departed: d.departed,
          terminated: d.terminated,
          updatedAt: d.liveUpdatedAt,
        } satisfies LegLive,
      ];
    }),
  );
  const latest: Record<string, unknown> = {};
  for (const c of checkins.data ?? []) if (!latest[c.person]) latest[c.person] = c;
  return Response.json({ legs: safeLegs, checkins: latest, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
