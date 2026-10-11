import { REPORT } from "@/data/trip";
import { DOCS_ROOT, createFile } from "@/lib/github";
import type { DocRow } from "@/lib/documents";
import type { Expense } from "@/lib/expenses";
import { buildReport } from "@/lib/report-pdf";
import { serverDb } from "@/lib/supabase/server";
import { istDateKey } from "@/lib/time";

export const maxDuration = 60;

const FILE_NAME = `WhyCode4U_Travel_Report_${REPORT.teamName}.pdf`;

/**
 * Builds the final report on the server (team only, proxy.ts).
 *   { mode: "preview" }   returns a link to view it
 *   { mode: "download" }  also commits a copy to documents/reports/ in GitHub
 * The PDF is handed over through a short-lived Supabase Storage link, since
 * a report with every receipt can be larger than Vercel's 4.5 MB response cap.
 */
export async function POST(request: Request) {
  try {
    const { mode, summary } = (await request.json()) as { mode: "preview" | "download"; summary?: string };
    const db = serverDb();
    const [exp, docs] = await Promise.all([
      db.from("expenses").select("*"),
      db.from("documents").select("*").order("created_at", { ascending: true }),
    ]);
    if (exp.error) throw new Error(exp.error.message);
    if (docs.error) throw new Error(`${docs.error.message}. Run supabase/003_confirmed_trip.sql.`);
    const expenses = (exp.data as Expense[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    const { bytes, rows } = await buildReport({ expenses, docs: docs.data as DocRow[], summary });

    let committed: string | undefined;
    if (mode === "download") {
      const path = `${DOCS_ROOT}/reports/${FILE_NAME.replace(/\.pdf$/, `_${istDateKey(Date.now())}.pdf`)}`;
      const put = await createFile(path, bytes, `Add report: travel report (${rows.length} items)`);
      await db.from("documents").insert({
        kind: "report",
        path: put.path,
        sha: put.sha,
        commit_sha: put.commitSha,
        mime: "application/pdf",
        size: bytes.length,
        title: "Final travel report",
      });
      committed = put.path;
    }

    // Hand-over copy, replaced on every export.
    const tmp = `reports/latest-${mode}.pdf`;
    const up = await db.storage.from("trip-files").upload(tmp, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(`Couldn't store the PDF: ${up.error.message}`);
    const { data: signed, error } = await db.storage
      .from("trip-files")
      .createSignedUrl(tmp, 600, mode === "download" ? { download: FILE_NAME } : undefined);
    if (error || !signed) throw new Error(`Couldn't create the link: ${error?.message}`);
    return Response.json({ url: signed.signedUrl, size: bytes.length, committed }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
