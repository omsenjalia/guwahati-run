import * as WebBrowser from "expo-web-browser";
import { api } from "@/core/api";
import { db, useRows } from "@/core/db";
import type { DocEdit, DocRow } from "@/lib/documents";

/** Bills, tickets, certificates and reports in the private GitHub repo (team only). */
export const useDocs = () => useRows<DocRow>("documents", () => db.from("documents").select("*").order("created_at", { ascending: true }));

/** Opens a document in the browser through a 10-minute link (our token can't ride along to a PDF viewer). */
export async function openDoc(id: string) {
  const { url } = await api<{ url: string }>(`/api/docs/${id}/link`);
  await WebBrowser.openBrowserAsync(url);
}

/** Changes the expense a bill proves (the file is renamed in GitHub to match). */
export const editDoc = (id: string, edit: DocEdit) => api<{ doc: DocRow }>(`/api/docs/${id}`, { method: "PATCH", body: JSON.stringify(edit) });

/** Deletes from GitHub and the database; the last bill of an expense takes the expense with it. */
export const deleteDoc = (id: string) => api(`/api/docs/${id}`, { method: "DELETE" });
