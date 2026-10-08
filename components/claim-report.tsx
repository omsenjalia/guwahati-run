"use client";

import { useEffect } from "react";
import { EVENT, GRANT } from "@/data/trip";
import { useNow } from "@/lib/clock";
import { buildClaims } from "@/lib/claim";
import { stamp } from "@/lib/time";
import { startSync } from "@/lib/sync";
import { useExpenses } from "@/lib/use-expenses";

const rs = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Printable reimbursement claim for the BVM SSIP committee: one section per
 * student with every item, the claimable amount under both fare rules, and
 * the capped grant. Always light, A4. Print or "Save as PDF".
 */
export function ClaimReport() {
  const now = useNow();
  const { items } = useExpenses();
  useEffect(() => startSync(), []);
  if (now === null || !items) return null;
  const claims = buildClaims(items);
  const totals = claims.reduce(
    (t, c) => ({ paid: t.paid + c.paid, booked: t.booked + c.grantBooked, economy: t.economy + c.grantEconomy }),
    { paid: 0, booked: 0, economy: 0 },
  );

  return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-6 text-[12.5px] leading-snug text-zinc-900 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <a href="/grant" className="text-sm text-zinc-600 underline">
          Back
        </a>
        <button type="button" onClick={() => window.print()} className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">
          Print or save as PDF
        </button>
      </div>

      <header className="border-b-2 border-zinc-900 pb-2">
        <p className="text-[11px] uppercase text-zinc-600">Birla Vishvakarma Mahavidyalaya, SSIP 2.0</p>
        <h1 className="text-lg font-bold">Expense reimbursement claim: {EVENT.name}</h1>
        <p>
          {EVENT.venue}, 31 Oct to 1 Nov 2026. Travel 28 Oct to 4 Nov 2026. Prepared {stamp(now)}.
        </p>
      </header>

      <table className="mt-3 w-full border-collapse">
        <tbody>
          <tr>
            <td className="py-0.5 pr-3 text-zinc-600">Policy</td>
            <td>{GRANT.policy}</td>
          </tr>
          <tr>
            <td className="py-0.5 pr-3 text-zinc-600">Limit</td>
            <td>₹{GRANT.capPerStudent.toLocaleString("en-IN")} per student (event outside Gujarat)</td>
          </tr>
          <tr>
            <td className="py-0.5 pr-3 text-zinc-600">Team total</td>
            <td>
              Spent {rs(totals.paid)}. Claim {rs(totals.booked)} at booked class, or {rs(totals.economy)} at sleeper rate.
            </td>
          </tr>
        </tbody>
      </table>

      {claims.map((c) => (
        <section key={c.person} className="mt-5 break-inside-avoid">
          <h2 className="border-b border-zinc-400 pb-0.5 font-bold">{c.name}</h2>
          <table className="mt-1 w-full border-collapse text-left">
            <thead>
              <tr className="text-[10.5px] uppercase text-zinc-600">
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Item</th>
                <th className="py-1 pr-2 text-right">Paid</th>
                <th className="py-1 pr-2 text-right">Claim (booked)</th>
                <th className="py-1 text-right">Claim (sleeper)</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r, i) => (
                <tr key={i} className="border-t border-zinc-200 align-top">
                  <td className="py-1 pr-2 whitespace-nowrap">{r.date}</td>
                  <td className="py-1 pr-2">
                    {r.item}
                    <span className="block text-[11px] text-zinc-600">
                      {r.detail}
                      {r.source === "estimate" ? " (estimate, bill to follow)" : ""}
                    </span>
                  </td>
                  <td className="py-1 pr-2 text-right font-mono">{rs(r.paid)}</td>
                  <td className="py-1 pr-2 text-right font-mono">{rs(r.claimBooked)}</td>
                  <td className="py-1 text-right font-mono">{rs(r.claimEconomy)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-900 font-semibold">
                <td className="py-1 pr-2" colSpan={2}>
                  Eligible total
                </td>
                <td className="py-1 pr-2 text-right font-mono">{rs(c.paid)}</td>
                <td className="py-1 pr-2 text-right font-mono">{rs(c.eligibleBooked)}</td>
                <td className="py-1 text-right font-mono">{rs(c.eligibleEconomy)}</td>
              </tr>
              <tr className="font-bold">
                <td className="py-1 pr-2" colSpan={3}>
                  Reimbursement requested (after ₹{GRANT.capPerStudent.toLocaleString("en-IN")} limit)
                </td>
                <td className="py-1 pr-2 text-right font-mono">{rs(c.grantBooked)}</td>
                <td className="py-1 text-right font-mono">{rs(c.grantEconomy)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-6 flex justify-between text-[11px] text-zinc-600">
            <span>Student signature: ____________________</span>
            <span>HOD approval: ____________________</span>
          </p>
        </section>
      ))}

      <section className="mt-6 break-inside-avoid">
        <h2 className="font-bold">Attached documents</h2>
        <ul className="mt-1 list-disc pl-5">
          {GRANT.documents.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
