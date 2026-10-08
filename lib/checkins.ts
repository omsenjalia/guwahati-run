"use client";

import { useEffect, useState } from "react";
import { PLACES, TEAM, type PersonId } from "@/data/trip";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";
import type { NowState } from "@/lib/trip-engine";

/** "I'm here" check-ins: one tap at each key point, shared by all phones. */

export type Checkin = {
  id: number;
  person: PersonId;
  place: string | null;
  note: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
};

/** Where we should be right now, as a check-in label. */
export function checkpointLabel(state: NowState): string {
  const s = state.focus;
  if (state.phase === "post-trip" || !s) return "Home";
  if (state.phase === "pre-trip") return s.from ? PLACES[s.from].name : "Home";
  const active = state.focusMode === "active";
  if (s.kind === "train" || s.kind === "local-train") {
    return active ? `On ${s.leg?.train?.name ?? "the train"}` : PLACES[s.from!].name;
  }
  if (s.kind === "transfer") return active ? `On the way to ${PLACES[s.to!].short}` : PLACES[s.from!].name;
  if (s.kind === "event") return "Hackathon venue, IIT Guwahati";
  return s.place ? PLACES[s.place].name : "On the way";
}

const KEY = "checkins";

export function useCheckins() {
  const [items, setItems] = useState<Checkin[] | null>(null);
  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<Checkin[]>(KEY).then((saved) => alive && saved && setItems((c) => c ?? saved));
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data } = await sb.from("checkins").select("*").order("created_at", { ascending: false }).limit(60);
      if (!alive || !data) return;
      setItems(data as Checkin[]);
      void idbSet(KEY, data);
    };
    void load();
    const ch = sb
      .channel(channelName("checkins"))
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(ch);
    };
  }, []);
  return items;
}

/** Latest check-in per person. */
export function latestByPerson(items: Checkin[]) {
  return Object.fromEntries(TEAM.map((p) => [p.id, items.find((c) => c.person === p.id)])) as Record<PersonId, Checkin | undefined>;
}

export async function checkIn(person: PersonId, place: string, withLocation: boolean) {
  let lat: number | null = null;
  let lon: number | null = null;
  if (withLocation && "geolocation" in navigator) {
    const pos = await new Promise<GeolocationPosition | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }),
    );
    if (pos) {
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    }
  }
  if (!(await ensureSession())) throw new Error("No connection. Try again when you have signal.");
  const { error } = await browserDb().from("checkins").insert({ person, place, lat, lon });
  if (error) throw new Error(error.message);
  return { located: lat !== null };
}
