"use client";

import { useEffect, useState } from "react";
import type { LegId } from "@/data/trip";
import type { PassengerLive } from "@/lib/live-types";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";
import { dayMonth, stamp } from "@/lib/time";
import { parseStatus } from "@/lib/trip-engine";

type Row = { fetched_at: string; chart_prepared: boolean | null; passengers: PassengerLive[] };

/** Highest waitlist number on the ticket at each check (0 once nobody is waitlisted). */
const worstWl = (r: Row) =>
  Math.max(0, ...r.passengers.map((p) => {
    const s = parseStatus(p.current);
    return s.kind === "WL" ? (s.number ?? 0) : 0;
  }));

/** Waitlist movement for the tracked ticket, one point per status change. */
export function PnrHistory({ legId }: { legId: LegId }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const key = `pnr-history-${legId}`;

  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<Row[]>(key).then((saved) => alive && saved && setRows((cur) => cur ?? saved));
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data } = await sb
        .from("pnr_history")
        .select("fetched_at, chart_prepared, passengers")
        .eq("leg_id", legId)
        .order("fetched_at", { ascending: true })
        .limit(500);
      if (!alive || !data) return;
      setRows(data as Row[]);
      void idbSet(key, data);
    };
    void load();
    const channel = sb
      .channel(channelName(`pnr-history-${legId}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pnr_history", filter: `leg_id=eq.${legId}` }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(channel);
    };
  }, [legId, key]);

  if (!rows?.length) return null;
  return <WlGraph points={rows.map((r) => ({ t: Date.parse(r.fetched_at), wl: worstWl(r) }))} />;
}

/** Step graph of the waitlist number over time (0 = seated / available). */
export function WlGraph({ points }: { points: { t: number; wl: number }[] }) {
  if (!points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];

  const W = 320;
  const H = 96;
  const pad = 6;
  const maxWl = Math.max(...points.map((p) => p.wl), 1);
  const t0 = first.t;
  const t1 = Math.max(last.t, t0 + 1);
  const x = (t: number) => pad + ((t - t0) / (t1 - t0)) * (W - 2 * pad);
  const y = (wl: number) => pad + (1 - wl / maxWl) * (H - 2 * pad);
  // Step line: status holds until the next change.
  const d = points
    .map((p, i) => (i === 0 ? `M${x(p.t)},${y(p.wl)}` : `H${x(p.t)}V${y(p.wl)}`))
    .join("");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">Waitlist movement</p>
        <p className="font-mono text-xs tabular text-muted-foreground">
          {first.wl ? `WL ${first.wl}` : "seated"} to <span className="font-semibold text-foreground">{last.wl ? `WL ${last.wl}` : "seated"}</span>
        </p>
      </div>
      {points.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 h-24 w-full" role="img" aria-label={`Waitlist moved from ${first.wl} to ${last.wl}`}>
          <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeDasharray="3 3" />
          <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={x(p.t)} cy={y(p.wl)} r={2.5} fill="var(--primary)" />
          ))}
        </svg>
      ) : (
        <p className="mt-1 text-xs text-subtle">No change since tracking started.</p>
      )}
      <div className="flex justify-between text-[0.7rem] text-subtle">
        <span>{dayMonth(first.t)}</span>
        <span>{points.length} change{points.length === 1 ? "" : "s"}, last {stamp(last.t)}</span>
      </div>
    </div>
  );
}
