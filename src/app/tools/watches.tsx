import { useState } from "react";
import { View } from "react-native";
import { PLACES, TEAM } from "@/data/trip";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { refresh, useFeed, useNow } from "@/core/data";
import { statusTone } from "@/features/trip";
import { WlGraph } from "@/features/wl-graph";
import { ago, dayMonth, istDateKey } from "@/lib/time";
import { parseStatus } from "@/lib/trip-engine";
import { CLASSES, watchesFrom, watchInterval, watchTitle, type Watch } from "@/lib/watches";
import { Button, Card, Chips, confirm, Empty, Input, Pill, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

const CODES = [...new Set(Object.values(PLACES).flatMap((p) => (p.code ? [p.code] : [])))];
const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

async function call(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const r = await api<{ watch?: Watch }>("/api/watches", { method, body: JSON.stringify(body) });
  await refresh();
  return r;
}

/** Extra PNRs (friends, Tatkal) and a train's waitlist between two stations without a ticket, checked in the background with alerts. */
export default function Watches() {
  const live = useFeed().live;
  const [mode, setMode] = useState<"pnr" | "route" | null>(null);
  const watches = watchesFrom(live);
  return (
    <Page title="Extra PNRs and waitlists" subtitle="Checked automatically, with alerts">
      {mode ? (
        <WatchForm key={mode} mode={mode} onClose={() => setMode(null)} />
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Add PNR" icon="plus" style={{ flex: 1 }} onPress={() => setMode("pnr")} />
          <Button label="Track WL" icon="binoculars" kind="secondary" style={{ flex: 1 }} onPress={() => setMode("route")} />
        </View>
      )}
      {!watches.length && !mode && <Empty icon="binoculars" title="Nothing tracked" body="Add a PNR, or follow a train's waitlist between two stations." />}
      {watches.map((w) => (
        <WatchCard key={w.id} w={w} />
      ))}
    </Page>
  );
}

function WatchCard({ w }: { w: Watch }) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const done = watchInterval(w, now) === null;
  const [from, to, date, cls] = w.kind === "route" ? [w.from, w.to, dayMonth(`${w.date}T00:00:00+05:30`), w.travelClass] : [w.data?.from, w.data?.to, w.data?.journeyDate, w.data?.travelClass];

  async function act(method: "PATCH" | "DELETE") {
    if (method === "DELETE" && !(await confirm("Stop tracking?", watchTitle(w), "Stop"))) return;
    setBusy(true);
    setError("");
    await call(method, { id: w.id }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    setBusy(false);
  }

  return (
    <Card style={[{ gap: 10 }, done && { opacity: 0.6 }]}>
      <T v="overline" color="primary">
        {w.kind === "route" ? "Waitlist without a ticket" : "Extra PNR"}
      </T>
      <T v="heading">{watchTitle(w)}</T>
      <T v="caption" color="muted">
        {[from && to ? `${from} to ${to}` : "", date, cls].filter(Boolean).join(" · ")}
      </T>
      {w.kind === "route" && w.data && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill label={w.data.status} tone={statusTone(parseStatus(w.data.status).kind)} />
          {w.data.confirmChance !== undefined && (
            <T v="caption" color="muted">
              {w.data.confirmChance}% chance{w.data.verdict ? ` · ${w.data.verdict}` : ""}
            </T>
          )}
        </View>
      )}
      {w.kind === "pnr" &&
        w.data?.passengers.map((p) => {
          const seat = p.coach && p.berth ? `${p.coach}/${p.berth}` : undefined;
          const cur = parseStatus(p.current);
          return (
            <View key={p.number} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <T v="label" style={{ width: 22 }}>
                {p.number}
              </T>
              <T v="caption" color="muted" style={{ flex: 1 }}>
                Booked {parseStatus(p.booking).label}
              </T>
              <Pill label={seat ?? cur.label} tone={seat ? "good" : statusTone(cur.kind)} />
            </View>
          );
        })}
      {!!w.error && <Pill label={`Last check failed: ${w.error}`} tone="warn" />}
      {w.history.length > 0 && <WlGraph points={w.history} />}
      {w.kind === "pnr" && w.data?.chartPrepared && (
        <T v="caption" color="good">
          Chart prepared. No more checks needed.
        </T>
      )}
      <T v="caption" color="faint">
        {w.kind === "pnr" ? `PNR ${w.pnr} · ` : ""}
        {w.updatedAt ? `Checked ${ago(w.updatedAt, now)}` : "Not checked yet"}
        {w.addedBy ? ` · added by ${short(w.addedBy)}` : ""}
      </T>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Check now" icon="refresh" kind="secondary" style={{ flex: 1 }} loading={busy} onPress={() => void act("PATCH")} />
        <Button label="Stop" icon="trash-can-outline" kind="danger" style={{ flex: 1 }} disabled={busy} onPress={() => void act("DELETE")} />
      </View>
      {!!error && (
        <T v="caption" color="bad">
          {error}
        </T>
      )}
    </Card>
  );
}

function WatchForm({ mode, onClose }: { mode: "pnr" | "route"; onClose: () => void }) {
  const me = useAuth().session!.person;
  const [pnr, setPnr] = useState("");
  const [trainNo, setTrainNo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(() => istDateKey(Date.now()));
  const [travelClass, setTravelClass] = useState<string>("SL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await call("POST", mode === "pnr" ? { kind: "pnr", pnr, addedBy: me } : { kind: "route", trainNo, from, to, date, travelClass, addedBy: me });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={mode === "pnr" ? "Add a PNR" : "Track a waitlist"}>
      <Card style={{ gap: 12 }}>
        <T v="caption" color="muted">
          {mode === "pnr"
            ? "Checked automatically, with an alert on every change, until the chart is out."
            : "See the waitlist on any train between two stations, without booking. Alerts when it moves to RAC or available."}
        </T>
        {mode === "pnr" ? (
          <Input label="PNR number" value={pnr} onChangeText={setPnr} keyboardType="number-pad" maxLength={12} placeholder="10 digits" />
        ) : (
          <>
            <Input label="Train number" value={trainNo} onChangeText={setTrainNo} keyboardType="number-pad" maxLength={5} placeholder="e.g. 15910" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="From station" value={from} onChangeText={(v) => setFrom(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. DLI" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="To station" value={to} onChangeText={(v) => setTo(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. KYQ" />
              </View>
            </View>
            <T v="caption" color="faint">
              Station codes as on the ticket. Ours: {CODES.join(", ")}.
            </T>
            <Input label="Date the train leaves that station (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-29" />
            <T v="label" color="muted">
              Class
            </T>
            <Chips options={CLASSES.map((x) => ({ value: x, label: x }))} value={travelClass} onChange={setTravelClass} />
          </>
        )}
        <Button label={busy ? "Checking..." : "Start tracking"} loading={busy} onPress={() => void save()} />
        <Button label="Cancel" kind="ghost" disabled={busy} onPress={onClose} />
        {!!error && (
          <T v="label" color="bad">
            {error}
          </T>
        )}
      </Card>
    </Section>
  );
}
