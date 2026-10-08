import { EVENT, GRANT, LEGS, TEAM, type PersonId } from "@/data/trip";
import type { Expense } from "@/lib/expenses";
import { dayMonth, ms } from "@/lib/time";

/**
 * Builds the college reimbursement claim (BVM SSIP) per student from ticket
 * fares plus the shared expenses. Used by the printable report and the CSV.
 */

export type ClaimRow = {
  date: string;
  item: string;
  detail: string;
  paid: number;
  /** Claimable if the college accepts the booked class. */
  claimBooked: number;
  /** Claimable at the most economical class (sleeper). */
  claimEconomy: number;
  source: "ticket" | "expense" | "estimate";
  hasBill: boolean;
};

export type StudentClaim = {
  person: PersonId;
  name: string;
  rows: ClaimRow[];
  paid: number;
  eligibleBooked: number;
  eligibleEconomy: number;
  grantBooked: number;
  grantEconomy: number;
};

const share = (e: Expense, p: PersonId) =>
  (e.split_between.length ? e.split_between : TEAM.map((t) => t.id)).includes(p)
    ? e.amount / (e.split_between.length || TEAM.length)
    : 0;

export function buildClaims(expenses: Expense[]): StudentClaim[] {
  const travel = expenses.filter((e) => e.category === "travel");
  const registration = expenses.filter((e) => e.category === "registration");

  return TEAM.map((person) => {
    const rows: ClaimRow[] = [];

    // Train tickets: one row per leg, at the fare on the ticket.
    for (const item of GRANT.items.filter((i) => i.kind === "train")) {
      const leg = LEGS.find((l) => l.id === item.leg);
      rows.push({
        date: leg ? dayMonth(ms(leg.depart)) : "",
        item: item.label,
        detail: leg?.pnr ? `PNR ${leg.pnr}` : item.note ?? "",
        paid: item.paidPerPerson,
        claimBooked: item.paidPerPerson,
        claimEconomy: item.economyPerPerson ?? item.paidPerPerson,
        source: leg?.pnr ? "ticket" : "estimate",
        hasBill: !!leg?.pnr,
      });
    }

    // Registration: from recorded expenses, else the approved amount.
    const reg = registration.filter((e) => share(e, person.id) > 0);
    if (reg.length) {
      for (const e of reg) {
        const v = share(e, person.id);
        rows.push({ date: dayMonth(`${e.spent_on}T12:00:00+05:30`), item: e.title, detail: "Approved registration fee", paid: v, claimBooked: v, claimEconomy: v, source: "expense", hasBill: !!e.receipt_path });
      }
    } else {
      const fee = GRANT.items.find((i) => i.kind === "fee")!;
      rows.push({ date: "", item: fee.label, detail: "Approved", paid: fee.paidPerPerson, claimBooked: fee.paidPerPerson, claimEconomy: fee.paidPerPerson, source: "estimate", hasBill: false });
    }

    // Local travel: real cab/metro expenses once recorded, else estimates.
    const mine = travel.filter((e) => share(e, person.id) > 0);
    if (mine.length) {
      for (const e of mine) {
        const v = share(e, person.id);
        rows.push({ date: dayMonth(`${e.spent_on}T12:00:00+05:30`), item: e.title, detail: "Station to venue, sharing basis", paid: v, claimBooked: v, claimEconomy: v, source: "expense", hasBill: !!e.receipt_path });
      }
    } else {
      for (const item of GRANT.items.filter((i) => i.kind === "local")) {
        rows.push({ date: "", item: item.label, detail: item.note ?? "", paid: item.paidPerPerson, claimBooked: item.paidPerPerson, claimEconomy: item.paidPerPerson, source: "estimate", hasBill: false });
      }
    }

    const sum = (k: "paid" | "claimBooked" | "claimEconomy") => rows.reduce((s, r) => s + r[k], 0);
    const eligibleBooked = sum("claimBooked");
    const eligibleEconomy = sum("claimEconomy");
    return {
      person: person.id,
      name: person.name,
      rows,
      paid: sum("paid"),
      eligibleBooked,
      eligibleEconomy,
      grantBooked: Math.min(eligibleBooked, GRANT.capPerStudent),
      grantEconomy: Math.min(eligibleEconomy, GRANT.capPerStudent),
    };
  });
}

const csvCell = (v: string | number) => {
  const s = typeof v === "number" ? v.toFixed(2) : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Spreadsheet (CSV, opens in Excel) with every row and per-student totals. */
export function claimCsv(claims: StudentClaim[]) {
  const head = ["Student", "Date", "Item", "Details", "Paid (Rs)", "Claim at booked class (Rs)", "Claim at sleeper rate (Rs)", "Source", "Bill attached"];
  const lines: (string | number)[][] = [
    [`${EVENT.name}, ${EVENT.venue}`],
    [GRANT.policy],
    [`Cap per student: Rs ${GRANT.capPerStudent}`],
    [],
    head,
  ];
  for (const c of claims) {
    for (const r of c.rows) {
      lines.push([c.name, r.date, r.item, r.detail, r.paid, r.claimBooked, r.claimEconomy, r.source, r.hasBill ? "yes" : "no"]);
    }
    lines.push([c.name, "", "TOTAL eligible", "", c.paid, c.eligibleBooked, c.eligibleEconomy, "", ""]);
    lines.push([c.name, "", "GRANT (after cap)", "", "", c.grantBooked, c.grantEconomy, "", ""]);
    lines.push([]);
  }
  // Byte-order mark so Excel opens the file as UTF-8.
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}
