import { uploadDocument } from "@/lib/docs-server";
import type { DocUpload } from "@/lib/documents";

export const maxDuration = 60;

/**
 * Files a staged upload into GitHub (team only, see proxy.ts). The phone
 * first puts the file in Supabase Storage under staging/, so this request
 * stays tiny (Vercel caps request bodies at 4.5 MB).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DocUpload;
    const doc = await uploadDocument(body);
    return Response.json({ doc }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
