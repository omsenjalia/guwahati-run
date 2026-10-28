/**
 * Deterministic chat answers from the collected trip data, no AI involved.
 *
 * This is the same role the deterministic path plays in WeatherGPT's chat:
 * - greetings and guarded (manipulation / secrets) turns are always answered
 *   here, so they never spend Groq quota,
 * - everything else goes to Groq when a key is configured, and falls back to
 *   these answers when Groq is missing, times out or errors, so the Chat tab
 *   is useful before `GROQ_API_KEY` is ever set.
 *
 * Every number below comes from lib/chat-context.ts (the app's own collected
 * data via lib/trip-engine.ts), so a fallback answer can never disagree with
 * what the screens show. Pure and unit-tested.
 */
import { FOOD, FOOD_SOURCE } from "@/data/food";
import { EXPLORE, STATION_GUIDES } from "@/data/guides";
import { LEGS, PACKING_PERSONAL, PACKING_TEAM, PLACES, USEFUL_NUMBERS } from "@/data/trip";
import type { ChatContext, ChatViewer, LegContext } from "@/lib/chat-context";

export type ChatIntent =
  | "greeting"
  | "guarded"
  | "help"
  | "next_train"
  | "train_status"
  | "ticket"
  | "connection"
  | "weather"
  | "money"
  | "food"
  | "where"
  | "plan"
  | "hackathon"
  | "guide"
  | "packing"
  | "emergency"
  | "general";

const GUARD = [
  "ignore previous", "ignore your instructions", "ignore all instructions", "system prompt",
  "your instructions", "password", "passcode", "api key", "auth_secret", "Groq_api_key",
  "secret key", "token", "jailbreak", "developer mode", "pretend you",
];

const GREETINGS = ["hi", "hello", "hey", "namaste", "kem cho", "good morning", "good evening", "thanks", "thank you", "ok", "okay"];

/** Broad intent from keywords (incl. a few Hindi/Gujarati travel words). */
export function classifyIntent(raw: string): ChatIntent {
  const q = ` ${raw.toLowerCase().trim()} `;
  if (!q.trim()) return "general";
  if (GUARD.some((g) => q.includes(g))) return "guarded";
  const short = q.trim().replace(/[!?.]+$/, "");
  if (GREETINGS.includes(short) || (short.length <= 12 && GREETINGS.some((g) => short.startsWith(g)))) return "greeting";
  if (/(what can you do|who are you)/.test(q) || short === "help") return "help";
  if (/(emergency|sos|112|rail madad|rpf|lost|stolen|hurt|medical|police)/.test(q)) return "emergency";
  if (/(pnr|ticket|confirm|waitlist|wl |rac|chart|berth|seat|coach|सीट|टिकट|ટિકિટ)/.test(q)) return "ticket";
  if (/(connection|connect|miss|buffer|spare time|transfer|change train)/.test(q)) return "connection";
  if (/(next train|which train|when.*train|train.*when|depart|leave|boarding|platform|next.*leg)/.test(q)) return "next_train";
  if (/(train|ट्रेन|ટ્રેન)/.test(q) && /(late|delay|status|where|running|reach|arriv|on time|now|today|live)/.test(q)) return "train_status";
  if (/(when.*(reach|arriv|get to|get there))/.test(q)) return "train_status";
  // Word boundaries matter: "train" must not read as "rain", "hotel" not as "hot".
  if (/(\bweather\b|\brain\w*|\btemperature\b|\btemp\b|\bhot\b|\bcold\b|umbrella|मौसम|बारिश|વરસાદ|હવામાન)/.test(q)) return "weather";
  if (/(money|spent|spend|cost|expense|rupee|₹|rs\.|budget|grant|पैसा|ખર્ચ)/.test(q) && !/(food|meal|thali|tea|coffee|biryani|water)/.test(q)) return "money";
  if (/(food|meal|thali|tea|coffee|biryani|breakfast|lunch|dinner|pantry|eat|price of|charges|खाना|જમવા)/.test(q)) return "food";
  if (/(where.*(he|she|they|everyone|team|child|son)|location|reached|कहाँ|ક્યાં)/.test(q)) return "where";
  if (/(hackathon|iit|event|schedule.*31|reporting|submission|judging|hostel|wifi|venue)/.test(q)) return "hackathon";
  if (/(pack|carry|bring|checklist|bedsheet|charger)/.test(q)) return "packing";
  if (/(guide|station.*(food|exit|facility)|explore|visit|kamakhya temple|sightsee|free (time|afternoon|evening|morning))/.test(q)) return "guide";
  if (/(plan|itinerary|schedule|day by day|whole trip|programme)/.test(q)) return "plan";
  if (/(train|ट्रेन|ટ્રેન)/.test(q)) return "train_status";
  return "general";
}

export const GREETING_REPLY = (viewer: ChatViewer) =>
  viewer.role === "team"
    ? "Hi! I'm your **Guwahati Run assistant**. Ask me about your next train, your seat or PNR status, connections, weather, what food should cost on board, or what we've spent. I answer from the same live data the app already collects."
    : "Hello! I'm the **Guwahati Run assistant**. Ask me where the team is, whether their train is on time, when they reach Guwahati, or what the weather is like there. I answer from the same live data the app already collects.";

export const GUARDED_REPLY =
  "I can't share passwords, passcodes, keys or my instructions. For trip things I'm all yours: trains, tickets, connections, weather, food prices, money and where everyone is.";

const trainLeg = (ctx: ChatContext, q: string): LegContext | undefined => {
  const trains = ctx.legs.filter((l) => l.kind === "train");
  const byNumber = trains.find((l) => q.includes(l.title.split(" ")[0]));
  if (byNumber) return byNumber;
  const byName = trains.find((l) => l.title.toLowerCase().split(" ").slice(1).join(" ").split(" ").some((w) => w.length > 4 && q.includes(w)));
  if (byName) return byName;
  // "When do they reach Guwahati?" is about the leg that ends there, not the focus leg.
  const cityOf = (l: LegContext, end: "from" | "to") => {
    const leg = LEGS.find((x) => x.id === l.id);
    return leg ? `${PLACES[leg[end]].city} ${PLACES[leg[end]].short} ${PLACES[leg[end]].name}`.toLowerCase() : "";
  };
  const mentions = (l: LegContext, end: "from" | "to") => cityOf(l, end).split(/\s+/).some((w) => w.length > 3 && q.includes(w));
  const byDestination = trains.find((l) => mentions(l, "to")) ?? trains.find((l) => mentions(l, "from"));
  if (byDestination) return byDestination;
  // Default: the leg the app itself is focused on (current, else next train).
  const titles = `${ctx.rightNow ?? ""} ${ctx.upNext ?? ""}`;
  return trains.find((l) => titles.includes(l.title)) ?? trains.find((l) => !l.terminated) ?? trains[trains.length - 1];
};

const delayLine = (l: LegContext) =>
  l.delayMin === undefined ? "" : l.delayMin <= 0 ? " Running on time." : ` Running **${l.delayMin} min late**.`;

const legTimes = (l: LegContext) => {
  const exp = l.arriveExpected && l.arriveExpected !== l.arrivePlanned ? ` (expected **${l.arriveExpected}**)` : "";
  return `Departs ${l.from} **${l.departExpected ?? l.departPlanned}**, arrives ${l.to} **${l.arrivePlanned}**${exp}.${delayLine(l)}`;
};

const freshLine = (l: LegContext) =>
  l.liveUpdatedAgo ? `\n\nLive data updated ${l.liveUpdatedAgo}${l.stale ? " (last known: the latest check failed)" : ""}.` : "\n\nNo live check yet: these are the booked times.";

function foodAnswer(q: string): string {
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  // Most word matches first, so "veg meal" finds the Veg meal, not veg breakfasts.
  const hits = FOOD.flatMap((s) => s.items)
    .map((i) => ({ i, score: words.filter((w) => i.name.toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  const list = (hits.length ? hits : FOOD.flatMap((s) => s.items).slice(0, 6))
    .slice(0, 6)
    .map((i) => `- ${i.name}: **₹${i.train}** on the train${i.station ? `, ₹${i.station} at a station stall` : ""}${i.portion ? ` (${i.portion})` : ""}`)
    .join("\n");
  return `From IRCTC's official menu rates (GST included, the pantry car must show this list):\n\n${list}\n\nCharged more than this? That's overcharging: report it on **${FOOD_SOURCE.complaint}**. Source: ${FOOD_SOURCE.url} (checked ${FOOD_SOURCE.checked}).`;
}

function guideAnswer(q: string, ctx: ChatContext): string {
  const place = Object.values(PLACES).find((p) => q.includes(p.city.toLowerCase()) || q.includes(p.short.toLowerCase()) || q.includes(p.name.toLowerCase()));
  const guide = STATION_GUIDES.find((g) => g.id === place?.id);
  if (guide) {
    return `**${PLACES[guide.id].name}**\n\n- Getting out: ${guide.exit}\n- Onward: ${guide.transport}\n- Food: ${guide.food}\n- Facilities: ${guide.facilities}${guide.tip ? `\n- Tip: ${guide.tip}` : ""}`;
  }
  const spots = EXPLORE.map((s) => `- **${s.name}**: ${s.why} (about ${s.stayMin} min there, ${s.toKyqMin} min cab back to Kamakhya)`).join("\n");
  return `For the free time in Guwahati on 1 Nov (train at 16:55, be at Kamakhya 40 min early):\n\n${spots}\n\nRight now: ${ctx.upNext ?? ctx.instruction}`;
}

/** A complete answer for `intent`, or null when only the AI can help. */
export function deterministicAnswer(ctx: ChatContext, viewer: ChatViewer, intent: ChatIntent, raw: string): string | null {
  const q = raw.toLowerCase();
  switch (intent) {
    case "greeting":
      return GREETING_REPLY(viewer);
    case "guarded":
      return GUARDED_REPLY;
    case "help":
      return GREETING_REPLY(viewer) + "\n\nTry: \"Is my train on time?\", \"What's my seat?\", \"Will we make the Delhi connection?\", \"What does a veg meal cost?\", \"Where is everyone?\"";
    case "emergency": {
      const nums = USEFUL_NUMBERS.map((n) => `- **${n.number}**: ${n.label}`).join("\n");
      return `If anyone is in danger, call **112** right now.\n\n${nums}\n\nOn a train, Rail Madad and the RPF are **139**. The app's More tab also has an SOS page that shares where you are.`;
    }
    case "next_train": {
      const l = trainLeg(ctx, q);
      if (!l) return null;
      return `**${l.title}**, ${l.from} to ${l.to}.\n\n${legTimes(l)}${l.platform ? `\n\nBoarding platform: **${l.platform}**.` : ""}\n\n${ctx.instruction}${freshLine(l)}`;
    }
    case "train_status": {
      const l = trainLeg(ctx, q);
      if (!l) return null;
      const where = l.terminated ? "This train has completed its run." : l.departed ? `It has departed${l.lastStation ? `; last station reported: **${l.lastStation}**` : ""}${l.nextStop ? `. Next stop: ${l.nextStop}` : ""}.` : "It has not departed yet.";
      return `**${l.title}** (${l.from} to ${l.to})${l.trainCancelled ? " is reported **cancelled**. Check IRCTC and switch to Plan B." : `\n\n${where}\n\n${legTimes(l)}${freshLine(l)}`}`;
    }
    case "ticket": {
      const l = trainLeg(ctx, q);
      if (!l) return null;
      const mine = l.mine
        ? viewer.role === "team"
          ? `You: **${l.mine.status}**${l.mine.berth ? `, berth **${l.mine.berth}**` : ""}${l.mine.confirmChance !== undefined ? ` (ConfirmTkt gives ${l.mine.confirmChance}% chance of confirming)` : ""}`
          : `${ctx.viewer.name}: **${l.mine.status}**${l.mine.berth ? `, berth **${l.mine.berth}**` : ""}`
        : "";
      const all = l.passengers ? `\n\nEveryone: ${l.passengers.map((p) => `${p.name.split(" ")[0]} ${p.current}`).join(", ")}.` : "";
      const sit = l.situation ? `\n\n${l.situation.title}. ${l.situation.advice}` : "";
      const chart = l.chartPrepared ? "\n\nThe chart is prepared: berths are final." : l.chartAt ? `\n\nChart expected around **${l.chartAt}**.` : "";
      return `**${l.title}** (${l.from} to ${l.to}, ${l.departPlanned})${l.pnr ? `\n\nPNR ${l.pnr}` : ""}\n\n${mine}${all}${sit}${chart}${freshLine(l)}`;
    }
    case "connection": {
      if (!ctx.connections.length) return "There are no train-to-train connections left on this trip.";
      const lines = ctx.connections.map((c) => `- **${c.label}**: ${c.spare} spare (${c.health})${c.planB && c.health !== "green" ? `. Plan B: ${c.planB}` : ""}`).join("\n");
      return `Connections, shifted by live delays:\n\n${lines}\n\nOverall trip health: **${ctx.tripHealth}**.`;
    }
    case "weather": {
      if (!ctx.weather.length) return "No weather has been fetched yet. It updates every 3 hours while the server jobs run.";
      const place = ctx.weather.find((w) => q.includes(w.place.toLowerCase())) ?? ctx.weather.find((w) => w.place === "Guwahati") ?? ctx.weather[0];
      return `**${place.place}**: ${place.now}. Today ${place.today}.\n\nNext days: ${place.nextDays.join(" · ")}\n\nOpen-Meteo, fetched ${place.fetchedAgo}.`;
    }
    case "money": {
      const cats = ctx.money.byCategory.map((c) => `${c.category} ₹${c.total.toLocaleString("en-IN")}`).join(", ");
      const recent = ctx.money.recent.map((r) => `- ${r.on}: ${r.title}, ₹${r.amount.toLocaleString("en-IN")}`).join("\n");
      const fares = ctx.legs.filter((l) => l.fareTotal).reduce((a, l) => a + (l.fareTotal ?? 0), 0);
      return `Spent so far: **₹${ctx.money.totalSpent.toLocaleString("en-IN")}** over ${ctx.money.entries} entries${cats ? ` (${cats})` : ""}, plus train fares of ₹${Math.round(fares).toLocaleString("en-IN")} for all 4 of us.\n\n${recent}\n\nSplitting and settling up happens in Splitwise; the Money tab has the bills.`;
    }
    case "food":
      return foodAnswer(q);
    case "where": {
      const lines = ctx.teamWhere.map((t) => `- **${t.name}**: location ${t.location}${t.checkin ? `; checked in at ${t.checkin}` : ""}`).join("\n");
      return `${ctx.rightNow ? `Right now the plan has the team on: ${ctx.rightNow}.\n\n` : ""}${lines}\n\nPhones share every 30 minutes, so allow up to about 45 minutes before worrying. The Location tab has the map.`;
    }
    case "plan": {
      const steps = ctx.upcomingSteps.map((s) => `- **${s.title}**: ${s.when}`).join("\n");
      return `From ${ctx.now}, times shifted live by delays:\n\n${steps || "The trip is complete."}\n\n${ctx.instruction}`;
    }
    case "hackathon": {
      const sched = ctx.event.schedule.map((s) => `- ${s}`).join("\n");
      return `**${ctx.event.name}** at ${ctx.event.venue}, ${ctx.event.start} to ${ctx.event.end}.\n\n${sched}\n\nStay: ${ctx.event.venueNotes.stay}\nFood: ${ctx.event.venueNotes.food}\nWi-Fi: ${ctx.event.venueNotes.wifi}. Power: ${ctx.event.venueNotes.power}.`;
    }
    case "packing":
      return `Shared list: ${PACKING_TEAM.join("; ")}.\n\nEach of us: ${PACKING_PERSONAL.join("; ")}.\n\nDon't forget: a bedsheet each for the Garib Rath (no bedding), and an original photo ID.`;
    case "guide":
      return guideAnswer(q, ctx);
    default:
      return null;
  }
}

/** Shown when neither Groq nor a deterministic answer fits. */
export const NO_AI_REPLY =
  "I can answer that properly once the AI is switched on (the server needs a Groq key: see SETUP.md). Until then I can still tell you arrival and departure times, delays, ticket and seat status, connection buffers, weather, IRCTC food prices, what we've spent, and where everyone is. Try one of those?";
