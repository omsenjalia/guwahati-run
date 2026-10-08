import { serverDb } from "@/lib/supabase/server";

/**
 * The single place every alert goes through. Channels are pluggable:
 * - "log": always; stored in the notifications table (and visible in-app).
 * - "push": Web Push to all phones (added with push notifications).
 * - "webhook": POSTs the alert to NOTIFY_WEBHOOK_URL if set (for the future
 *   WhatsApp bridge via n8n / WAHA).
 */

export type AlertKind =
  | "pnr"
  | "chart"
  | "connection"
  | "deadline"
  | "wake"
  | "briefing"
  | "settle"
  | "system";

export type Alert = {
  kind: AlertKind;
  title: string;
  body?: string;
  url?: string;
  /** Same tag replaces an older notification on the phone. */
  tag?: string;
  data?: Record<string, unknown>;
};

type Channel = (alert: Alert) => Promise<{ delivered: number; failed: number }>;

const channels: Record<string, Channel> = {
  webhook: async (alert) => {
    const url = process.env.NOTIFY_WEBHOOK_URL;
    if (!url) return { delivered: 0, failed: 0 };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: "guwahati-run", ...alert }),
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok ? { delivered: 1, failed: 0 } : { delivered: 0, failed: 1 };
    } catch {
      return { delivered: 0, failed: 1 };
    }
  },
};

/** Register an extra channel (push registers itself in lib/push.ts). */
export function addChannel(name: string, channel: Channel) {
  channels[name] = channel;
}

export async function notify(alert: Alert) {
  let delivered = 0;
  let failed = 0;
  for (const send of Object.values(channels)) {
    const r = await send(alert);
    delivered += r.delivered;
    failed += r.failed;
  }
  await serverDb().from("notifications").insert({
    kind: alert.kind,
    title: alert.title,
    body: alert.body ?? null,
    url: alert.url ?? null,
    tag: alert.tag ?? null,
    data: alert.data ?? null,
    delivered,
    failed,
  });
}
