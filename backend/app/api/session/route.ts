import { createClient } from "@supabase/supabase-js";
import { deriveSecret } from "@/lib/auth";
import { serverDb } from "@/lib/supabase/server";

/**
 * Gives a signed-in team phone a Supabase session (team passcode required,
 * enforced by proxy.ts). All phones share one Supabase user whose JWT has
 * app_metadata.role = "team", which is what the database's RLS checks.
 */

const EMAIL = "team.guwahati-run@example.com";
let registered = false;

export async function POST() {
  const admin = serverDb();
  const password = await deriveSecret("supabase-team-password");

  await registerDeployUrl();

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password });
  if (error) {
    // First run (user missing) or AUTH_SECRET changed (password differs): fix and retry.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const existing = list?.users.find((u) => u.email === EMAIL);
    const attrs = { password, email_confirm: true, app_metadata: { role: "team" } };
    const res = existing
      ? await admin.auth.admin.updateUserById(existing.id, attrs)
      : await admin.auth.admin.createUser({ email: EMAIL, ...attrs });
    if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
    ({ data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password }));
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  const s = data.session!;
  return Response.json(
    { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Tells Supabase's scheduler where the production app lives. */
async function registerDeployUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (registered || process.env.VERCEL_ENV !== "production" || !host) return;
  const { error } = await serverDb().rpc("gr_set_base_url", { url: `https://${host}` });
  if (!error) registered = true;
}
