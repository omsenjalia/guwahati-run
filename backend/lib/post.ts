import { EVENT, LEGS, PLACES, TEAM } from "@/data/trip";
import { HOUR, ms } from "@/lib/time";

/** A trip journal note (journal_entries; photo in the private trip-files bucket). */
export type Entry = { id: string; day: string; author: string; body: string | null; photo_path: string | null; created_at: string };

/** Build-in-public posts from the trip's facts and the journal. Edit before posting. */

function facts() {
  const trains = LEGS.filter((l) => l.kind === "train");
  const hours = Math.round(trains.reduce((s, l) => s + (ms(l.arrive) - ms(l.depart)), 0) / HOUR);
  const cities = [...new Set(LEGS.flatMap((l) => [PLACES[l.from].city, PLACES[l.to].city]))];
  const km = trains.reduce((s, l) => s + (l.km ?? 0), 0);
  return { trains: trains.length, hours, cities, km };
}

/** First sentence of up to three journal notes, newest last. */
function highlights(entries: Entry[]) {
  return entries
    .filter((e) => e.body && e.body.trim().length > 15)
    .slice()
    .reverse()
    .slice(0, 3)
    .map((e) => e.body!.trim().split(/(?<=[.!?])\s/)[0].replace(/\s+/g, " "));
}

export function linkedinPost(entries: Entry[]) {
  const f = facts();
  const names = TEAM.map((p) => p.name).join(", ");
  const hi = highlights(entries);
  return [
    `${f.km.toLocaleString("en-IN")} km and ${f.hours} hours on ${f.trains} trains across India, for 25 hours of building.`,
    "",
    `Our team (${names}) from BVM travelled from Gujarat to ${EVENT.venue} for the ${EVENT.name}.`,
    "",
    "What the journey looked like:",
    `- ${f.cities.join(" to ")} and back`,
    "- A waitlisted ticket we tracked to the last chart, RAC berths we shared, and two 04:50 arrivals in Delhi",
    `- ${EVENT.name}: building through the night with a rest rotation`,
    ...(hi.length ? ["", "Moments we'll remember:", ...hi.map((h) => `- ${h}`)] : []),
    "",
    "We also built a small app to run the trip itself: live PNR and train tracking, connection alerts, and a grant claim calculator for our college's SSIP support.",
    "",
    "Thanks to BVM and the SSIP cell for backing student innovators.",
    "",
    "#hackathon #buildinpublic #IITGuwahati #SSIP #students",
  ].join("\n");
}

export function xPost(entries: Entry[]) {
  const f = facts();
  const hi = highlights(entries)[0];
  const base = `${f.km.toLocaleString("en-IN")} km, ${f.hours}h on ${f.trains} trains, Gujarat to ${EVENT.venue} and back, for 25h of building at ${EVENT.name}.`;
  const extra = hi ? ` ${hi}` : " Built an app to run the trip too.";
  const tags = " #hackathon #buildinpublic";
  const text = base + extra + tags;
  return text.length <= 280 ? text : base + tags;
}
