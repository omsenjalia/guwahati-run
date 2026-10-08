import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyCookie } from "@/lib/auth";
import { runTick, type JobName } from "@/lib/jobs/tick";

export const maxDuration = 60;

/**
 * Called every 5 minutes by Supabase pg_cron (Bearer CRON_SECRET), or by a
 * team member from the System page (?force=pnr-sync,live-status,weather).
 */
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const fromCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;
  const fromTeam = (await verifyCookie(request.cookies.get(AUTH_COOKIE)?.value)) === "team";
  if (!fromCron && !fromTeam) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const force = (request.nextUrl.searchParams.get("force") ?? "")
    .split(",")
    .filter(Boolean) as JobName[];
  try {
    const results = await runTick({ force });
    return Response.json({ ok: results.every((r) => r.ok), results }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
