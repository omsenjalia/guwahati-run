"use client";

import { useState } from "react";
import { FirstAid, Phone, ShareNetwork, Siren } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PLACES, TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { useNow } from "@/lib/clock";
import { telLink } from "@/lib/links";
import { useLive } from "@/lib/live-store";
import { useMe } from "@/lib/me";
import { hhmm } from "@/lib/time";
import { buildSteps, computeNow, personBerth } from "@/lib/trip-engine";

const LOST = [
  {
    title: "Lost the e-ticket or phone with it",
    steps: [
      "The ticket is the PNR plus a valid photo ID. Tell the TTE your PNR (it's in this app and on the paper backup).",
      "Any teammate can show the PNR from their phone, or you can text PNR <number> to 139.",
      "Reprint later from IRCTC: My Account, Booked Ticket History.",
    ],
  },
  {
    title: "Lost an ID card",
    steps: [
      "Railways accept Aadhaar or driving licence from DigiLocker (or the mAadhaar app) as valid ID.",
      "Set up DigiLocker on every phone before the trip so this is ready offline.",
      "If the ID was lost on the train or at a station, report it to RPF (139) for a written record.",
    ],
  },
  {
    title: "Lost or stolen phone",
    steps: [
      "Call the number from a teammate's phone. Ask the TTE or coach attendant to check the coach.",
      "Report it: Rail Madad (139 or the Rail Madad app) and RPF or GRP at the next big station. Get the complaint number.",
      "Block the SIM with your operator, then block the phone's IMEI on the Sanchar Saathi (CEIR) portal using that complaint.",
      "Change your UPI PIN and email password from another device.",
    ],
  },
  {
    title: "Lost wallet or cards",
    steps: [
      "Block cards from your bank app on a teammate's phone, or call the bank's helpline.",
      "Log the loss in Money if teammates cover you, so it's settled later.",
      "Report to RPF (139) if it happened on the train.",
    ],
  },
];

/** Emergency screen: share where we are, call for help, find a hospital. */
export function SosView() {
  const now = useNow();
  const live = useLive();
  const me = useMe();
  const [busy, setBusy] = useState(false);
  if (now === null) return <Skeleton className="h-96" />;

  const state = computeNow(buildSteps(live), now);
  const step = state.focus;
  const leg = step?.leg;
  const berth = me && leg ? personBerth(leg, live, me) : undefined;
  const person = TEAM.find((p) => p.id === me);

  function tripLine() {
    if (!step) return "";
    if (leg?.train && state.focusMode === "active") {
      const where = live.legs[leg.id]?.lastStation ? `, near ${live.legs[leg.id]!.lastStation}` : "";
      return `On ${leg.train.number} ${leg.train.name} (${PLACES[leg.from].short} to ${PLACES[leg.to].short}${where})${berth ? `, coach ${berth.coach} berth ${berth.berth}` : ""}${leg.pnr ? `, PNR ${leg.pnr}` : ""}.`;
    }
    return `${step.title}${step.place ? ` at ${PLACES[step.place].name}` : ""}.`;
  }

  async function share() {
    setBusy(true);
    let loc = "";
    const pos = await new Promise<GeolocationPosition | null>((resolve) =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000 })
        : resolve(null),
    );
    if (pos) loc = ` Location: https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
    const text = `SOS from ${person?.name ?? "Guwahati Run team"} at ${hhmm(now!)} IST. ${tripLine()}${loc}`;
    try {
      if (navigator.share) await navigator.share({ title: "SOS", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("SOS message copied. Paste it in WhatsApp or SMS.");
      }
    } catch {
      // Share sheet closed: nothing to do.
    } finally {
      setBusy(false);
    }
  }

  const call = "flex h-16 flex-col items-center justify-center rounded-xl text-center active:scale-[0.98]";
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">SOS</h1>

      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="flex h-20 items-center justify-center gap-3 rounded-2xl bg-bad text-lg font-semibold text-background active:scale-[0.99] disabled:opacity-70"
      >
        <ShareNetwork className="size-7" weight="bold" />
        {busy ? "Getting location" : "Share where I am"}
      </button>
      <p className="-mt-1 px-1 text-sm text-muted-foreground">
        Opens WhatsApp, SMS and the rest with your location{leg?.train ? ", train, coach and PNR" : ""}.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <a href={telLink("112")} className={`${call} bg-bad-soft text-bad`}>
          <span className="flex items-center gap-1.5 text-lg font-bold">
            <Siren className="size-5" weight="bold" />
            112
          </span>
          <span className="text-xs">Police, ambulance, fire</span>
        </a>
        <a href={telLink("139")} className={`${call} bg-warn-soft text-warn`}>
          <span className="flex items-center gap-1.5 text-lg font-bold">
            <Phone className="size-5" weight="bold" />
            139
          </span>
          <span className="text-xs">Rail Madad, RPF on trains</span>
        </a>
      </div>

      <a
        href="https://www.google.com/maps/search/?api=1&query=hospital"
        target="_blank"
        rel="noreferrer"
        className="flex h-14 items-center justify-center gap-2 rounded-xl border bg-card text-[0.95rem] font-medium active:scale-[0.98]"
      >
        <FirstAid className="size-5 text-bad" weight="bold" />
        Nearest hospital
      </a>

      <Panel>
        <PanelTitle>Team</PanelTitle>
        <ul className="flex flex-col gap-2">
          {TEAM.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="font-medium">{p.name}</span>
              <span className="flex gap-2">
                {p.phone ? (
                  <a href={telLink(p.phone)} className="inline-flex h-10 items-center rounded-lg bg-secondary px-3 text-sm font-medium">
                    Call
                  </a>
                ) : (
                  <span className="text-xs text-subtle">No number</span>
                )}
                {p.guardian.phone && (
                  <a href={telLink(p.guardian.phone)} className="inline-flex h-10 items-center rounded-lg bg-secondary px-3 text-sm font-medium">
                    Parent
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {USEFUL_NUMBERS.filter((n) => n.number !== "112" && n.number !== "139").map((n) => (
            <li key={n.number}>
              <a href={telLink(n.number)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-secondary px-3 text-sm">
                <span className="font-mono font-semibold">{n.number}</span>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelTitle>If something is lost</PanelTitle>
        <div className="flex flex-col">
          {LOST.map((l) => (
            <details key={l.title} className="group border-t first:border-t-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[0.95rem] font-medium">
                {l.title}
                <span className="text-subtle transition group-open:rotate-45">+</span>
              </summary>
              <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[0.95rem] leading-snug">
                {l.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  );
}
