import { PLACES } from "@/data/trip";
import { EMPTY_LIVE, type LegLive, type LiveState } from "@/lib/live-types";
import { serverDb } from "@/lib/supabase/server";
import { buildSteps } from "@/lib/trip-engine";

/**
 * Subscribable calendar (webcal://.../api/calendar/<CALENDAR_TOKEN>).
 * Calendar apps re-fetch it periodically, so live-adjusted times flow in
 * automatically once live state is stored in the database.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  if (!process.env.CALENDAR_TOKEN || token !== process.env.CALENDAR_TOKEN) {
    return new Response("Not found", { status: 404 });
  }
  // Live-adjusted times; falls back to the plan if the database is unreachable.
  let live: LiveState = EMPTY_LIVE;
  try {
    const { data } = await serverDb().from("leg_live").select("leg_id, data");
    live = { legs: Object.fromEntries((data ?? []).map((r) => [r.leg_id, r.data as LegLive])), state: {} };
  } catch {}
  const steps = buildSteps(live).filter((s) => !s.minor);
  const utc = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const now = utc(Date.now());

  const events = steps.map((s) => {
    const leg = s.leg;
    const where = leg ? `${PLACES[leg.from].name} to ${PLACES[leg.to].name}` : s.place ? PLACES[s.place].name : "";
    const desc = [leg?.pnr && `PNR ${leg.pnr}`, leg?.travelClass, leg?.modeHint, ...(leg?.notes ?? []), ...(s.block?.notes ?? [])]
      .filter(Boolean)
      .join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${s.id}@guwahati-run`,
      `DTSTAMP:${now}`,
      `DTSTART:${utc(s.start)}`,
      `DTEND:${utc(s.end)}`,
      `SUMMARY:${esc(s.title)}`,
      where && `LOCATION:${esc(where)}`,
      desc && `DESCRIPTION:${esc(desc)}`,
      leg?.kind === "train" ? "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Leave for the station\r\nTRIGGER:-PT90M\r\nEND:VALARM" : "",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Guwahati Run//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Guwahati Run",
    "X-WR-TIMEZONE:Asia/Kolkata",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="guwahati-run.ics"',
      "Cache-Control": "no-store",
    },
  });
}
