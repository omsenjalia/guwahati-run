import "server-only";
import { DOCS_ROOT, createFile, deleteFile, readBlob, slug } from "@/lib/github";
import { categoryLabel } from "@/lib/expenses";
import {
  ALLOWED_MIME,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  extFor,
  type DocEdit,
  type DocKind,
  type DocRow,
  type DocUpload,
} from "@/lib/documents";
import { serverDb } from "@/lib/supabase/server";
import { istDateKey } from "@/lib/time";

/**
 * Upload, edit and delete documents: GitHub holds the file, Supabase the
 * metadata. Every change is one commit with a readable message.
 */

const BUCKET = "trip-files";
const rupees = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

type ExpenseRow = { id: string; title: string; amount: number; category: string; spent_on: string; note: string | null };

/**
 * documents/receipts/2026-10-28/train_659_sabarmati-delhi.jpg
 * documents/tickets/L1_19031-yoga-express.pdf
 * documents/certificates/2026-11-01_finalist-certificate.pdf
 * documents/event-documents/hod-approval.pdf
 */
export function docPath(kind: DocKind, mime: string, title: string, opts: { legId?: string | null; expense?: Pick<ExpenseRow, "amount" | "category" | "spent_on" | "note" | "title"> } = {}) {
  const ext = extFor(mime);
  const e = opts.expense;
  if (kind === "receipt" && e) {
    const what = slug(e.note || e.title || "bill", 32) || "bill";
    return `${DOCS_ROOT}/receipts/${e.spent_on}/${e.category}_${Math.round(e.amount)}_${what}.${ext}`;
  }
  const name = slug(title) || kind;
  if (kind === "ticket") return `${DOCS_ROOT}/tickets/${opts.legId ? `${opts.legId}_` : ""}${name}.${ext}`;
  if (kind === "certificate") return `${DOCS_ROOT}/certificates/${istDateKey(Date.now())}_${name}.${ext}`;
  if (kind === "document") return `${DOCS_ROOT}/event-documents/${name}.${ext}`;
  return `${DOCS_ROOT}/reports/${name}.${ext}`;
}

function commitMessage(kind: DocKind, title: string, e?: Pick<ExpenseRow, "amount" | "category">) {
  if (kind === "receipt" && e) return `Add receipt: ${categoryLabel(e.category).toLowerCase()} ${rupees(e.amount)} (${title})`;
  return `Add ${kind}: ${title}`;
}

async function getDoc(id: string) {
  const { data, error } = await serverDb().from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as DocRow | null;
}

/** Staged file in Supabase Storage -> GitHub, plus the expense and document rows. */
export async function uploadDocument(u: DocUpload): Promise<DocRow> {
  const db = serverDb();
  const existing = await getDoc(u.id);
  if (existing) return existing; // a retry of an upload that already worked

  if (!ALLOWED_MIME.includes(u.mime)) throw new Error("Only photos (JPEG, PNG, WebP) and PDFs can be uploaded.");
  if (!u.staging.startsWith("staging/")) throw new Error("Bad upload.");
  if (u.kind === "receipt" && !u.expense && !u.attach_to) throw new Error("A receipt needs an amount.");

  const { data: blob, error: dlError } = await db.storage.from(BUCKET).download(u.staging);
  if (dlError || !blob) throw new Error(`Couldn't read the uploaded file: ${dlError?.message ?? "missing"}`);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const limit = u.mime === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES * 1.5;
  if (bytes.length > limit) throw new Error(u.mime === "application/pdf" ? "PDF is over 20 MB." : "Photo is too large.");

  // The expense first (same id as the document), so a retry reuses it.
  let expense: ExpenseRow | undefined;
  if (u.attach_to) {
    const { data, error } = await db.from("expenses").select().eq("id", u.attach_to).single();
    if (error) throw new Error(`That expense is gone: ${error.message}`);
    expense = { ...(data as ExpenseRow), amount: Number((data as ExpenseRow).amount) };
  } else if (u.expense) {
    const row = { id: u.id, ...u.expense, paid_by: u.created_by ?? "oms", created_by: u.created_by ?? null };
    const { data, error } = await db.from("expenses").upsert(row, { onConflict: "id" }).select().single();
    if (error) throw new Error(`Saving the expense failed: ${error.message}`);
    expense = { ...(data as ExpenseRow), amount: Number((data as ExpenseRow).amount) };
  }

  const path = docPath(u.kind, u.mime, u.title, { legId: u.leg_id, expense });
  const put = await createFile(path, bytes, commitMessage(u.kind, u.title, expense));

  const { data, error } = await db
    .from("documents")
    .insert({
      id: u.id,
      kind: u.kind,
      path: put.path,
      sha: put.sha,
      commit_sha: put.commitSha,
      mime: u.mime,
      size: bytes.length,
      title: u.title,
      expense_id: expense?.id ?? null,
      leg_id: u.leg_id ?? null,
      created_by: u.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Saved to GitHub but not to the list: ${error.message}`);
  await db.storage.from(BUCKET).remove([u.staging]);
  return data as DocRow;
}

/** Edit a receipt's details; the file is renamed in GitHub if its name changes. */
export async function editDocument(id: string, edit: DocEdit): Promise<DocRow> {
  const db = serverDb();
  const doc = await getDoc(id);
  if (!doc) throw new Error("Not found");

  let expense: ExpenseRow | undefined;
  if (doc.expense_id) {
    const { data, error } = await db
      .from("expenses")
      .update({ ...edit, updated_at: new Date().toISOString() })
      .eq("id", doc.expense_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    expense = { ...(data as ExpenseRow), amount: Number((data as ExpenseRow).amount) };
  }
  const title = edit.title ?? doc.title ?? "";
  const nextPath = docPath(doc.kind, doc.mime, title, { legId: doc.leg_id, expense });
  let moved: { path: string; sha: string; commit_sha: string } | undefined;
  // Same folder and name (ignoring a -2 suffix): keep the file where it is.
  if (nextPath.replace(/\.[a-z0-9]+$/i, "") !== doc.path.replace(/(-\d+)?\.[a-z0-9]+$/i, "")) {
    const bytes = new Uint8Array(await readBlob(doc.sha));
    const put = await createFile(nextPath, bytes, `Update ${doc.kind}: ${expense ? `${categoryLabel(expense.category).toLowerCase()} ${rupees(expense.amount)} (${title})` : title}`);
    await deleteFile(doc.path, doc.sha, `Remove old name: ${doc.path.split("/").pop()}`);
    moved = { path: put.path, sha: put.sha, commit_sha: put.commitSha };
  }
  const { data, error } = await db
    .from("documents")
    .update({ title, ...(moved ?? {}), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DocRow;
}

/** Removes the file from GitHub, then its rows (and the expense it proves). */
export async function deleteDocument(id: string) {
  const db = serverDb();
  const doc = await getDoc(id);
  if (!doc) return;
  await deleteFile(doc.path, doc.sha, `Delete ${doc.kind}: ${doc.title ?? doc.path.split("/").pop()}`);
  await db.from("documents").delete().eq("id", id);
  if (doc.expense_id) await db.from("expenses").delete().eq("id", doc.expense_id);
}

export async function documentBytes(id: string) {
  const doc = await getDoc(id);
  if (!doc) return null;
  return { doc, bytes: await readBlob(doc.sha) };
}

/**
 * A 10-minute link to a document, for phones that can't send our token
 * with the request (PDF viewers, the web build's image tag). The bytes are
 * cached in Supabase Storage under their SHA.
 */
export async function documentLink(id: string, download = false) {
  const found = await documentBytes(id);
  if (!found) return null;
  const { doc, bytes } = found;
  const db = serverDb();
  const tmp = `cache/${doc.sha}.${extFor(doc.mime)}`;
  await db.storage.from("trip-files").upload(tmp, bytes, { contentType: doc.mime, upsert: true });
  const name = doc.path.split("/").pop() ?? "file";
  const { data, error } = await db.storage.from("trip-files").createSignedUrl(tmp, 600, download ? { download: name } : undefined);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
