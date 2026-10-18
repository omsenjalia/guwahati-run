import type { Alert, AlertKind } from "@/lib/notify";

/** Trip-level alerts a parent's phone gets; tickets, PNRs, booking deadlines and money stay with the team. */
const PARENT_KINDS: AlertKind[] = ["chart", "connection", "wake", "briefing", "rest", "system"];

/** The alert as a parent should see it, or null if parents don't get it. */
export function forParent(alert: Alert): Alert | null {
  if (!PARENT_KINDS.includes(alert.kind)) return null;
  const body = alert.body?.replace(/\bPNR\s*\d+/gi, "").trim();
  return { ...alert, body: body || undefined };
}
