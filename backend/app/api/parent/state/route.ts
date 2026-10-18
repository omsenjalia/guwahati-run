import { sessionFrom } from "@/lib/auth";
import type { LegLive } from "@/lib/live-types";
import { effectiveLocations, type LocationRow } from "@/lib/locations";
import { serverDb } from "@/lib/supabase/server";
import { tripData } from "@/lib/trip-json";

/**
 * The app's main data feed, for parents and attendees alike (either token,
 * enforced by proxy.ts): live train times and statuses, where everyone is,
 * and what the trip has cost so far. No PNR numbers, receipts or admin data
 * for parents; attendees also get the extra PNRs and waitlist routes they watch.
 */
export async function GET(request: Request) {
  const s = await sessionFrom(request);
  const db = serverDb();
  const now = Date.now();
  const [legs, overrides, states, locs, checkins, expenses, watches] = await Promise.all([
    db.from("leg_live").select("leg_id, data"),
    db.from("overrides").select("leg_id, data"),
    db.from("app_state").select("key, value").in("key", ["weather", "schedules", "heartbeat", "ticket-choice"]),
    db.from("locations").select("person, lat, lon, accuracy, updated_at"),
    db.from("checkins").select("person, place, lat, lon, created_at").order("created_at", { ascending: false }).limit(40),
    db.from("expenses").select("id, title, amount, category, spent_on, note, created_by, created_at"),
    s?.role === "team" ? db.from("app_state").select("key, value").like("key", "watch:%") : Promise.resolve({ data: [] }),
  ]);
  // Hidden admin overrides win over fetched data.
  const ovr = new Map((overrides.data ?? []).map((o) => [o.leg_id, o.data as Partial<LegLive>]));
  const safeLegs = Object.fromEntries(
    (legs.data ?? []).map((r) => {
      const d = { ...(r.data as LegLive), ...ovr.get(r.leg_id) };
      return [
        r.leg_id,
        {
          legId: r.leg_id,
          expectedDepart: d.expectedDepart,
          expectedArrive: d.expectedArrive,
          delayMin: d.delayMin,
          platform: d.platform,
          arrivalPlatform: d.arrivalPlatform,
          lastStation: d.lastStation,
          departed: d.departed,
          terminated: d.terminated,
          passengers: d.passengers,
          berths: d.berths,
          chartPrepared: d.chartPrepared,
          trainCancelled: d.trainCancelled,
          coachPosition: d.coachPosition,
          stations: d.stations,
          liveUpdatedAt: d.liveUpdatedAt,
          pnrUpdatedAt: d.pnrUpdatedAt,
          updatedAt: d.updatedAt,
          stale: d.stale,
        } satisfies LegLive,
      ];
    }),
  );
  const latest: Record<string, unknown> = {};
  for (const c of checkins.data ?? []) if (!latest[c.person]) latest[c.person] = c;
  return Response.json(
    {
      child: s?.person,
      legs: safeLegs,
      state: Object.fromEntries([...(states.data ?? []), ...(watches.data ?? [])].map((r) => [r.key, r.value])),
      locations: effectiveLocations((locs.data ?? []) as LocationRow[], now),
      checkins: latest,
      expenses: expenses.data ?? [],
      tripHash: (await tripData()).hash,
      at: now,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
