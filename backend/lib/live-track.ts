import { PLACES, type Leg } from "@/data/trip";
import { ROUTES } from "@/data/routes";
import type { LegLive } from "@/lib/live-types";
import type { StationStatus } from "@/lib/providers/types.ts";
import { MIN, hhmm, istDateKey, ms } from "@/lib/time";

/**
 * Live train tracking, NTES style: every station on the route (stops and
 * the ones it runs through), with scheduled and actual or expected times,
 * whether the train is yet to depart, at a station or between two, and
 * where on the map it is right now. Without live data it shows the
 * timetable; times at stations it doesn't stop at are estimated along the
 * distance between the stops around them.
 */

export type TrackPoint = {
  code: string;
  name: string;
  lat: number;
  lon: number;
  km: number;
  stop: boolean;
  /** Day of the run (1 = the day it left its origin). Stops only. */
  day?: number;
  schArr?: number;
  schDep?: number;
  /** Actual once passed, expected before (estimated at non-stop stations). */
  arr?: number;
  dep?: number;
  delayMin?: number;
  platform?: string;
  passed: boolean;
  /** From live data (true) or the timetable / an estimate (false). */
  actual: boolean;
};

export type TrackState = "yet" | "at" | "between" | "done";

export type Track = {
  trainNo: string;
  points: TrackPoint[];
  /** Our boarding and alighting stations (indexes into points). */
  from: number;
  to: number;
  live: boolean;
  state: TrackState;
  title: string;
  detail: string;
  /** Next stop the train will halt at, if running. */
  next?: TrackPoint;
  /** Date the train left (or leaves) its origin, YYYY-MM-DD. */
  startDate: string;
};

const DAY = 24 * 60 * MIN;
/** "2026-10-29", day 2, "07:22" -> epoch ms (IST). */
const at = (start: string, day: number, hm: string) => ms(`${start}T${hm}:00+05:30`) + (day - 1) * DAY;

export const lateText = (min?: number) => (!min || min <= 0 ? "on time" : min < 60 ? `${min} min late` : `${Math.floor(min / 60)}h ${min % 60}m late`);

/** The track for one of our train legs, from the route file, the timetable and whatever live data we have. */
export function buildTrack(leg: Leg, live: Pick<LegLive, "stations" | "departed" | "terminated"> | undefined, now: number): Track | null {
  const trainNo = leg.train?.number;
  const route = trainNo ? ROUTES[trainNo] : undefined;
  if (!route) return null;
  const boardCode = PLACES[leg.from].code;
  const alightCode = PLACES[leg.to].code;
  const stations = (live?.stations ?? []) as StationStatus[];
  const byCode = new Map(stations.map((s) => [s.code, s]));
  const isLive = stations.length > 0;

  // The run's start date: from live data, else back from our boarding day.
  const board = route.find((p) => p[0] === boardCode && p[5]);
  const startDate = isLive
    ? istDateKey(ms(stations[0].schDep ?? stations[0].schArr ?? leg.depart))
    : istDateKey(ms(leg.depart) - ((board?.[6] ?? 1) - 1) * DAY);

  const points: TrackPoint[] = route.map(([code, name, lat, lon, km, stop, day, arr, dep]) => {
    const p: TrackPoint = { code, name, lat, lon, km, stop: !!stop, passed: false, actual: false };
    if (!stop) return p;
    p.day = day;
    p.schArr = arr ? at(startDate, day, arr) : undefined;
    p.schDep = dep ? at(startDate, day, dep) : undefined;
    // Departure past midnight after an arrival before it.
    if (p.schArr && p.schDep && p.schDep < p.schArr) p.schDep += DAY;
    const s = byCode.get(code);
    if (s) {
      p.schArr = s.schArr ? ms(s.schArr) : p.schArr;
      p.schDep = s.schDep ? ms(s.schDep) : p.schDep;
      p.arr = s.expArr ? ms(s.expArr) : undefined;
      p.dep = s.expDep ? ms(s.expDep) : undefined;
      p.delayMin = s.delayArrMin ?? s.delayDepMin;
      p.platform = s.platform;
      p.passed = s.passed;
      p.actual = s.passed;
    }
    // No expected time yet: the timetable plus the last known delay.
    p.arr ??= p.schArr;
    p.dep ??= p.schDep;
    return p;
  });

  // Live: anything before the last passed stop is passed too; carry the delay forward to stops not reported.
  if (isLive) {
    const last = points.findLastIndex((p) => p.passed);
    let delay = 0;
    points.forEach((p, i) => {
      if (i < last) p.passed = true;
      if (!p.stop) return;
      if (byCode.has(p.code)) delay = p.delayMin ?? delay;
      else {
        p.arr = p.schArr && p.schArr + delay * MIN;
        p.dep = p.schDep && p.schDep + delay * MIN;
      }
    });
  }

  // Non-stop stations: time spread along the distance between the stops around them.
  for (let i = 0; i < points.length; ) {
    let j = i + 1;
    while (j < points.length && !points[j].stop) j++;
    if (j >= points.length) break;
    const a = points[i];
    const b = points[j];
    const t0 = a.dep ?? a.arr;
    const t1 = b.arr ?? b.dep;
    const s0 = a.schDep ?? a.schArr;
    const s1 = b.schArr ?? b.schDep;
    for (let k = i + 1; k < j; k++) {
      const f = (points[k].km - a.km) / Math.max(1, b.km - a.km);
      const p = points[k];
      if (t0 && t1) p.arr = p.dep = Math.round(t0 + f * (t1 - t0));
      if (s0 && s1) p.schArr = p.schDep = Math.round(s0 + f * (s1 - s0));
      p.delayMin = a.delayMin;
      if (isLive && !p.passed) p.passed = !!p.dep && p.dep <= now && (b.passed || !!a.passed);
    }
    i = j;
  }
  // Timetable only: passed by the clock.
  if (!isLive) for (const p of points) p.passed = (p.dep ?? p.arr ?? Infinity) <= now;

  const from = Math.max(0, points.findIndex((p) => p.code === boardCode));
  const toIdx = points.findIndex((p, i) => i > from && p.code === alightCode);
  const to = toIdx < 0 ? points.length - 1 : toIdx;
  const origin = points[0];
  const dest = points[points.length - 1];
  const base = { trainNo: trainNo!, points, from, to, live: isLive, startDate };

  const departed = isLive ? !!live?.departed || points.some((p) => p.passed) : (origin.dep ?? Infinity) <= now;
  if (!departed) {
    const leaves = origin.dep ?? origin.schDep!;
    return {
      ...base,
      state: "yet",
      title: "Train yet to depart",
      detail: `Leaves ${origin.name} ${dayLabel(leaves)} ${hhmm(leaves)}${from > 0 ? `; ${points[from].name} at ${hhmm(points[from].dep ?? points[from].schDep!)}` : ""}.`,
    };
  }
  const terminated = isLive ? !!live?.terminated || dest.passed : (dest.arr ?? Infinity) <= now;
  if (terminated) {
    return { ...base, state: "done", title: `Reached ${dest.name}`, detail: `Arrived ${dest.arr ? hhmm(dest.arr) : ""}${dest.delayMin ? `, ${lateText(dest.delayMin)}` : ", on time"}.` };
  }
  // At a stop between its arrival and departure.
  const here = points.find((p) => p.stop && p.arr !== undefined && p.dep !== undefined && p.arr <= now && now < p.dep && (!isLive || !nextAfter(points, p)?.passed));
  const nextStop = points.find((p) => p.stop && !p.passed && (p.arr ?? 0) > now && p !== here);
  if (here) {
    return {
      ...base,
      state: "at",
      next: nextStop,
      title: `At ${here.name}`,
      detail: `Arrived ${hhmm(here.arr!)}, leaves ${hhmm(here.dep!)}${here.platform ? ` from platform ${here.platform}` : ""}. ${cap(lateText(here.delayMin))}.`,
    };
  }
  const lastStop = [...points].reverse().find((p) => p.stop && p.passed) ?? origin;
  const crossed = [...points].reverse().find((p) => p.passed);
  return {
    ...base,
    state: "between",
    next: nextStop,
    title: `Between ${lastStop.name} and ${nextStop?.name ?? dest.name}`,
    detail: [
      `Left ${lastStop.name} ${lastStop.dep ? hhmm(lastStop.dep) : ""}, ${lateText(lastStop.delayMin)}.`,
      crossed && crossed !== lastStop && !crossed.stop ? `Crossed ${crossed.name} at ${hhmm(crossed.dep!)}.` : "",
      nextStop?.arr ? `Next stop ${nextStop.name} at ${hhmm(nextStop.arr)} (in ${Math.max(1, Math.round((nextStop.arr - now) / MIN))} min).` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

const nextAfter = (points: TrackPoint[], p: TrackPoint) => points[points.indexOf(p) + 1];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const dayLabel = (t: number) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(t));

/**
 * Where the train is at `now`: on a station while it halts, else part way
 * between the two points around it by time. Also the heading, for the map.
 */
export function trainPosition(track: Track, now: number) {
  const pts = track.points;
  const time = (p: TrackPoint) => p.dep ?? p.arr;
  if (track.state === "yet") return { lat: pts[0].lat, lon: pts[0].lon, bearing: bearing(pts[0], pts[1] ?? pts[0]), index: 0 };
  const last = pts[pts.length - 1];
  if (track.state === "done") return { lat: last.lat, lon: last.lon, bearing: bearing(pts[pts.length - 2] ?? last, last), index: pts.length - 1 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.arr !== undefined && a.arr <= now && now < (time(a) ?? 0)) return { lat: a.lat, lon: a.lon, bearing: bearing(a, b), index: i };
    const t0 = time(a);
    const t1 = b.arr ?? b.dep;
    if (t0 !== undefined && t1 !== undefined && t0 <= now && now < t1) {
      const f = (now - t0) / Math.max(1, t1 - t0);
      return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, bearing: bearing(a, b), index: i };
    }
  }
  // Clock and data disagree (e.g. a stale feed): stand at the last passed station.
  const i = Math.max(0, pts.findLastIndex((p) => p.passed));
  return { lat: pts[i].lat, lon: pts[i].lon, bearing: bearing(pts[i], pts[i + 1] ?? pts[i]), index: i };
}

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
