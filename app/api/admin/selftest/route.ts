import { FALLBACK_TRAINS, LEGS, PLACES } from "@/data/trip";
import { getAvailability, getLiveRunningStatus, getPnrStatus, AllProvidersFailed } from "@/lib/providers/index.ts";
import { istDateKey } from "@/lib/time";

/**
 * Calls every provider with our real PNRs and trains and reports what came
 * back. Team-only (the proxy requires the team passcode cookie).
 */

type Check = {
  group: "PNR" | "Live status" | "Availability";
  label: string;
  ok: boolean;
  source?: string;
  ms: number;
  summary: string;
  error?: string;
};

async function timed(group: Check["group"], label: string, fn: () => Promise<{ source: string; summary: string }>): Promise<Check> {
  const t = Date.now();
  try {
    const r = await fn();
    return { group, label, ok: true, source: r.source, summary: r.summary, ms: Date.now() - t };
  } catch (e) {
    const error = e instanceof AllProvidersFailed ? e.message : e instanceof Error ? e.message : String(e);
    return { group, label, ok: false, summary: "", error, ms: Date.now() - t };
  }
}

const dmy = (ymd: string) => ymd.split("-").reverse().join("-");

export async function GET() {
  const trains = LEGS.filter((l) => l.kind === "train" || l.kind === "local-train");
  const today = istDateKey(Date.now());

  const pnrChecks = trains
    .filter((l) => l.pnr)
    .map((l) =>
      timed("PNR", `${l.train!.number} ${l.train!.name}`, async () => {
        const r = await getPnrStatus(l.pnr!);
        const p = r.data.passengers;
        const chances = p.map((x) => x.confirmChance).filter((x): x is number => x !== undefined);
        const parts = [
          p.map((x) => (x.coach && x.berth ? `${x.coach}/${x.berth}${x.berthCode ? ` ${x.berthCode}` : ""}` : x.current)).join(", "),
          chances.length && !p.every((x) => x.berth) ? `${Math.min(...chances)}-${Math.max(...chances)}% chance` : "",
          r.data.chartPrepared ? "chart prepared" : "chart not yet",
          r.data.expectedPlatform ? `PF ${r.data.expectedPlatform}` : "",
        ];
        return { source: r.source, summary: parts.filter(Boolean).join(". ") };
      }),
    );

  // Today's run proves the connector works; our own travel dates only return
  // data once those runs exist.
  const liveChecks = trains.flatMap((l) => {
    const board = PLACES[l.from].code!;
    const travel = istDateKey(l.depart);
    return [today, travel].map((date) =>
      timed("Live status", `${l.train!.number} on ${date === today ? "today" : dmy(travel)}`, async () => {
        const r = await getLiveRunningStatus(l.train!.number, date, board);
        const d = r.data;
        if (!d.found) return { source: r.source, summary: "No running data for this date yet (normal before the run starts)." };
        const at = d.stations.find((s) => s.code === board);
        const summary = [
          d.terminated ? "Reached destination" : d.departed ? `Near ${d.currentStation?.name ?? "?"}` : "Not departed yet",
          d.delayMin !== undefined ? (d.delayMin > 0 ? `${d.delayMin} min late` : "on time") : "",
          at?.platform ? `PF ${at.platform} at ${board}` : "",
          `${d.stations.length} stops`,
          d.providerUpdatedAt ? `source time ${d.providerUpdatedAt}` : "",
        ];
        return { source: r.source, summary: summary.filter(Boolean).join(". ") };
      }),
    );
  });

  const availQueries = [
    { trainNo: "19031", from: "SBIB", to: "DLI", date: "28-10-2026", travelClass: "SL", quota: "GN" as const },
    { trainNo: "12506", from: "ANVT", to: "KYQ", date: "29-10-2026", travelClass: "3A", quota: "GN" as const },
    { trainNo: FALLBACK_TRAINS.L4.number, from: "NZM", to: "ANND", date: "03-11-2026", travelClass: "3A", quota: "GN" as const },
  ];
  const availChecks = availQueries.map((q) =>
    timed("Availability", `${q.trainNo} ${q.travelClass} ${q.from}-${q.to} on ${q.date}`, async () => {
      const r = await getAvailability(q);
      const day = r.data.find((d) => dmy(d.date) === q.date) ?? r.data[0];
      if (!day) return { source: r.source, summary: "No availability returned." };
      return {
        source: r.source,
        summary: [day.status, day.confirmChance !== undefined ? `${day.confirmChance}% chance` : "", day.verdict].filter(Boolean).join(". "),
      };
    }),
  );

  const checks = await Promise.all([...pnrChecks, ...liveChecks, ...availChecks]);
  return Response.json({ ranAt: Date.now(), checks }, { headers: { "Cache-Control": "no-store" } });
}
