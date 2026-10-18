import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Platform } from "react-native";
import { DEADLINES, EVENT, LEGS, PLACES, REMINDERS, TEAM, USEFUL_NUMBERS, type Leg } from "@/data/trip";
import { useFeed } from "@/core/data";
import type { LiveState } from "@/lib/live-types";
import { hhmm, ms, stamp } from "@/lib/time";
import { buildSteps, legBerths, legPassengers, parseStatus } from "@/lib/trip-engine";
import { Button, Card } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

/** "G8/18, 19" once there are berths, else each person's status. */
function statusOf(leg: Leg, live: LiveState) {
  const berths = legBerths(leg, live);
  if (berths.length) return berths.map((b) => `${short(b.person)} ${b.coach}/${b.berth}`).join(", ");
  return legPassengers(leg, live)
    .map((p) => parseStatus(p.current).label)
    .join(", ");
}

/** One A4 page with everything needed if every phone dies: tickets, times, deadlines, contacts. */
function paperHtml(live: LiveState, now: number) {
  const steps = buildSteps(live).filter((s) => !s.minor);
  const rows = steps
    .map((s) => {
      const leg = s.leg;
      const l = leg ? live.legs[leg.id] : undefined;
      return `<tr><td>${stamp(s.start)}<br><span class="m">to ${hhmm(s.end)}</span></td>
<td><b>${esc(s.title)}</b>${leg?.travelClass ? ` (${leg.travelClass})` : ""}${leg?.modeHint ? `<div class="m">${esc(leg.modeHint)}</div>` : ""}</td>
<td>${leg ? `${esc(PLACES[leg.from].name)} to ${esc(PLACES[leg.to].name)}` : s.place ? esc(PLACES[s.place].name) : ""}${l?.platform ? `<div class="m">Platform ${esc(l.platform)}</div>` : ""}</td>
<td>${leg?.pnr ?? ""}${leg?.pnr ? `<div>${esc(statusOf(leg, live))}</div>` : ""}</td></tr>`;
    })
    .join("");
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Guwahati Run paper backup</title>
<style>body{font:12px/1.35 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:18px}h1{font-size:17px;margin:0}h2{font-size:13px;margin:12px 0 4px}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #111;padding-bottom:3px}table{width:100%;border-collapse:collapse}
th{font-size:10px;text-transform:uppercase;color:#555;text-align:left;border-bottom:1px solid #999;padding:3px 4px}td{border-bottom:1px solid #ddd;padding:3px 4px;vertical-align:top}
.m{color:#555}.cols{display:flex;gap:18px}.cols>div{flex:1}ul{margin:0;padding-left:16px}</style></head><body>
<header><h1>Guwahati Run: paper backup</h1><span class="m">Printed ${stamp(now)} IST. Statuses as of then.</span></header>
<h2>Itinerary</h2><table><tr><th>When</th><th>What</th><th>Route</th><th>PNR, status</th></tr>${rows}</table>
<div class="cols"><div>
<h2>Deadlines</h2>${list(DEADLINES.map((d) => `${stamp(ms(d.at))} ${esc(d.title)}`))}
<h2>Hackathon</h2><p>${esc(EVENT.name)}, ${esc(EVENT.venue)}. ${stamp(ms(EVENT.start))} to ${stamp(ms(EVENT.end))}.</p>
<h2>Remember</h2>${list(REMINDERS.map(esc))}
</div><div>
<h2>Team</h2>${list(TEAM.map((p) => `<b>${esc(p.name)}</b> ${esc(p.phone || "phone: ________")}<div class="m">${esc(p.guardian.name || "Guardian: ________")} ${esc(p.guardian.phone)}</div>`))}
<h2>Numbers</h2>${list([...USEFUL_NUMBERS.map((n) => `<b>${n.number}</b> ${esc(n.label)}`), "PNR by SMS: text PNR &lt;number&gt; to <b>139</b>"])}
<h2>Berths</h2>${list(LEGS.filter((l) => legBerths(l, live).length).map((l) => `${esc(l.train?.name ?? l.id)}: ${esc(statusOf(l, live))}`))}
</div></div></body></html>`;
}

export default function PaperBackup() {
  const live = useFeed().live;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    await fn().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    setBusy(false);
  }
  const html = () => paperHtml(live, Date.now());

  function printWeb() {
    const w = window.open("", "_blank");
    if (!w) return setError("Allow pop-ups for this site to print.");
    w.document.write(html());
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Page title="Paper backup" subtitle="For when every phone is dead">
      <Card style={{ gap: 10 }}>
        <T v="body">One A4 page: every train with PNR, status and platform, deadlines, hackathon times, every phone number, and our berths.</T>
        <T v="caption" color="muted">
          Uses the latest data on this phone. Print it the night before you leave, and again after the charts are out.
        </T>
      </Card>
      <Button
        label="Print or save as PDF"
        icon="printer-outline"
        loading={busy}
        onPress={() => (Platform.OS === "web" ? printWeb() : void run(() => Print.printAsync({ html: html() })))}
      />
      {Platform.OS !== "web" && (
        <Button
          label="Share as PDF"
          icon="share-variant-outline"
          kind="secondary"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const { uri } = await Print.printToFileAsync({ html: html() });
              await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Guwahati Run paper backup" });
            })
          }
        />
      )}
      {!!error && (
        <T v="label" color="bad">
          {error}
        </T>
      )}
    </Page>
  );
}
