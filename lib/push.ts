import webpush from "web-push";
import type { Alert } from "@/lib/notify";
import { serverDb } from "@/lib/supabase/server";

/** Web Push channel for notify(): sends to every subscribed phone that hasn't muted this kind. */

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:team.guwahati-run@example.com", pub, priv);
  configured = true;
  return true;
}

type SubRow = { endpoint: string; keys: { p256dh: string; auth: string }; muted: string[] };

export async function sendPush(alert: Alert) {
  if (!configure()) return { delivered: 0, failed: 0 };
  const db = serverDb();
  const { data } = await db.from("push_subscriptions").select("endpoint, keys, muted");
  const subs = ((data ?? []) as SubRow[]).filter((s) => !s.muted.includes(alert.kind));
  const payload = JSON.stringify({ title: alert.title, body: alert.body, url: alert.url ?? "/", tag: alert.tag });
  let delivered = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 6 * 3600, urgency: "high" });
        delivered++;
        await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
      } catch (e) {
        failed++;
        const code = (e as { statusCode?: number }).statusCode;
        // The phone unsubscribed or reinstalled: forget it.
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return { delivered, failed };
}
