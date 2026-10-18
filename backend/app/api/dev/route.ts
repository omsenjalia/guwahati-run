import { isDeveloper, sessionFrom } from "@/lib/auth";
import { serverDb } from "@/lib/supabase/server";

/**
 * Developer options (Om only, checked here; proxy.ts already requires an
 * attendee): every app_state row (ticket choice, weather, watches...) and
 * every per-leg override (merged over the fetched live data in
 * /api/parent/state). POST { table, key, value } writes one; value null deletes it.
 */
const TABLES = { app_state: "key", overrides: "leg_id" } as const;
type Table = keyof typeof TABLES;

export async function GET(request: Request) {
  if (!isDeveloper(await sessionFrom(request))) return Response.json({ error: "Developer only" }, { status: 403 });
  const db = serverDb();
  const [state, overrides] = await Promise.all([
    db.from("app_state").select("key, value, updated_at").order("key"),
    db.from("overrides").select("leg_id, data, updated_at").order("leg_id"),
  ]);
  const error = state.error ?? overrides.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ state: state.data, overrides: overrides.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isDeveloper(await sessionFrom(request))) return Response.json({ error: "Developer only" }, { status: 403 });
  const { table, key, value } = (await request.json().catch(() => ({}))) as { table?: Table; key?: string; value?: unknown };
  if (!table || !(table in TABLES) || typeof key !== "string" || !key.trim()) {
    return Response.json({ error: "Need table (app_state or overrides), key and value" }, { status: 400 });
  }
  if (value === undefined) return Response.json({ error: "Missing value (null deletes)" }, { status: 400 });
  if (table === "overrides" && value !== null && (typeof value !== "object" || Array.isArray(value))) {
    return Response.json({ error: "An override is an object of live fields, e.g. {\"platform\": \"5\"}" }, { status: 400 });
  }
  const db = serverDb();
  const col = TABLES[table];
  const updated_at = new Date().toISOString();
  const { error } =
    value === null
      ? await db.from(table).delete().eq(col, key)
      : table === "app_state"
        ? await db.from(table).upsert({ key, value, updated_at })
        : await db.from(table).upsert({ leg_id: key, data: value, note: "developer options", updated_at });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
