import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { EVENT, REPORT, TEAM } from "@/data/trip";
import type { DocRow } from "@/lib/documents";
import type { Expense } from "@/lib/expenses";
import { readBlob } from "@/lib/github";
import { defaultSummary, legTimeline, reportAmount, reportRows, reportTotals, type ReportRow } from "@/lib/report-data";
import { dayMonth, stamp } from "@/lib/time";

/**
 * The final travel report for the college, A4 and black-and-white friendly:
 *   1 cover   2 trip summary   3 expense table   4 requested vs spent
 *   appendix: every receipt by reference number (images 2 per page, PDFs
 *   merged page by page, untouched), then certificates. Page numbers on
 *   the report's own pages only.
 */

const A4: [number, number] = [595.28, 841.89];
const M = 50; // margin
const INK = rgb(0, 0, 0);
const GREY = rgb(0.35, 0.35, 0.35);
const RULE = rgb(0.6, 0.6, 0.6);

// Standard PDF fonts only cover Latin-1, so ₹ becomes "Rs." and arrows become words.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export const pdfSafe = (s: string) =>
  s
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[→⟶]/g, " to ")
    .replace(/[^\n\x20-\xff]/g, (c) => (WIN_ANSI_EXTRA.includes(c) ? c : ""));

const money = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    public doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
  ) {}

  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M;
    return this.page;
  }

  ensure(h: number) {
    if (this.y - h < M + 20) this.newPage();
  }

  /** Words wrapped to a width; returns the lines. */
  wrap(text: string, size: number, width: number, font = this.font) {
    const out: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > width && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  }

  text(text: string, opts: { size?: number; bold?: boolean; x?: number; width?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? M;
    const lines = this.wrap(text, size, opts.width ?? A4[0] - x - M, font);
    for (const line of lines) {
      this.ensure(size * 1.4);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= size * 1.4;
    }
    this.y -= opts.gap ?? 0;
  }

  rule(weight = 0.6) {
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: weight, color: RULE });
    this.y -= 6;
  }

  /**
   * A simple table. Columns have fixed widths except one flexible column
   * that wraps; numbers right-align. The header repeats on each new page.
   */
  table(cols: { title: string; width?: number; align?: "right" }[], rows: string[][], opts: { size?: number; boldLast?: boolean } = {}) {
    const size = opts.size ?? 9;
    const fixed = cols.reduce((t, c) => t + (c.width ?? 0), 0);
    const flex = A4[0] - 2 * M - fixed;
    const widths = cols.map((c) => c.width ?? flex);
    const pad = 4;
    const drawRow = (cells: string[], bold: boolean, header = false) => {
      const wrapped = cells.map((c, i) => this.wrap(c, size, widths[i] - 2 * pad, bold ? this.bold : this.font));
      const h = Math.max(...wrapped.map((w) => w.length)) * size * 1.3 + 2 * pad;
      if (this.y - h < M + 20) {
        this.newPage();
        if (!header) drawRow(cols.map((c) => c.title), true, true);
      }
      let x = M;
      wrapped.forEach((lines, i) => {
        lines.forEach((line, j) => {
          const font = bold ? this.bold : this.font;
          const w = font.widthOfTextAtSize(line, size);
          const tx = cols[i].align === "right" ? x + widths[i] - pad - w : x + pad;
          this.page.drawText(line, { x: tx, y: this.y - pad - size - j * size * 1.3 + 2, size, font, color: header ? GREY : INK });
        });
        x += widths[i];
      });
      this.y -= h;
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: header ? 0.9 : 0.3, color: RULE });
    };
    drawRow(cols.map((c) => c.title), true, true);
    rows.forEach((r, i) => drawRow(r, !!opts.boldLast && i === rows.length - 1));
    this.y -= 10;
  }
}

/* ---------------------------------------------------------------- build */

type BuildInput = { expenses: Expense[]; docs: DocRow[]; summary?: string; now?: number };

export async function buildReport({ expenses, docs, summary, now = Date.now() }: BuildInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${EVENT.name}: travel and expense report`);
  pdf.setAuthor(TEAM.map((p) => p.name).join(", "));
  const w = new Writer(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  const rows = reportRows(expenses, docs);
  const totals = reportTotals(rows);

  cover(w, now);
  tripSummary(w, summary?.trim() || defaultSummary());
  expenseTable(w, rows, totals);
  requestedVsSpent(w, totals);
  const originals = await appendix(w, rows, docs);
  numberPages(pdf, originals);
  return { bytes: await pdf.save(), rows, totals };
}

function cover(w: Writer, now: number) {
  w.newPage();
  w.y -= 120;
  w.text("Travel and Expense Report", { size: 26, bold: true, gap: 6 });
  w.text(EVENT.name, { size: 16, gap: 2 });
  w.text(REPORT.association, { size: 12, color: GREY, gap: 2 });
  w.text(`Event: ${REPORT.eventDates}. Travel: ${REPORT.travelDates}.`, { size: 12, color: GREY, gap: 30 });
  w.rule(1);
  w.y -= 10;
  w.text("Submitted to", { size: 9, color: GREY });
  w.text(REPORT.addressedTo, { size: 12, gap: 16 });
  w.text("Team", { size: 9, color: GREY });
  w.text(`${REPORT.teamName} (registration ${REPORT.registrationId})`, { size: 12, bold: true });
  for (const p of TEAM) w.text(`${p.name}`, { size: 12 });
  w.y -= 16;
  w.text("College", { size: 9, color: GREY });
  w.text(REPORT.college, { size: 12 });
  w.text(REPORT.department, { size: 12, gap: 16 });
  w.text("Funding requested", { size: 9, color: GREY });
  w.text(`${money(REPORT.requestedPerStudent)} per student (${money(REPORT.requestedPerStudent * TEAM.length)} for the team)`, { size: 12, gap: 40 });
  w.text(`Prepared ${stamp(now)} IST`, { size: 9, color: GREY });
}

function tripSummary(w: Writer, summary: string) {
  w.newPage();
  w.text("Trip summary", { size: 18, bold: true, gap: 8 });
  w.text("Route: Anand - Ahmedabad - Delhi - Guwahati (IIT Guwahati) - Delhi - Anand", { size: 11, gap: 10 });
  w.text(summary, { size: 11, gap: 14 });
  w.text("Timeline", { size: 13, bold: true, gap: 4 });
  w.table(
    [{ title: "Date", width: 50 }, { title: "Leg" }, { title: "Route", width: 140 }, { title: "Time", width: 70 }, { title: "Class", width: 36 }, { title: "PNR", width: 70 }],
    legTimeline().map((l) => [l.date, l.what, l.route, l.time, l.cls, l.pnr]),
  );
}

function expenseTable(w: Writer, rows: ReportRow[], t: ReturnType<typeof reportTotals>) {
  w.newPage();
  w.text("Expenses", { size: 18, bold: true, gap: 4 });
  w.text("Every ticket and bill. Ref is the receipt number in the appendix; '-' means no bill attached.", { size: 9, color: GREY, gap: 6 });
  w.table(
    [{ title: "Ref", width: 36 }, { title: "Date", width: 46 }, { title: "Category", width: 76 }, { title: "Description" }, { title: "Amount", width: 84, align: "right" }],
    rows.map((r) => [r.ref ?? "-", dayMonth(`${r.date}T12:00:00+05:30`), r.category, r.description, money(reportAmount(r))]),
  );
  w.ensure(120);
  w.text("Subtotals by category", { size: 12, bold: true, gap: 2 });
  w.table(
    [{ title: "Category" }, { title: "Amount", width: 110, align: "right" }],
    [...t.byCategory.map(([c, v]) => [c, money(v)]), ["Grand total", money(t.total)]],
    { boldLast: true },
  );
  if (t.paid - t.total > 0.5) {
    w.text(
      `Train fares are shown at the sleeper fare, the most economical class the SSIP policy pays. Actual 3A fares came to ${money(t.paid - t.total)} more.`,
      { size: 9, color: GREY, gap: 4 },
    );
  }
}

function requestedVsSpent(w: Writer, t: ReturnType<typeof reportTotals>) {
  w.newPage();
  w.text("Funding requested vs actual spend", { size: 18, bold: true, gap: 10 });
  const req = REPORT.requestedPerStudent;
  const eligible = t.eligiblePerStudent;
  w.table(
    [{ title: "Student" }, { title: "Spend (total / 4)", width: 100, align: "right" }, { title: "Eligible (SSIP)", width: 100, align: "right" }, { title: "Requested", width: 90, align: "right" }],
    [
      ...TEAM.map((p) => [p.name, money(t.perStudent), money(eligible), money(req)]),
      ["Team", money(t.paid), money(eligible * TEAM.length), money(t.requested)],
    ],
    { boldLast: true },
  );
  w.text(
    `Eligible follows the BVM SSIP 2.0 reimbursement policy: train fares at the most economical class (3A legs counted at the sleeper fare), ` +
      `local travel to and from the venue, and the registration fee. Food, accommodation and the Yoga Express cancellation charge are not included.`,
    { size: 10, color: GREY, gap: 8 },
  );
  const gap = t.paid - t.requested;
  w.text(
    gap > 0
      ? `The team spent ${money(t.paid)}, which is ${money(gap)} more than the ${money(t.requested)} requested.`
      : `The team spent ${money(t.paid)}, within the ${money(t.requested)} requested.`,
    { size: 11, gap: 40 },
  );
  w.text("Student signatures", { size: 10, color: GREY, gap: 18 });
  for (const p of TEAM) w.text(`${p.name}: ______________________`, { size: 10, gap: 10 });
  w.y -= 10;
  w.text("HOD approval: ______________________      Date: ____________", { size: 10 });
}

/* ------------------------------------------------------------- appendix */

/** Fetch files from GitHub, four at a time. */
async function fetchAll(list: DocRow[]) {
  const out = new Map<string, Uint8Array>();
  for (let i = 0; i < list.length; i += 4) {
    await Promise.all(
      list.slice(i, i + 4).map(async (d) => {
        try {
          out.set(d.id, new Uint8Array(await readBlob(d.sha)));
        } catch {}
      }),
    );
  }
  return out;
}

/**
 * Every document and bill as it is. Pages from original PDFs (e-tickets,
 * emails) are copied untouched: no labels, no footer. Photos go on report
 * pages with their reference above them. The first appendix page is an
 * index of references and the page each starts on.
 * Returns the copied original pages, so page numbering can skip them.
 */
async function appendix(w: Writer, rows: ReportRow[], docs: DocRow[]) {
  const originals = new Set<PDFPage>();
  const referenced = rows.filter((r) => r.ref);
  const certificates = docs.filter((d) => d.kind === "certificate");
  const papers = docs.filter((d) => d.kind === "document");
  const byId = (id: string) => docs.find((d) => d.id === id)!;
  const wanted = [...papers, ...referenced.flatMap((r) => r.docIds.map(byId)), ...certificates];
  if (!wanted.length) return originals;
  const files = await fetchAll(wanted);

  const indexPage = w.newPage();
  w.text("Appendix: documents and receipts", { size: 18, bold: true, gap: 4 });
  w.text(
    "Original documents are attached exactly as received (e-tickets, emails), without any marks. Photos of bills are shown under their reference.",
    { size: 9, color: GREY, gap: 10 },
  );
  const indexTop = w.y;

  const items = [
    ...papers.map((d, i) => ({ doc: d, ref: `D-${String(i + 1).padStart(2, "0")}`, what: d.title ?? "Document" })),
    ...referenced.flatMap((r) =>
      r.docIds.map((id, i) => ({
        doc: byId(id),
        ref: `${r.ref}${r.docIds.length > 1 ? ` (${i + 1}/${r.docIds.length})` : ""}`,
        what: `${r.label}, ${money(r.amount)}, ${dayMonth(`${r.date}T12:00:00+05:30`)}`,
      })),
    ),
    ...certificates.map((d) => ({ doc: d, ref: "Certificate", what: d.title ?? "" })),
  ];
  const index: { ref: string; what: string; page: number }[] = [];
  let slot = 2; // photos start on a fresh page after the index

  for (const { doc, ref, what } of items) {
    const label = `${ref}  ${what}`;
    const bytes = files.get(doc.id);
    if (!bytes) {
      ({ slot } = placeNote(w, slot, label, `Couldn't fetch this file. It's in GitHub at ${doc.path}.`));
      index.push({ ref, what, page: w.doc.getPageCount() });
      continue;
    }
    if (doc.mime === "application/pdf") {
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await w.doc.copyPages(src, src.getPageIndices());
        index.push({ ref, what, page: w.doc.getPageCount() + 1 });
        for (const p of pages) {
          w.doc.addPage(p);
          originals.add(p);
        }
        slot = 2; // next photo starts on a new page
      } catch {
        ({ slot } = placeNote(w, slot, label, `This PDF couldn't be merged (it may be protected). It's in GitHub at ${doc.path}.`));
        index.push({ ref, what, page: w.doc.getPageCount() });
      }
      continue;
    }
    try {
      const img = doc.mime === "image/png" ? await w.doc.embedPng(bytes) : await w.doc.embedJpg(bytes);
      if (slot >= 2) {
        w.newPage();
        slot = 0;
      }
      const top = slot === 0 ? A4[1] - M : (A4[1] - M) / 2 + M / 2 - 10;
      const height = (A4[1] - 2 * M) / 2 - 30;
      w.page.drawText(pdfSafe(label), { x: M, y: top - 11, size: 10, font: w.bold, color: INK });
      // The photo itself is placed unchanged, scaled to fit.
      const scale = Math.min((A4[0] - 2 * M) / img.width, height / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      w.page.drawImage(img, { x: M + (A4[0] - 2 * M - iw) / 2, y: top - 20 - ih, width: iw, height: ih });
      index.push({ ref, what, page: w.doc.getPageCount() });
      slot++;
    } catch {
      ({ slot } = placeNote(w, slot, label, `This image format couldn't be embedded. It's in GitHub at ${doc.path}.`));
      index.push({ ref, what, page: w.doc.getPageCount() });
    }
  }

  // Fill in the index now that every page number is known.
  const end = { page: w.page, y: w.y };
  w.page = indexPage;
  w.y = indexTop;
  w.table(
    [{ title: "Ref", width: 64 }, { title: "Document" }, { title: "Page", width: 44, align: "right" }],
    index.map((x) => [x.ref, x.what, String(x.page)]),
  );
  w.page = end.page;
  w.y = end.y;
  return originals;
}

function placeNote(w: Writer, slot: number, label: string, note: string) {
  if (slot >= 2) {
    w.newPage();
    slot = 0;
  }
  w.y = slot === 0 ? A4[1] - M : (A4[1] - M) / 2;
  w.text(label, { size: 10, bold: true, gap: 4 });
  w.text(note, { size: 10, color: GREY });
  return { slot: slot + 1 };
}

/** Page numbers on the report's own pages only; original documents stay unmarked. */
function numberPages(pdf: PDFDocument, originals: Set<PDFPage>) {
  const pages = pdf.getPages();
  const font = pdf.embedStandardFont(StandardFonts.Helvetica);
  pages.forEach((p, i) => {
    if (originals.has(p)) return;
    const { width } = p.getSize();
    const text = `Page ${i + 1} of ${pages.length}`;
    const tw = font.widthOfTextAtSize(text, 8);
    p.drawText(text, { x: (width - tw) / 2, y: 22, size: 8, font, color: GREY });
  });
}
