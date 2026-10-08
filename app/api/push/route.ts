import { notify } from "@/lib/notify";
import { serverDb } from "@/lib/supabase/server";

/** Save or update this phone's push subscription (team passcode required via proxy). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    person?: string | null;
    muted?: string[];
    test?: boolean;
  } | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh) return Response.json({ error: "Missing subscription" }, { status: 400 });
  const { error } = await serverDb()
    .from("push_subscriptions")
    .upsert({
      endpoint: sub.endpoint,
      keys: sub.keys,
      person: body?.person ?? null,
      muted: body?.muted ?? [],
      user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (body?.test) {
    await notify({ kind: "system", title: "Alerts are on", body: "This phone will get Guwahati Run alerts.", tag: "test" });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await serverDb().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return Response.json({ ok: true });
}
