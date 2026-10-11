"use client";

import { useState } from "react";
import { Camera, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { LEGS, type LegId } from "@/data/trip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES, type Expense, type ExpenseCategory } from "@/lib/expenses";
import type { DocKind, DocRow } from "@/lib/documents";
import { useMe } from "@/lib/me";
import { editDoc, prepareFile, queueUpload } from "@/lib/receipts";
import { istDateKey } from "@/lib/time";
import { addExpense, updateExpense } from "@/lib/use-expenses";
import { cn } from "@/lib/utils";

type Category = ExpenseCategory;

const QUICK: { title: string; category: Category }[] = [
  { title: "Cab", category: "cab" },
  { title: "Auto", category: "cab" },
  { title: "Metro", category: "metro" },
  { title: "Food", category: "food" },
  { title: "Water and snacks", category: "food" },
];

const TRAINS = LEGS.filter((l) => l.train);
/** Event paperwork the college asks for (Grant tab checklist). */
const DOC_NAMES = ["Invitation letter", "Event schedule", "Application form"];
const chip = (on: boolean) =>
  cn(
    "h-11 rounded-full border px-4 text-[0.95rem] font-medium transition active:scale-[0.98]",
    on ? "border-primary bg-accent text-accent-foreground" : "bg-secondary",
  );
const field =
  "h-12 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40";

export type SheetMode =
  | { type: "add"; kind?: Exclude<DocKind, "report"> }
  | { type: "edit"; expense: Expense; doc?: DocRow };

const keys = new WeakMap<SheetMode, number>();
let nextKey = 0;
const keyOf = (m: SheetMode) => {
  if (!keys.has(m)) keys.set(m, ++nextKey);
  return keys.get(m)!;
};

/**
 * One bottom sheet for money and documents:
 *   add     a receipt (expense + optional photo/PDF), a ticket or a certificate
 *   edit    change an expense, or attach another bill; the file is renamed in GitHub to match
 */
export function ExpenseSheet({ mode, onClose }: { mode: SheetMode | null; onClose: () => void }) {
  return (
    <Sheet open={!!mode} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Remount per opening so the form starts fresh (or from the expense being edited). */}
        {mode && <SheetForm key={keyOf(mode)} mode={mode} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetForm({ mode, onClose }: { mode: SheetMode; onClose: () => void }) {
  const me = useMe();
  const editing = mode.type === "edit" ? mode.expense : undefined;
  const [kind, setKind] = useState<Exclude<DocKind, "report">>(mode.type === "add" ? (mode.kind ?? "receipt") : "receipt");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState<Category>(editing?.category ?? "cab");
  const [date, setDate] = useState(() => editing?.spent_on ?? istDateKey(Date.now()));
  const [note, setNote] = useState(editing?.note ?? "");
  const [legId, setLegId] = useState<LegId>(TRAINS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasDoc = mode.type === "edit" && !!mode.doc;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (kind !== "receipt") {
        // Ticket or certificate: a file, no money.
        if (!file) throw new Error("Pick the PDF or photo.");
        const leg = TRAINS.find((l) => l.id === legId)!;
        const docTitle =
          title.trim() || (kind === "ticket" ? `${leg.train!.number} ${leg.train!.name}` : kind === "document" ? "Document" : "Certificate");
        const prepared = await prepareFile(file);
        await queueUpload({
          meta: { id: crypto.randomUUID(), kind, title: docTitle, leg_id: kind === "ticket" ? legId : null, created_by: me },
          ...prepared,
          addedAt: Date.now(),
        });
        toast.success(navigator.onLine ? "Uploading" : "Saved. Uploads when you're back online.");
        return onClose();
      }

      const value = Number(amount.replace(/,/g, ""));
      if (!title.trim() || !(value > 0)) throw new Error("Add what it was for and an amount.");
      const fields = {
        title: title.trim(),
        amount: Math.round(value * 100) / 100,
        category,
        spent_on: date,
        note: note.trim() || null,
      };

      if (editing) {
        if (mode.type === "edit" && mode.doc) await editDoc(mode.doc.id, fields);
        else await updateExpense(editing.id, fields);
        if (file) {
          const prepared = await prepareFile(file);
          await queueUpload({
            meta: { id: crypto.randomUUID(), kind: "receipt", title: fields.title, attach_to: editing.id, created_by: me },
            ...prepared,
            addedAt: Date.now(),
          });
        }
        toast.success("Saved");
        return onClose();
      }

      if (file) {
        const prepared = await prepareFile(file);
        await queueUpload({
          meta: {
            id: crypto.randomUUID(),
            kind: "receipt",
            title: fields.title,
            created_by: me,
            expense: fields,
          },
          ...prepared,
          addedAt: Date.now(),
        });
        toast.success(navigator.onLine ? "Receipt uploading" : "Saved on this phone. Uploads when you're back online.");
      } else {
        await addExpense({ ...fields, created_by: me });
        toast.success("Expense added");
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heading = editing ? "Edit receipt" : `Add ${kind}`;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{heading}</SheetTitle>
        <SheetDescription>
          {kind === "receipt"
            ? "Saved to our private GitHub folder for the college report. Splitting the money stays in Splitwise."
            : "Saved to our private GitHub folder and added to the final report."}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={save} className="flex flex-col gap-5 px-4">
        {mode.type === "add" && (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What are you adding">
            {(["receipt", "ticket", "certificate", "document"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn(chip(kind === k), "px-2 capitalize")}>
                {k}
              </button>
            ))}
          </div>
        )}

        <FilePicker file={file} onFile={setFile} required={kind !== "receipt"} another={hasDoc} />

        {kind === "ticket" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="doc-leg" className="text-sm font-medium">
              Which train
            </label>
            <select id="doc-leg" value={legId} onChange={(e) => setLegId(e.target.value as LegId)} className={field}>
              {TRAINS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.train!.number} {l.train!.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(kind === "certificate" || kind === "document") && (
          <div className="flex flex-col gap-2">
            <label htmlFor="doc-title" className="text-sm font-medium">
              Name
            </label>
            {kind === "document" && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {DOC_NAMES.map((n) => (
                  <button key={n} type="button" onClick={() => setTitle(n)} className={cn(chip(title === n), "shrink-0")}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            <input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "document" ? "e.g. Invitation letter" : "e.g. Finalist certificate"}
              className={field}
            />
          </div>
        )}

        {kind === "receipt" && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="exp-title" className="text-sm font-medium">
                What for
              </label>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {QUICK.map((q) => (
                  <button
                    key={q.title}
                    type="button"
                    onClick={() => {
                      setTitle(q.title);
                      setCategory(q.category);
                    }}
                    className={cn(chip(title === q.title), "shrink-0")}
                  >
                    {q.title}
                  </button>
                ))}
              </div>
              <input id="exp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cab Kamakhya to IIT" className={field} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="exp-amount" className="text-sm font-medium">
                Amount (₹)
              </label>
              <input
                id="exp-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0"
                className={cn(field, "h-14 font-mono text-2xl tabular")}
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Category</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={chip(category === c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              {CATEGORIES.find((c) => c.id === category)?.grant && <p className="text-xs text-ok">Counts for the college grant. Add the bill.</p>}
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="exp-date" className="text-sm font-medium">
                  Date
                </label>
                <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="exp-note" className="text-sm font-medium">
                  Note <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input id="exp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sabarmati-Delhi" className={field} />
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" disabled={busy} className="h-14 text-base">
          {busy ? "Saving" : editing ? "Save changes" : heading}
        </Button>
      </form>
    </>
  );
}

function FilePicker({ file, onFile, required, another }: { file: File | null; onFile: (f: File | null) => void; required: boolean; another: boolean }) {
  const isPdf = file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {another ? "Add another bill" : "Photo or PDF"}{" "}
        <span className="font-normal text-muted-foreground">
          {another ? "(e.g. the payment screenshot)" : !required ? "(the bill, for the grant)" : ""}
        </span>
      </span>
      <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-[0.95rem]">
        {isPdf ? <FilePdf className="size-5" /> : <Camera className="size-5" />}
        <span className="truncate">{file ? file.name : "Take a photo or pick a file"}</span>
        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>
      <p className="text-xs text-subtle">Photos are shrunk and their location data removed before upload. PDFs up to 20 MB.</p>
    </div>
  );
}
