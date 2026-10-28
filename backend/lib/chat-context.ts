/**
 * The chat assistant's view of the trip: one compact, role-safe snapshot of
 * everything the app has already collected, shaped for both the Groq prompt
 * and the no-AI fallback answers (lib/chat-fallback.ts).
 *
 * Sources, all already collected by the app (nothing new is fetched here):
 * - the static trip plan (data/trip.ts) and its derived steps/connections
 *   (lib/trip-engine.ts, the same functions every screen uses),
 * - the live feed the background jobs write every 5 minutes: leg_live
 *   (PNR status, running status, platforms, berths), app_state weather
 *   (Open-Meteo), locations, check-ins and expenses (lib/chat.ts loads the
 *   same rows as /api/parent/state).
 *
 * Role safety mirrors the rest of the app: parents never see PNR numbers or
 * anyone else's ticket status, and nobody's raw GPS coordinates are put in
 * here (only "shared 12 min ago"), so nothing of the sort reaches Groq.
 *
 * Pure: no database, no network, no env. Unit-tested from the app's vitest.
 */
import { FOOD_SOURCE } from "@/data/food";
import {
  BLOCKS,
  CONNECTIONS,
  DEADLINES,
  EVENT,
  EVENT_SCHEDULE,
  LEGS,
  PLACES,
  TEAM,
  VENUE_NOTES,
  type Leg,
  type LegId,
  type PersonId,
} from "@/data/trip";
import { categoryLabel, type Expense } from "@/lib/expenses";
import type { LiveState, Weather } from "@/lib/live-types";
import type { PersonLocation } from "@/lib/locations";
import { ago, dayMonth, duration, hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import {
  buildSteps,
  chartTimeFor,
  computeNow,
  connectionStates,
  legBerths,
  legPassengers,
  legSituation,
  parseStatus,
  tripHealth,
} from "@/lib/trip-engine";
import { describeWeather } from "@/lib/weather";

export type ChatRole = "team" | "parent";
export type ChatViewer = { role: ChatRole; person: PersonId };

/** The rows of the app's data feed, as /api/parent/state returns them. */
export type ChatSnapshot = {
  legs: LiveState["legs"];
  state: LiveState["state"];
  locations: Partial<Record<PersonId, PersonLocation>>;
  checkins: Partial<Record<PersonId, { place: string | null; created_at: string }>>;
  expenses: Expense[];
};

export const EMPTY_SNAPSHOT: ChatSnapshot = { legs: {}, state: {}, locations: {}, checkins: {}, expenses: [] };

const name = (id: PersonId) => TEAM.find((p) => p.id === id)?.name ?? id;
const first = (id: PersonId) => name(id).split(" ")[0];
const at = (iso?: string) => (iso ? `${stamp(iso)} IST` : undefined);

export type LegContext = {
  id: LegId;
  kind: Leg["kind"];
  title: string;
  from: string;
  to: string;
  departPlanned: string;
  arrivePlanned: string;
  departExpected?: string;
  arriveExpected?: string;
  delayMin?: number;
  platform?: string;
  arrivalPlatform?: string;
  lastStation?: string;
  nextStop?: string;
  departed?: boolean;
  terminated?: boolean;
  trainCancelled?: boolean;
  chartPrepared?: boolean;
  chartAt?: string;
  /** PNR number: team viewers only, never present for a parent. */
  pnr?: string;
  travelClass?: string;
  fareTotal?: number;
  situation?: { title: string; advice: string };
  /** The viewer's (or their child's) own status and berth on this leg. */
  mine?: { status: string; booked: string; confirmChance?: number; berth?: string };
  /** Every passenger: team only. Parents only ever get `mine`. */
  passengers?: { name: string; current: string; confirmChance?: number }[];
  berths?: { name: string; seat: string }[];
  notes?: string[];
  modeHint?: string;
  liveUpdatedAgo?: string;
  stale?: boolean;
};

function legContext(leg: Leg, live: LiveState, viewer: ChatViewer, now: number): LegContext {
  const l = live.legs[leg.id];
  const team = viewer.role === "team";
  const mine = legPassengers(leg, live).find((p) => p.person === viewer.person);
  const myBerth = legBerths(leg, live).find((b) => b.person === viewer.person);
  const berths = legBerths(leg, live)
    .filter((b) => team || b.person === viewer.person)
    .map((b) => ({ name: name(b.person), seat: `${b.coach}/${b.berth} (${b.type})` }));
  const stations = l?.stations ?? [];
  const nextStop = stations.find((s) => !s.passed);
  return {
    id: leg.id,
    kind: leg.kind,
    title: leg.train ? `${leg.train.number} ${leg.train.name}` : (leg.title ?? `${PLACES[leg.from].short} to ${PLACES[leg.to].short}`),
    from: PLACES[leg.from].name,
    to: PLACES[leg.to].name,
    departPlanned: at(leg.depart)!,
    arrivePlanned: at(leg.arrive)!,
    departExpected: at(l?.expectedDepart),
    arriveExpected: at(l?.expectedArrive),
    delayMin: l?.delayMin,
    platform: l?.platform,
    arrivalPlatform: l?.arrivalPlatform,
    lastStation: l?.lastStation,
    nextStop: nextStop ? `${nextStop.name}, expected ${hhmm(nextStop.expArr ?? nextStop.schArr ?? now)}` : undefined,
    departed: l?.departed,
    terminated: l?.terminated,
    trainCancelled: l?.trainCancelled,
    chartPrepared: l?.chartPrepared,
    chartAt: leg.train ? `${dayMonth(chartTimeFor(leg))} ${hhmm(chartTimeFor(leg))} IST` : undefined,
    pnr: team ? leg.pnr : undefined,
    travelClass: leg.travelClass,
    fareTotal: leg.fareTotal,
    situation: leg.train ? legSituation(leg, live) : undefined,
    mine: mine
      ? {
          status: parseStatus(mine.current).label,
          booked: mine.booked,
          confirmChance: mine.confirmChance,
          berth: myBerth ? `${myBerth.coach}/${myBerth.berth} (${myBerth.type})` : undefined,
        }
      : undefined,
    passengers: team
      ? legPassengers(leg, live).map((p) => ({ name: name(p.person), current: parseStatus(p.current).label, confirmChance: p.confirmChance }))
      : undefined,
    berths: berths.length ? berths : undefined,
    notes: leg.notes,
    modeHint: leg.modeHint,
    liveUpdatedAgo: l?.updatedAt ? ago(l.updatedAt, now) : undefined,
    stale: l?.stale,
  };
}

export type ChatContext = {
  now: string;
  viewer: { role: ChatRole; name: string; focusPerson: string };
  phase: string;
  rightNow?: string;
  upNext?: string;
  instruction: string;
  upcomingSteps: { title: string; kind: string; when: string }[];
  legs: LegContext[];
  connections: { label: string; spare: string; health: string; planB?: string }[];
  tripHealth: string;
  weather: { place: string; now: string; today: string; fetchedAgo: string; nextDays: string[] }[];
  money: { totalSpent: number; entries: number; byCategory: { category: string; total: number }[]; recent: { title: string; amount: number; on: string }[] };
  teamWhere: { name: string; location: string; checkin?: string }[];
  deadlines?: { title: string; at: string; action: string }[];
  event: { name: string; venue: string; start: string; end: string; schedule: string[]; venueNotes: typeof VENUE_NOTES };
  blocks: { title: string; when: string; notes?: string[] }[];
  sources: { label: string; detail: string }[];
};

/** Builds the assistant's whole picture of the trip from the collected feed. */
export function buildChatContext(snap: ChatSnapshot, viewer: ChatViewer, now: number): ChatContext {
  const live: LiveState = { legs: snap.legs, state: snap.state, syncedAt: now };
  const team = viewer.role === "team";
  const steps = buildSteps(live);
  const state = computeNow(steps, now);
  const stepLabel = (s?: (typeof steps)[number]) =>
    s ? `${s.title} (${weekdayDate(s.start)} ${hhmm(s.start)} to ${hhmm(s.end)} IST)` : undefined;

  const weatherByPlace = (snap.state.weather ?? {}) as Record<string, Weather>;
  const totalSpent = snap.expenses.reduce((a, e) => a + e.amount, 0);
  const byCat = new Map<string, number>();
  for (const e of snap.expenses) byCat.set(categoryLabel(e.category), (byCat.get(categoryLabel(e.category)) ?? 0) + e.amount);

  const legUpdated = Object.values(snap.legs)
    .map((l) => l?.updatedAt ?? 0)
    .sort((a, b) => b - a)[0];
  const weatherFetched = Object.values(weatherByPlace)[0]?.fetchedAt;

  return {
    now: `${weekdayDate(now)}, ${hhmm(now)} IST`,
    viewer: {
      role: viewer.role,
      name: name(viewer.person),
      focusPerson: team ? "the viewer themselves" : `their child, ${name(viewer.person)}`,
    },
    phase: state.phase,
    rightNow: state.focusMode === "active" ? stepLabel(state.focus) : stepLabel(state.current),
    upNext: state.focusMode === "upcoming" ? stepLabel(state.focus) : stepLabel(state.next),
    instruction: state.instruction,
    upcomingSteps: steps
      .filter((s) => !s.minor && s.end > now)
      .slice(0, 10)
      .map((s) => ({ title: s.title, kind: s.kind, when: `${weekdayDate(s.start)} ${hhmm(s.start)} to ${dayMonth(s.end)} ${hhmm(s.end)} IST` })),
    legs: LEGS.map((leg) => legContext(leg, live, viewer, now)),
    connections: connectionStates(live).map((x) => ({
      label: x.label,
      spare: x.bufferMin >= 0 ? duration(x.bufferMin * 60_000) : "none: the outbound train leaves first",
      health: x.health,
      // Parents follow along; booking a Plan B is the team's job.
      planB: team ? CONNECTIONS.find((c) => c.id === x.id)?.planB.text : undefined,
    })),
    tripHealth: tripHealth(live, now).overall,
    weather: Object.values(weatherByPlace).map((w) => ({
      place: PLACES[w.placeId as keyof typeof PLACES]?.city ?? w.placeId,
      now: `${Math.round(w.tempC)}°C, ${describeWeather(w.code)}`,
      today: `${Math.round(w.todayMin)}° to ${Math.round(w.todayMax)}°C, ${w.rainChance}% rain chance`,
      fetchedAgo: ago(w.fetchedAt, now),
      nextDays: (w.days ?? []).slice(0, 4).map((d) => `${dayMonth(ms(`${d.date}T12:00:00+05:30`))}: ${d.min}°-${d.max}°C, ${d.rainChance}% rain`),
    })),
    money: {
      totalSpent,
      entries: snap.expenses.length,
      byCategory: [...byCat].map(([category, total]) => ({ category, total })),
      recent: [...snap.expenses]
        .sort((a, b) => b.spent_on.localeCompare(a.spent_on))
        .slice(0, 5)
        .map((e) => ({ title: e.title, amount: e.amount, on: e.spent_on })),
    },
    teamWhere: TEAM.map((p) => {
      const loc = snap.locations[p.id];
      const checkin = snap.checkins[p.id];
      return {
        name: p.name,
        location: loc
          ? loc.via === p.id
            ? `shared ${ago(loc.at, now)} from their own phone`
            : `with ${first(loc.via)} (their phone shared ${ago(loc.at, now)}); their own phone is not sharing`
          : "no location shared yet",
        checkin: checkin?.place ? `${checkin.place}, ${ago(Date.parse(checkin.created_at), now)}` : undefined,
      };
    }),
    deadlines: team
      ? DEADLINES.filter((d) => ms(d.at) > now).map((d) => ({ title: d.title, at: `${stamp(d.at)} IST`, action: d.action }))
      : undefined,
    event: {
      name: EVENT.name,
      venue: EVENT.venue,
      start: at(EVENT.start)!,
      end: at(EVENT.end)!,
      schedule: EVENT_SCHEDULE.map((s) => `${stamp(s.at)}: ${s.title}${s.tbc ? " (time to be confirmed)" : ""}`),
      venueNotes: VENUE_NOTES,
    },
    blocks: BLOCKS.map((b) => ({ title: b.title, when: `${stamp(b.start)} to ${stamp(b.end)} IST`, notes: b.notes })),
    sources: [
      { label: "Live train and ticket data (ConfirmTkt via the app's 5-minute jobs)", detail: legUpdated ? `updated ${ago(legUpdated, now)}` : "nothing fetched yet, showing the booked plan" },
      { label: "Weather (Open-Meteo)", detail: weatherFetched ? `fetched ${ago(weatherFetched, now)}` : "not fetched yet" },
      { label: "Trip plan", detail: "backend/data/trip.ts, the booked itinerary" },
      { label: "IRCTC menu and rates", detail: `${FOOD_SOURCE.url}, effective ${FOOD_SOURCE.updated}, checked ${FOOD_SOURCE.checked}` },
    ],
  };
}

/** Every PNR on the trip, for scrubbing assistant replies to parents. */
export const ALL_PNRS = LEGS.flatMap((l) => (l.pnr ? [l.pnr] : []));

/** Safety net: a parent must never be shown a PNR number, whatever the model says. */
export function scrubForParent(text: string): string {
  let out = text;
  for (const pnr of ALL_PNRS) out = out.split(pnr).join("(PNR hidden)");
  return out.replace(/\bPNR[:\s-]*\d{10}\b/gi, "PNR (hidden)");
}
