import { githubConfigured, repoReachable } from "@/lib/github";
import { serverDb } from "@/lib/supabase/server";

/** Health of the receipts store: can we reach the repo, and when did a file last go in. Team only. */
export async function GET() {
  if (!githubConfigured()) {
    return Response.json({ ok: false, error: "GITHUB_RECEIPTS_TOKEN or GITHUB_RECEIPTS_REPO is not set." });
  }
  try {
    const repo = await repoReachable();
    const { data } = await serverDb().from("documents").select("created_at").order("created_at", { ascending: false }).limit(1);
    return Response.json({
      ok: true,
      checkedAt: Date.now(),
      repo: repo.name,
      private: repo.private,
      lastUpload: data?.[0]?.created_at ?? null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, checkedAt: Date.now(), error: e instanceof Error ? e.message : String(e) });
  }
}
