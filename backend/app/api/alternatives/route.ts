import { NE_ALTERNATIVES } from "@/data/trip";
import { getAvailability, getLiveRunningStatus } from "@/lib/providers/index.ts";

/**
 * Plan B for 12506: live seats and times on the other Delhi to Guwahati
 * trains for 29 Oct. Team-only (proxy.ts). Each train is fetched
 * independently, so one failure doesn't hide the rest.
 */

export type Alternative = {
  number: string;
  name: string;
  from: string;
  to: string;
  depart?: string;
  arrive?: string;
  classes: { travelClass: string; status: string; confirmChance?: number; verdict?: string }[];
  error?: string;
};

const dmy = (ymd: string) => ymd.split("-").reverse().join("-");

export async function GET() {
  const date = NE_ALTERNATIVES.date;
  const list = await Promise.all(
    NE_ALTERNATIVES.trains.map(async (t): Promise<Alternative> => {
      const base = { number: t.number, name: t.name, from: t.fromName, to: t.toName, classes: [] };
      try {
        const [times, ...avail] = await Promise.allSettled([
          getLiveRunningStatus(t.number, date, t.from),
          ...NE_ALTERNATIVES.classes.map((c) =>
            getAvailability({ trainNo: t.number, from: t.from, to: t.to, date: dmy(date), travelClass: c, quota: "GN" }),
          ),
        ]);
        const stations = times.status === "fulfilled" ? times.value.data.stations : [];
        const classes = avail.flatMap((r) => {
          if (r.status !== "fulfilled") return [];
          const day = r.value.data.find((d) => d.date === date);
          return day ? [{ travelClass: day.travelClass, status: day.status, confirmChance: day.confirmChance, verdict: day.verdict }] : [];
        });
        return {
          ...base,
          depart: stations.find((s) => s.code === t.from)?.schDep,
          arrive: stations.find((s) => s.code === t.to)?.schArr,
          classes,
          error: classes.length ? undefined : "No seat data right now",
        };
      } catch (e) {
        return { ...base, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return Response.json({ fetchedAt: Date.now(), date, trains: list }, { headers: { "Cache-Control": "no-store" } });
}
