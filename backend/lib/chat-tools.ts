/**
 * Tools the Groq assistant can call mid-answer. Each one reads data the app
 * has already collected (the snapshot from lib/chat-context.ts); three of
 * them can also fetch fresh official data on demand through the providers
 * the background jobs already use:
 *
 * - get_train(refresh) and get_ticket(refresh): live running status / PNR
 *   from the same provider chain as lib/jobs/tick.ts (ConfirmTkt),
 * - get_weather: Open-Meteo when the collected copy is stale,
 * - get_delay_history: the saved recent runs behind the "Avg delay" view.
 *
 * Everything is read-only: the assistant can look, never book, cancel or
 * write. Refresh tools are team-only (matching /api/pnr/refresh), and a
 * parent's tools never return a PNR number or someone else's status.
 */
import { FOOD, FOOD_SOURCE } from "@/data/food";
import { EXPLORE, STATION_GUIDES } from "@/data/guides";
import { LEGS, PLACES, type Leg } from "@/data/trip";
import type { ChatContext, ChatSnapshot, ChatViewer } from "@/lib/chat-context";
import { averageDelays, loadRuns } from "@/lib/delay-runs";
import type { GroqTool } from "@/lib/Groq";
import { getLiveRunningStatus, getPnrStatus } from "@/lib/providers/index.ts";
import { HOUR, istDateKey } from "@/lib/time";
import { describeWeather, fetchWeather } from "@/lib/weather";

export type ChatToolDeps = { ctx: ChatContext; snap: ChatSnapshot; viewer: ChatViewer; now: number };

const legIdParam = {
  legId: { type: "string", enum: LEGS.filter((l) => l.train).map((l) => l.id), description: "Our leg id for one of our trains (see the trip context). Omit for the current/next train." },
};

export const CHAT_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "get_trip_overview",
      description: "Where the trip stands now: current and next step, connection buffers, overall health, upcoming steps. From collected data.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_train",
      description: "One of our trains: scheduled and expected times, delay, platform, last and next station. refresh=true fetches the live running status right now (team only); use it when the user asks to check now, or the collected data looks stale and the train is running.",
      parameters: { type: "object", properties: { ...legIdParam, refresh: { type: "boolean" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ticket",
      description: "Ticket status per passenger (CNF/RAC/WL, chart time, berths, confirmation chances). refresh=true checks the PNR live right now (team only).",
      parameters: { type: "object", properties: { ...legIdParam, refresh: { type: "boolean" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Weather for one of our places from the collected Open-Meteo forecast (fetches fresh if stale).",
      parameters: {
        type: "object",
        properties: { placeId: { type: "string", enum: Object.keys(PLACES), description: "Place id from the trip context (e.g. IITG for Guwahati)." } },
        required: ["placeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_food",
      description: "Official IRCTC train food prices (menurates.irctc.co.in, GST included). Query with an item name like 'veg meal', 'tea', 'biryani'.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_guides",
      description: "Station guides (exits, onward transport, food, facilities) and the Guwahati free-time list with leave-by times.",
      parameters: { type: "object", properties: { placeId: { type: "string", enum: Object.keys(PLACES), description: "Omit to get the Guwahati explore list." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_money",
      description: "What the trip has cost so far: totals, per-category sums and recent entries from the Money tab.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_where",
      description: "How recently each attendee's phone shared its location and their latest check-in place. Never returns coordinates.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_delay_history",
      description: "How late one of our trains usually runs: average delay per stop over its recent collected runs.",
      parameters: { type: "object", properties: { ...legIdParam }, required: ["legId"] },
    },
  },
];

const cap = (v: unknown) => JSON.stringify(v).slice(0, 4000);

function pickLeg(deps: ChatToolDeps, legId?: string): { leg: Leg; ctx: ChatContext["legs"][number] } | { error: string } {
  const leg = (legId ? LEGS.find((l) => l.id === legId) : undefined) ?? LEGS.find((l) => l.id === deps.ctx.legs.find((x) => x.kind === "train" && !x.terminated)?.id);
  const ctx = leg && deps.ctx.legs.find((l) => l.id === leg.id);
  return leg && ctx ? { leg, ctx } : { error: "Unknown leg" };
}

async function liveTrain(leg: Leg) {
  const board = PLACES[leg.from].code!;
  const r = await getLiveRunningStatus(leg.train!.number, istDateKey(leg.depart), board);
  const d = r.data;
  const upcoming = d.stations.filter((s) => !s.passed).slice(0, 5);
  const dest = d.stations.find((s) => s.code === PLACES[leg.to].code);
  return {
    fetchedJustNow: true,
    source: r.source,
    train: `${leg.train!.number} ${leg.train!.name}`,
    found: d.found,
    departed: d.departed,
    terminated: d.terminated,
    delayMin: d.delayMin,
    currentStation: d.currentStation,
    expectedArrivalAtOurStop: dest?.expArr ?? dest?.schArr,
    nextStops: upcoming.map((s) => ({ station: s.name, expected: s.expArr ?? s.expDep, delayMin: s.delayArrMin ?? s.delayDepMin, platform: s.platform })),
  };
}

async function liveTicket(leg: Leg) {
  if (!leg.pnr) return { error: "This leg has no PNR" };
  const r = await getPnrStatus(leg.pnr);
  const d = r.data;
  const order = (leg.passengers ?? []).map((p) => p.person);
  const bookedNo = (s?: string) => Number(s?.match(/(\d+)\s*$/)?.[1] ?? NaN);
  const personFor = (p: { number: number; booking: string }) =>
    leg.passengers?.find((x) => bookedNo(x.booked) === bookedNo(p.booking))?.person ?? order[p.number - 1];
  return {
    fetchedJustNow: true,
    source: r.source,
    train: d.trainName ?? leg.train?.name,
    chartPrepared: d.chartPrepared,
    trainCancelled: d.trainCancelled,
    expectedPlatform: d.expectedPlatform,
    coachPosition: d.coachPosition,
    passengers: d.passengers.map((p) => ({
      person: personFor(p),
      booked: p.booking,
      current: p.current,
      coach: p.coach,
      berth: p.berth,
      confirmChance: p.confirmChance,
    })),
  };
}

/** Runs one tool call; always resolves to a JSON string for the model. */
export async function runChatTool(name: string, args: Record<string, unknown>, deps: ChatToolDeps): Promise<string> {
  const { ctx, viewer, now } = deps;
  try {
    switch (name) {
      case "get_trip_overview":
        return cap({ now: ctx.now, rightNow: ctx.rightNow, upNext: ctx.upNext, instruction: ctx.instruction, connections: ctx.connections, tripHealth: ctx.tripHealth, upcomingSteps: ctx.upcomingSteps });
      case "get_train": {
        const picked = pickLeg(deps, args.legId as string | undefined);
        if ("error" in picked) return cap(picked);
        if (args.refresh === true) {
          if (viewer.role !== "team") return cap({ ...picked.ctx, note: "Live refresh is team-only; this is the latest collected data." });
          return cap({ collected: picked.ctx, live: await liveTrain(picked.leg) });
        }
        return cap(picked.ctx);
      }
      case "get_ticket": {
        const picked = pickLeg(deps, args.legId as string | undefined);
        if ("error" in picked) return cap(picked);
        const base = { title: picked.ctx.title, situation: picked.ctx.situation, mine: picked.ctx.mine, passengers: picked.ctx.passengers, berths: picked.ctx.berths, chartPrepared: picked.ctx.chartPrepared, chartAt: picked.ctx.chartAt, pnr: picked.ctx.pnr, liveUpdatedAgo: picked.ctx.liveUpdatedAgo };
        if (args.refresh === true) {
          if (viewer.role !== "team") return cap({ ...base, note: "Live PNR refresh is team-only; this is the latest collected data." });
          return cap({ collected: base, live: await liveTicket(picked.leg) });
        }
        return cap(base);
      }
      case "get_weather": {
        const place = PLACES[(args.placeId as keyof typeof PLACES) ?? "IITG"];
        const collected = ctx.weather.find((w) => w.place === place.city);
        const fresh = deps.snap.state.weather?.[place.id];
        if (fresh && now - fresh.fetchedAt < 3 * HOUR) return cap(collected ?? fresh);
        const w = await fetchWeather(place);
        return cap({
          fetchedJustNow: true,
          place: place.city,
          now: `${w.tempC}°C, ${describeWeather(w.code)}`,
          todayMin: w.todayMin,
          todayMax: w.todayMax,
          rainChance: w.rainChance,
          days: (w.days ?? []).slice(0, 5),
        });
      }
      case "search_food": {
        const q = String(args.query ?? "").toLowerCase();
        const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
        const items = FOOD.flatMap((s) => s.items.map((i) => ({ section: s.title, ...i })));
        // Most word matches first, so "veg meal" finds the Veg meal, not veg breakfasts.
        const hits = words.length
          ? items
              .map((i) => ({ i, score: words.filter((w) => i.name.toLowerCase().includes(w)).length }))
              .filter((x) => x.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((x) => x.i)
          : items;
        return cap({ source: FOOD_SOURCE, items: hits.slice(0, 12) });
      }
      case "get_guides": {
        const guide = STATION_GUIDES.find((g) => g.id === args.placeId);
        return cap(guide ? { station: PLACES[guide.id].name, ...guide } : { exploreGuwahati: EXPLORE });
      }
      case "get_money":
        return cap(ctx.money);
      case "get_team_where":
        return cap(ctx.teamWhere);
      case "get_delay_history": {
        const leg = LEGS.find((l) => l.id === args.legId && l.train);
        if (!leg) return cap({ error: "Unknown leg" });
        const runs = await loadRuns(leg.train!.number);
        if (!runs.length) return cap({ train: `${leg.train!.number} ${leg.train!.name}`, note: "No collected runs yet: the daily job saves one run a day." });
        const avg = averageDelays(runs);
        const ours = [PLACES[leg.from].code, PLACES[leg.to].code];
        return cap({
          train: `${leg.train!.number} ${leg.train!.name}`,
          runs: avg.runs,
          atOurStops: avg.stations.filter((s) => ours.includes(s.code)),
          worstStops: [...avg.stations].sort((a, b) => b.avgMin - a.avgMin).slice(0, 5),
        });
      }
      default:
        return cap({ error: `Unknown tool ${name}` });
    }
  } catch (e) {
    return cap({ error: e instanceof Error ? e.message : String(e) });
  }
}
