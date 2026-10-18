/**
 * Builds data/routes.ts: every station each of our trains passes, in order,
 * with map coordinates, distance from the origin and whether it stops there.
 *
 *   node backend/scripts/build-routes.mjs
 *
 * Stops and their distances come from the live train source (ConfirmTkt,
 * a recent run). The non-stop stations between two stops, and every
 * station's coordinates, come from datameet's open Indian Railways data
 * (github.com/datameet/railways, ODbL): for each pair of stops we take the
 * train in that dataset listing the most stations between them whose path
 * length matches the real distance. Run it again when a train number in
 * data/trip.ts changes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "data", "routes.ts");
const CACHE = join(tmpdir(), "gr-datameet");
const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";

async function datameet(name) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, name);
  if (!existsSync(file)) {
    const res = await fetch(`https://raw.githubusercontent.com/datameet/railways/master/${name}`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Stops of the latest run we can find (the API keys runs by origin date). */
async function liveStops(trainNo) {
  for (let back = 0; back <= 6; back++) {
    const d = new Date(Date.now() + 5.5 * 3600_000 - back * 86400_000).toISOString().slice(0, 10);
    const dmy = d.split("-").reverse().join("-");
    const res = await fetch(`https://api.confirmtkt.com/api/trains/livestatusall?trainno=${trainNo}&doj=${dmy}&getNames=true`, { headers: { "User-Agent": UA } });
    const j = await res.json().catch(() => ({}));
    if (j.trainDataFound === "trainRunningDataFound" && j.stations?.length) {
      return j.stations.map((s) => ({ code: s.stnCode, name: s.stnCodeName, km: s.distance, day: s.schDayCnt, arr: s.schArrTime || "", dep: s.schDepTime || "" }));
    }
  }
  throw new Error(`${trainNo}: no recent run found`);
}

const rad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const title = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b(Jn|Trm|Cantt)\b/gi, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

const trip = readFileSync(join(here, "..", "data", "trip.ts"), "utf8");
const numbers = [...new Set([...trip.matchAll(/train: \{ number: "(\d{5})"/g)].map((m) => m[1]))];

const stations = new Map();
for (const f of (await datameet("stations.json")).features) {
  if (f.geometry) stations.set(f.properties.code, { lonlat: f.geometry.coordinates, name: f.properties.name });
}
const byTrain = new Map();
for (const s of await datameet("schedules.json")) {
  if (!byTrain.has(s.train_number)) byTrain.set(s.train_number, []);
  byTrain.get(s.train_number).push(s);
}
const sequences = [...byTrain.values()].map((list) => list.sort((a, b) => a.id - b.id).map((s) => s.station_code));
const index = new Map(); // station code -> sequences containing it
sequences.forEach((seq, i) => seq.forEach((c) => (index.get(c) ?? index.set(c, new Set()).get(c)).add(i)));

/** Stations between two stops, from the dataset train that lists the most while matching the real distance. */
function between(a, b, realKm) {
  let best = [];
  for (const i of index.get(a.code) ?? []) {
    const seq = sequences[i];
    const ia = seq.indexOf(a.code);
    const ib = seq.indexOf(b.code, ia + 1);
    if (ia < 0 || ib < 0 || ib - ia - 1 <= best.length || ib - ia > 120) continue;
    const path = seq.slice(ia, ib + 1).map((c) => stations.get(c)?.lonlat).filter(Boolean);
    let len = 0;
    for (let k = 1; k < path.length; k++) len += km(path[k - 1], path[k]);
    // Same track if the path is about as long as the real distance.
    if (realKm > 5 && (len < realKm * 0.6 || len > realKm * 1.3)) continue;
    best = seq.slice(ia + 1, ib);
  }
  return best;
}

const out = {};
for (const no of numbers) {
  const stops = await liveStops(no);
  const pts = [];
  stops.forEach((s, i) => {
    pts.push({ ...s, stop: true });
    const next = stops[i + 1];
    if (!next) return;
    const mid = between(s, next, next.km - s.km).filter((c) => !stops.some((x) => x.code === c));
    for (const c of mid) pts.push({ code: c, name: title(stations.get(c)?.name ?? c), km: undefined, stop: false, day: 0, arr: "", dep: "" });
  });
  // Coordinates: from the dataset, else halfway between known neighbours.
  pts.forEach((p) => (p.lonlat = stations.get(p.code)?.lonlat));
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].lonlat) continue;
    const prev = pts.slice(0, i).reverse().find((p) => p.lonlat);
    const nxt = pts.slice(i + 1).find((p) => p.lonlat);
    pts[i].lonlat = prev && nxt ? [(prev.lonlat[0] + nxt.lonlat[0]) / 2, (prev.lonlat[1] + nxt.lonlat[1]) / 2] : (prev ?? nxt)?.lonlat;
  }
  // Distances of non-stop stations: spread along the real distance between the stops around them, by map distance.
  for (let i = 0; i < pts.length; ) {
    let j = i + 1;
    while (j < pts.length && !pts[j].stop) j++;
    if (j >= pts.length) break;
    const geo = [0];
    for (let k = i + 1; k <= j; k++) geo.push(geo[geo.length - 1] + (pts[k].lonlat && pts[k - 1].lonlat ? km(pts[k - 1].lonlat, pts[k].lonlat) : 0));
    const total = geo[geo.length - 1] || 1;
    for (let k = i + 1; k < j; k++) pts[k].km = Math.round(pts[i].km + ((pts[j].km - pts[i].km) * geo[k - i]) / total);
    i = j;
  }
  out[no] = pts.filter((p) => p.lonlat).map((p) => [p.code, p.name, +p.lonlat[1].toFixed(4), +p.lonlat[0].toFixed(4), p.km, p.stop ? 1 : 0, p.day, p.arr, p.dep]);
  console.log(`${no}: ${stops.length} stops, ${out[no].length} stations`);
}

writeFileSync(
  OUT,
  `/**
 * Every station our trains pass, in order: [code, name, lat, lon, km from origin, stops here (1) or not (0),
 * then for stops the timetable: day of the run (1 = the day it leaves its origin), arrival and departure "HH:MM" ("" at the ends).
 * Generated by backend/scripts/build-routes.mjs (live stops + datameet open data, ODbL). Don't edit by hand.
 */
export type RoutePoint = [code: string, name: string, lat: number, lon: number, km: number, stop: 0 | 1, day: number, arr: string, dep: string];

export const ROUTES: Record<string, RoutePoint[]> = ${JSON.stringify(out)
    .replace(/\],\[/g, "],\n    [")
    .replace(/:\[\[/g, ": [\n    [")
    .replace(/\]\],"/g, "]],\n  \"")};
`,
);
console.log(`Wrote ${OUT}`);
