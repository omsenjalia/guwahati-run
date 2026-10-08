"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TEAM } from "@/data/trip";
import { Panel, PanelTitle, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { checkIn, latestByPerson, useCheckins, type Checkin } from "@/lib/checkins";
import { useMe } from "@/lib/me";
import { HOUR, ago } from "@/lib/time";
import { cn } from "@/lib/utils";

const RECENT = 3 * HOUR;

/** One tap "I'm here", plus whether all four of us are together. */
export function CheckinPanel({ place, now }: { place: string; now: number }) {
  const me = useMe();
  const items = useCheckins();
  const [busy, setBusy] = useState(false);
  const [withLocation, setWithLocation] = useState(true);

  const latest = items ? latestByPerson(items) : null;
  const fresh = (c?: Checkin) => !!c && now - Date.parse(c.created_at) < RECENT && c.place === place;
  const here = latest ? TEAM.filter((p) => fresh(latest[p.id])) : [];
  const missing = TEAM.filter((p) => !here.includes(p));
  const iAmIn = !!me && here.some((p) => p.id === me);

  async function tap() {
    if (!me) return;
    setBusy(true);
    try {
      const r = await checkIn(me, place, withLocation);
      toast.success(r.located || !withLocation ? "Checked in" : "Checked in (location unavailable)");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle
        aside={
          latest && (
            <StatusPill health={here.length === TEAM.length ? "green" : here.length ? "amber" : "red"}>
              {here.length === TEAM.length ? "All 4 together" : `${here.length} of 4 here`}
            </StatusPill>
          )
        }
      >
        Check-in
      </PanelTitle>
      <p className="text-[0.95rem] leading-snug">
        <span className="text-muted-foreground">Now: </span>
        {place}
      </p>

      {!me ? (
        <Link href="/team" className="mt-3 block text-sm font-medium text-primary">
          Pick whose phone this is (Team tab) to check in.
        </Link>
      ) : (
        <>
          <Button onClick={tap} disabled={busy || iAmIn} size="lg" className="mt-3 h-14 w-full text-base">
            {iAmIn ? <CheckCircle className="size-5" weight="fill" /> : <MapPin className="size-5" weight="fill" />}
            {iAmIn ? "You're checked in" : busy ? "Checking in" : "I'm here"}
          </Button>
          {!iAmIn && (
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} className="size-5 accent-[var(--primary)]" />
              Include my location
            </label>
          )}
        </>
      )}

      {latest && (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {TEAM.map((p) => {
            const c = latest[p.id];
            const ok = fresh(c);
            return (
              <li key={p.id} className={cn("rounded-lg px-3 py-2", ok ? "bg-ok-soft" : "bg-secondary")}>
                <p className={cn("text-sm font-semibold", ok && "text-ok")}>{p.short}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c ? `${ok ? "Here" : c.place ?? "Checked in"}, ${ago(Date.parse(c.created_at), now)}` : "No check-in yet"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {latest && missing.length > 0 && here.length > 0 && (
        <p className="mt-2 text-xs text-warn">Waiting for {missing.map((p) => p.short).join(", ")}.</p>
      )}
    </Panel>
  );
}
