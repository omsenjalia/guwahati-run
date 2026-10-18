import { BACKUPS, LEGS } from "@/data/trip";
import { ROUTES } from "@/data/routes";
import { isDeveloper, sessionFrom } from "@/lib/auth";
import { getLiveRunningStatus } from "@/lib/providers/index.ts";
import { istDateKey } from "@/lib/time";

export const maxDuration = 60;

/**
 * Developer test for live tracking (Om only): the latest real run of one of
 * our trains (today's if it has left, else the day before...), fetched now
 * and returned as-is. Nothing is saved, so the trip's own data is untouched.
 */
export async function GET(request: Request) {
  if (!isDeveloper(await sessionFrom(request))) return Response.json({ error: "Developer only" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("leg");
  const leg = [...LEGS, ...BACKUPS].find((l) => l.id === id && l.train);
  const origin = leg && ROUTES[leg.train!.number]?.[0]?.[0];
  if (!leg || !origin) return Response.json({ error: "No train with that id" }, { status: 404 });
  const errors: string[] = [];
  for (let back = 0; back <= 4; back++) {
    const date = istDateKey(Date.now() - back * 24 * 3600_000);
    try {
      const r = await getLiveRunningStatus(leg.train!.number, date, origin);
      if (r.data.found && r.data.departed) {
        const d = r.data;
        return Response.json(
          {
            startDate: d.startDate,
            live: { stations: d.stations, departed: d.departed, terminated: d.terminated, delayMin: d.delayMin, liveUpdatedAt: r.fetchedAt },
            source: r.source,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch (e) {
      errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return Response.json({ error: `No recent run found. ${errors.join(" | ")}` }, { status: 502 });
}
