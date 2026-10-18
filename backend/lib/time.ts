// Everything is shown in IST regardless of the phone's own timezone.

const TZ = "Asia/Kolkata";
export const MIN = 60_000;
export const HOUR = 60 * MIN;

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts });

const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = fmt({ day: "numeric", month: "short" });
const weekdayFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
const dateKeyFmt = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });

export const ms = (iso: string) => new Date(iso).getTime();

/** "06:55" */
export const hhmm = (t: number | string) => timeFmt.format(new Date(t));
/** "28 Oct" */
export const dayMonth = (t: number | string) => dayFmt.format(new Date(t));
/** "Wed, 28 Oct" */
export const weekdayDate = (t: number | string) => weekdayFmt.format(new Date(t));
/** "2026-10-28" in IST, for grouping by day. */
export const istDateKey = (t: number | string) => {
  const parts = dateKeyFmt.formatToParts(new Date(t));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** "2h 50m", "45m", "3d 4h" */
export function duration(msDiff: number) {
  const total = Math.max(0, Math.round(Math.abs(msDiff) / MIN));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Countdown parts for a big clock. */
export function countdownParts(msDiff: number) {
  const s = Math.max(0, Math.floor(msDiff / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** "2 min ago", "just now", "3 h ago" */
export function ago(then: number, now: number) {
  const diff = now - then;
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`;
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)} h ago`;
  return `${Math.floor(diff / (24 * HOUR))} d ago`;
}

/** "28 Oct 06:55" */
export const stamp = (t: number | string) => `${dayMonth(t)} ${hhmm(t)}`;
