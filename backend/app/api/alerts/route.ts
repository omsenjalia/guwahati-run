import { verifyToken } from "@/lib/auth";
import type { Alert } from "@/lib/notify";
import { forParent } from "@/lib/push-audience";
import { serverDb } from "@/lib/supabase/server";

type Row = Alert & { id: number; created_at: string };

/**
 * Alerts logged by notify(), oldest first, for the app to show as local notifications.
 * ?after=<id> returns rows after the last one the phone saw; on first run ?since=<epoch ms>.
 * Parents get trip alerts only.
 */
export async function GET(request: Request) {
  const session = await verifyToken(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const after = Number(params.get("after"));
  const since = Number(params.get("since"));
  let query = serverDb().from("notifications").select("id, kind, title, body, url, tag, created_at");
  if (Number.isInteger(after) && after > 0) query = query.gt("id", after);
  else if (Number.isFinite(since) && since > 0) query = query.gt("created_at", new Date(since).toISOString());
  else return Response.json({ error: "Missing after or since" }, { status: 400 });
  const { data, error } = await query.order("id", { ascending: true }).limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Row[];
  const alerts = rows.flatMap((r) => {
    const a = session.role === "parent" ? forParent(r) : r;
    return a ? [{ id: r.id, kind: a.kind, title: a.title, body: a.body ?? null, url: a.url ?? null, at: Date.parse(r.created_at) }] : [];
  });
  // Last row seen (even ones hidden from parents), so the next call starts after it.
  return Response.json({ alerts, last: rows.at(-1)?.id ?? (after > 0 ? after : null) });
}
