import type { LegId, PersonId } from "@/data/trip";
import type { ExpenseCategory } from "@/lib/expenses";

/**
 * A file kept in the private GitHub repo (documents/ folder), with its row
 * in the documents table. Receipts point at the expense they prove.
 */
export type DocKind = "receipt" | "ticket" | "certificate" | "report";

export type DocRow = {
  id: string;
  kind: DocKind;
  path: string;
  sha: string;
  commit_sha: string | null;
  mime: string;
  size: number;
  title: string | null;
  expense_id: string | null;
  leg_id: LegId | null;
  created_by: string | null;
  created_at: string;
};

/** What a phone sends to /api/docs after putting the file in staging. */
export type DocUpload = {
  /** Chosen on the phone, so a retried upload never creates a duplicate. */
  id: string;
  kind: Exclude<DocKind, "report">;
  staging: string;
  mime: string;
  title: string;
  leg_id?: LegId | null;
  created_by?: string | null;
  /** Receipts: attach to this existing expense instead of creating one. */
  attach_to?: string;
  /** Receipts only: the expense this bill proves. */
  expense?: {
    title: string;
    amount: number;
    category: Exclude<ExpenseCategory, "settlement">;
    paid_by: PersonId;
    split_between: PersonId[];
    spent_on: string;
    note: string | null;
  };
};

export type DocEdit = Partial<{
  title: string;
  amount: number;
  category: Exclude<ExpenseCategory, "settlement">;
  paid_by: PersonId;
  spent_on: string;
  note: string | null;
}>;

/** Hard limits, checked on the phone and again on the server. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const extFor = (mime: string) =>
  mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

/** URL that streams a document from GitHub through our server (team only). */
export const docFileUrl = (d: Pick<DocRow, "id" | "sha">) => `/api/docs/${d.id}/file?v=${d.sha.slice(0, 12)}`;
