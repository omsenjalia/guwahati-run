"use client";

import { useState } from "react";
import { ArrowsClockwise, Binoculars, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PLACES } from "@/data/trip";
import { CopyChip, LiveStamp, Panel } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { WlGraph } from "@/components/pnr-history";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMe } from "@/lib/me";
import { refresh } from "@/lib/sync";
import { dayMonth, istDateKey } from "@/lib/time";
import { parseStatus } from "@/lib/trip-engine";
import type { LiveState } from "@/lib/live-types";
import { CLASSES, watchInterval, watchTitle, watchesFrom, type Watch } from "@/lib/watches";
import { cn } from "@/lib/utils";

type Mode = "pnr" | "route";

const field =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40";
const chip = (on: boolean) =>
  cn(
    "h-11 rounded-full border px-3 text-[0.95rem] font-medium transition active:scale-[0.98]",
    on ? "border-primary bg-accent text-accent-foreground" : "bg-secondary",
  );
const KIND_TONE = { CNF: "text-ok", RAC: "text-ok", WL: "text-warn", CAN: "text-bad", UNKNOWN: "text-muted-foreground" };
/** Station codes we already use, offered as suggestions. */
const CODES = [...new Set(Object.values(PLACES).flatMap((p) => (p.code ? [p.code] : [])))];

async function call(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const res = await fetch("/api/watches", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Error ${res.status}`);
  void refresh();
  return j as { watch?: Watch };
}

/** The two buttons under the Tickets heading. */
export function WatchButtons({ onAdd }: { onAdd: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={() => onAdd("pnr")}>
        <Plus weight="bold" />
        Add PNR
      </Button>
      <Button variant="secondary" onClick={() => onAdd("route")}>
        <Binoculars />
        Track WL
      </Button>
    </div>
  );
}

/** Everything added with those buttons, at the bottom of the Tickets page. */
export function WatchList({ live, now }: { live: LiveState; now: number }) {
  const watches = watchesFrom(live);
  if (!watches.length) return null;
  return (
    <>
      <p className="pt-2 text-sm font-semibold text-muted-foreground">Also tracking</p>
      {watches.map((w) => (
        <WatchCard key={w.id} w={w} now={now} />
      ))}
    </>
  );
}

function WatchCard({ w, now }: { w: Watch; now: number }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const done = watchInterval(w, now) === null;

  async function act(method: "PATCH" | "DELETE") {
    setBusy(true);
    try {
      await call(method, { id: w.id });
      if (method === "DELETE") toast.success("Stopped tracking");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  const route = w.kind === "route";
  const [from, to, date, cls] =
    w.kind === "route"
      ? [w.from, w.to, dayMonth(`${w.date}T00:00:00+05:30`), w.travelClass]
      : [w.data?.from, w.data?.to, w.data?.journeyDate, w.data?.travelClass];

  return (
    <Panel id={`w-${w.id}`} className={cn("scroll-mt-20 p-0", done && "opacity-55")}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">{route ? "Waitlist without a ticket" : "Extra PNR"}</p>
            <p className="text-lg font-semibold leading-tight">{watchTitle(w)}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Check now" disabled={busy} onClick={() => act("PATCH")}>
            <ArrowsClockwise className={cn("size-5", busy && "animate-spin")} />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[from && to ? `${from} to ${to}` : "", date, cls].filter(Boolean).join(" · ")}
        </p>
      </div>

      {w.kind === "route" && w.data && (
        <div className="flex items-baseline justify-between gap-3 border-t px-4 py-3">
          <span className={cn("font-mono text-lg font-semibold tabular", KIND_TONE[parseStatus(w.data.status).kind])}>{w.data.status}</span>
          {w.data.confirmChance !== undefined && (
            <span className="text-sm text-muted-foreground">
              {w.data.confirmChance}% chance{w.data.verdict ? ` · ${w.data.verdict}` : ""}
            </span>
          )}
        </div>
      )}

      {w.kind === "pnr" && w.data && (
        <table className="w-full border-t text-[0.95rem]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 pl-4 font-medium">#</th>
              <th className="py-2 font-medium">Booked</th>
              <th className="py-2 pr-4 text-right font-medium">Now</th>
            </tr>
          </thead>
          <tbody>
            {w.data.passengers.map((p) => {
              const cur = parseStatus(p.current);
              const seat = p.coach && p.berth ? `${p.coach}/${p.berth}` : undefined;
              return (
                <tr key={p.number}>
                  <td className="py-2.5 pl-4 font-medium">{p.number}</td>
                  <td className="py-2.5 font-mono text-muted-foreground tabular">{parseStatus(p.booking).label}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={cn("font-mono font-semibold tabular", seat ? "text-ok" : KIND_TONE[cur.kind])}>{seat ?? cur.label}</span>
                    {p.confirmChance !== undefined && !seat && <span className="block text-xs text-muted-foreground">{p.confirmChance}% chance</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="flex flex-col gap-3 border-t p-4">
        {w.error && <p className="rounded-lg bg-warn-soft px-3 py-2.5 text-sm leading-snug">Last check failed: {w.error}</p>}
        {w.history.length > 0 && <WlGraph points={w.history} />}
        {w.kind === "pnr" && w.data?.chartPrepared && <p className="text-xs font-medium text-ok">Chart prepared. No more checks needed.</p>}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {w.kind === "pnr" && <CopyChip value={w.pnr} label="PNR" />}
            <Button
              variant={confirm ? "destructive" : "ghost"}
              size={confirm ? "default" : "icon"}
              aria-label="Stop tracking"
              disabled={busy}
              onClick={() => (confirm ? act("DELETE") : setConfirm(true))}
              onBlur={() => setConfirm(false)}
            >
              <Trash className="size-5" />
              {confirm && "Tap again to remove"}
            </Button>
          </div>
          <div className="text-right">
            <LiveStamp updatedAt={w.updatedAt} fallback="Not checked yet" />
            {w.addedBy && <p className="text-xs text-subtle">Added by {personName(w.addedBy)}</p>}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- forms */

export function WatchSheet({ mode, onClose }: { mode: Mode | null; onClose: () => void }) {
  return (
    <Sheet open={!!mode} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        {mode && <WatchForm key={mode} mode={mode} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function WatchForm({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const me = useMe();
  const [pnr, setPnr] = useState("");
  const [trainNo, setTrainNo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(() => istDateKey(Date.now()));
  const [travelClass, setTravelClass] = useState<string>("SL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = mode === "pnr" ? { kind: "pnr", pnr, addedBy: me } : { kind: "route", trainNo, from, to, date, travelClass, addedBy: me };
      const { watch } = await call("POST", body);
      toast.success("Tracking. It's at the bottom of this page.");
      onClose();
      if (watch) setTimeout(() => document.getElementById(`w-${watch.id}`)?.scrollIntoView({ behavior: "smooth" }), 600);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{mode === "pnr" ? "Add a PNR" : "Track a waitlist"}</SheetTitle>
        <SheetDescription>
          {mode === "pnr"
            ? "Checked automatically, with an alert on every change, until the chart is out."
            : "See the waitlist on any train between two stations, without booking. Alerts when it moves to RAC or available."}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={save} className="flex flex-col gap-5 px-4">
        {mode === "pnr" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="w-pnr" className="text-sm font-medium">PNR number</label>
            <input id="w-pnr" inputMode="numeric" autoComplete="off" maxLength={12} placeholder="10 digits" value={pnr} onChange={(e) => setPnr(e.target.value)} className={cn(field, "font-mono tabular")} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-train" className="text-sm font-medium">Train number</label>
              <input id="w-train" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="e.g. 12506" value={trainNo} onChange={(e) => setTrainNo(e.target.value)} className={cn(field, "font-mono tabular")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="w-from" className="text-sm font-medium">From station</label>
                <input id="w-from" list="w-codes" autoCapitalize="characters" autoComplete="off" placeholder="e.g. ANVT" value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} className={cn(field, "font-mono uppercase")} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="w-to" className="text-sm font-medium">To station</label>
                <input id="w-to" list="w-codes" autoCapitalize="characters" autoComplete="off" placeholder="e.g. KYQ" value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} className={cn(field, "font-mono uppercase")} />
              </div>
              <datalist id="w-codes">
                {CODES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="col-span-2 -mt-1 text-xs text-muted-foreground">Station codes, as on the ticket (NDLS, KYQ, ADI...).</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-date" className="text-sm font-medium">Date the train leaves that station</label>
              <input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Class</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Class">
                {CLASSES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={travelClass === c} onClick={() => setTravelClass(c)} className={chip(travelClass === c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <p className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Checking..." : "Start tracking"}
        </Button>
      </form>
    </>
  );
}
