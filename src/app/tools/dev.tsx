import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import type { LegId } from "@/data/trip";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { refresh, useFeed, useNow } from "@/core/data";
import { useLoad } from "@/core/use-load";
import { LegChip } from "@/features/bits";
import { firstName, trainLegs } from "@/features/trip";
import { isDeveloper } from "@/lib/auth";
import type { LegLive } from "@/lib/live-types";
import { BACKUP, PRIMARY, storedChoice, type TicketChoice } from "@/lib/ticket-choice";
import { ago, stamp } from "@/lib/time";
import { Button, Card, Chips, confirm, Empty, InfoRow, Input, LinkRow, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

/**
 * Developer options, Om only (the server checks too): switch the backup
 * train off, override live train data, run background jobs, edit any saved
 * value, and edit the trip plan itself.
 */

type StateRow = { key: string; value: unknown; updated_at: string };
type OverrideRow = { leg_id: string; data: Partial<LegLive>; updated_at: string };
type DevData = { state: StateRow[]; overrides: OverrideRow[] };

const save = (table: "app_state" | "overrides", key: string, value: unknown) =>
  api("/api/dev", { method: "POST", body: JSON.stringify({ table, key, value }) });

export default function Dev() {
  const { session } = useAuth();
  const { data, error, reload: load } = useLoad(() => api<DevData>("/api/dev"));
  const reload = async () => {
    await Promise.all([load(), refresh()]);
  };

  if (!isDeveloper(session)) {
    return (
      <Page title="Developer options">
        <Empty icon="lock-outline" title="Only for Om" body="These settings change the trip for everyone." />
      </Page>
    );
  }
  return (
    <Page title="Developer options" subtitle="Changes apply to every phone">
      {!!error && (
        <T v="label" color="bad">
          {error}
        </T>
      )}
      <TicketChoiceCard onSaved={reload} />
      <LiveTestCard />
      <OverrideCard overrides={data?.overrides ?? []} onSaved={reload} />
      <JobsCard onRan={reload} />
      <Section title="Trip plan">
        <Card style={{ gap: 12 }}>
          <T v="body" color="muted">
            Trains, times, PNRs, people, hotel, checklists: the whole plan file. Saved to GitHub; the server updates in about 2 minutes and every phone picks it
            up by itself.
          </T>
          <Button label="Edit the trip plan" icon="file-document-edit-outline" kind="secondary" onPress={() => router.push("/tools/trip-file")} />
        </Card>
      </Section>
      <StateCard rows={data?.state ?? null} onSaved={reload} />
    </Page>
  );
}

/* ------------------------------------------------------- ticket choice */

/** North East vs backup: pick the winner by hand (turns the other one off everywhere). */
function TicketChoiceCard({ onSaved }: { onSaved: () => Promise<void> }) {
  const live = useFeed().live;
  const choice = storedChoice(live);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const name = (id: LegId) => (id === PRIMARY.id ? `${PRIMARY.train!.number} North East` : `${BACKUP.train!.number} ${BACKUP.train!.name}`);

  async function set(next: TicketChoice | null) {
    const msg = next ? `Use ${name(next.winner)}. ${name(next.loser)} disappears from every phone and stops being tracked.` : "Watch both tickets again until one clears.";
    if (!(await confirm("Change the ticket choice?", msg, "Change"))) return;
    setBusy(true);
    setNote("");
    await save("app_state", "ticket-choice", next).catch((e) => setNote(e instanceof Error ? e.message : String(e)));
    await onSaved();
    setBusy(false);
  }

  return (
    <Section title="Backup train">
      <Card style={{ gap: 12 }}>
        <InfoRow
          icon={choice ? "check-decagram" : "help-circle-outline"}
          tone={choice ? "good" : "warn"}
          label="Ticket choice"
          value={choice ? `Using ${name(choice.winner)}; ${name(choice.loser)} is off (since ${stamp(choice.at)})` : "Not decided: both tickets are shown and tracked"}
        />
        <Button
          label={`Use North East, turn off ${BACKUP.train!.number}`}
          icon="train"
          kind={choice?.winner === PRIMARY.id ? "secondary" : "primary"}
          loading={busy}
          disabled={choice?.winner === PRIMARY.id}
          onPress={() => void set({ winner: PRIMARY.id, loser: BACKUP.id, at: Date.now() })}
        />
        <Button
          label={`Use ${BACKUP.train!.number}, turn off North East`}
          icon="lifebuoy"
          kind="secondary"
          disabled={busy || choice?.winner === BACKUP.id}
          onPress={() => void set({ winner: BACKUP.id, loser: PRIMARY.id, at: Date.now() })}
        />
        {choice && <Button label="Undo: show and track both" icon="undo" kind="ghost" disabled={busy} onPress={() => void set(null)} />}
        {!!note && (
          <T v="caption" color="bad">
            {note}
          </T>
        )}
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------- live test */

/** Opens the Train tab on the latest real run of one of our trains, to see live tracking work before the trip. */
function LiveTestCard() {
  const legs = trainLegs(useFeed().live);
  return (
    <Section title="Test live tracking">
      <Card style={{ gap: 12 }}>
        <T v="body" color="muted">
          Plays the latest real run of a train (today&apos;s if it has left, else the last one) on the Train tab: status, every station, and the train moving on the map.
          Nothing is saved.
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {legs.map((x) => (
            <LegChip key={x.id} leg={x} active={false} onPress={() => router.push({ pathname: "/train", params: { test: x.id } })} />
          ))}
        </ScrollView>
      </Card>
    </Section>
  );
}

/* ----------------------------------------------------------- overrides */

const TRI = [
  { value: "auto", label: "Live data" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
type Tri = (typeof TRI)[number]["value"];
const tri = (v?: boolean): Tri => (v === undefined ? "auto" : v ? "yes" : "no");

/** Hand-set live fields for one train; they win over fetched data until cleared. */
function OverrideCard({ overrides, onSaved }: { overrides: OverrideRow[]; onSaved: () => Promise<void> }) {
  const live = useFeed().live;
  const legs = trainLegs(live);
  const [legId, setLegId] = useState<string>(legs[0]?.id ?? "L1");
  const leg = legs.find((l) => l.id === legId) ?? legs[0];
  const current = overrides.find((o) => o.leg_id === leg?.id);
  return (
    <Section title="Override live train data">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -4 }}>
        {legs.map((x) => (
          <LegChip key={x.id} leg={x} active={x.id === leg?.id} onPress={() => setLegId(x.id)} />
        ))}
      </ScrollView>
      {/* Remount per leg (and after a save) so the form starts from what's stored. */}
      {leg && <OverrideForm key={`${leg.id}-${current?.updated_at ?? ""}`} legId={leg.id} saved={current?.data} onSaved={onSaved} />}
    </Section>
  );
}

function OverrideForm({ legId, saved, onSaved }: { legId: string; saved?: Partial<LegLive>; onSaved: () => Promise<void> }) {
  const live = useFeed().live;
  const leg = trainLegs(live).find((l) => l.id === legId)!;
  const fetched = live.legs[leg.id];
  const o = saved ?? {};
  const [platform, setPlatform] = useState(o.platform ?? "");
  const [arrivalPlatform, setArrivalPlatform] = useState(o.arrivalPlatform ?? "");
  const [delay, setDelay] = useState(o.delayMin !== undefined ? String(o.delayMin) : "");
  const [depart, setDepart] = useState(o.expectedDepart ?? "");
  const [arrive, setArrive] = useState(o.expectedArrive ?? "");
  const [coaches, setCoaches] = useState(o.coachPosition ?? "");
  const [chart, setChart] = useState<Tri>(tri(o.chartPrepared));
  const [cancelled, setCancelled] = useState<Tri>(tri(o.trainCancelled));
  const [pax, setPax] = useState<Record<string, string>>(() => Object.fromEntries((o.passengers ?? []).map((p) => [p.person, p.current])));
  const [json, setJson] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  function build(): Partial<LegLive> {
    const out: Partial<LegLive> = {};
    if (platform.trim()) out.platform = platform.trim();
    if (arrivalPlatform.trim()) out.arrivalPlatform = arrivalPlatform.trim();
    if (delay.trim()) out.delayMin = Number(delay);
    if (depart.trim()) out.expectedDepart = depart.trim();
    if (arrive.trim()) out.expectedArrive = arrive.trim();
    if (coaches.trim()) out.coachPosition = coaches.trim();
    if (chart !== "auto") out.chartPrepared = chart === "yes";
    if (cancelled !== "auto") out.trainCancelled = cancelled === "yes";
    if (Object.values(pax).some((v) => v.trim())) {
      out.passengers = (leg.passengers ?? []).map((p) => {
        const f = fetched?.passengers?.find((x) => x.person === p.person);
        return { person: p.person, booked: f?.booked ?? p.booked, current: pax[p.person]?.trim() || f?.current || p.current || "" };
      });
    }
    return out;
  }

  async function submit(value: Partial<LegLive> | null) {
    if (value && delay.trim() && Number.isNaN(Number(delay))) return setNote("Delay must be a number of minutes.");
    for (const t of [depart, arrive]) if (value && t.trim() && Number.isNaN(Date.parse(t))) return setNote("Times look like 2026-10-29T07:22:00+05:30.");
    setBusy(true);
    setNote("");
    try {
      await save("overrides", leg.id, value && Object.keys(value).length ? value : null);
      await onSaved();
      setNote(value && Object.keys(value).length ? "Saved. Every phone shows it on its next refresh." : "Cleared. Back to live data.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (json) {
    return (
      <JsonEditor
        title={`Override for ${leg.train?.number}`}
        value={saved ?? {}}
        onSave={async (v) => {
          await save("overrides", leg.id, v && Object.keys(v as object).length ? v : null);
          await onSaved();
        }}
        onClose={() => setJson(false)}
      />
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <T v="caption" color="muted">
        Leave a box empty to use the live data (shown in grey). Filled boxes win until you clear them.
      </T>
      <Input label="Boarding platform" value={platform} onChangeText={setPlatform} placeholder={fetched?.platform ?? "e.g. 5"} />
      <Input label="Arrival platform" value={arrivalPlatform} onChangeText={setArrivalPlatform} placeholder={fetched?.arrivalPlatform ?? "e.g. 1"} />
      <Input label="Delay at arrival (minutes)" value={delay} onChangeText={setDelay} keyboardType="numeric" placeholder={fetched?.delayMin !== undefined ? String(fetched.delayMin) : "0"} />
      <Input label="Expected departure" value={depart} onChangeText={setDepart} autoCapitalize="none" placeholder={fetched?.expectedDepart ?? leg.depart} />
      <Input label="Expected arrival" value={arrive} onChangeText={setArrive} autoCapitalize="none" placeholder={fetched?.expectedArrive ?? leg.arrive} />
      <Input label="Coach order (engine first)" value={coaches} onChangeText={setCoaches} autoCapitalize="characters" placeholder={fetched?.coachPosition ?? "L SLR GS S1 S2 B1 A1"} />
      <View style={{ gap: 6 }}>
        <T v="label" color="muted">
          Chart prepared
        </T>
        <Chips options={TRI} value={chart} onChange={setChart} />
      </View>
      <View style={{ gap: 6 }}>
        <T v="label" color="muted">
          Train cancelled
        </T>
        <Chips options={TRI} value={cancelled} onChange={setCancelled} />
      </View>
      {(leg.passengers ?? []).map((p) => (
        <Input
          key={p.person}
          label={`${firstName(p.person)}'s status`}
          value={pax[p.person] ?? ""}
          onChangeText={(v) => setPax((x) => ({ ...x, [p.person]: v }))}
          autoCapitalize="characters"
          placeholder={fetched?.passengers?.find((x) => x.person === p.person)?.current ?? p.current ?? "CNF/B2/34/LB"}
        />
      ))}
      <Button label="Save override" icon="content-save-outline" loading={busy} onPress={() => void submit(build())} />
      {saved && <Button label="Clear override" icon="close-circle-outline" kind="danger" disabled={busy} onPress={() => void submit(null)} />}
      <Button label="Edit as JSON" icon="code-braces" kind="ghost" onPress={() => setJson(true)} />
      {!!note && (
        <T v="caption" color="muted" center>
          {note}
        </T>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- jobs */

const JOBS = [
  { id: "pnr-sync", label: "PNR tracker (waitlisted tickets)" },
  { id: "live-status", label: "Live running status" },
  { id: "schedules", label: "Train timetables" },
  { id: "weather", label: "Weather" },
  { id: "watches", label: "Extra PNRs and waitlist routes" },
] as const;

type TickResult = { ok: boolean; results?: { job: string; ok: boolean; message: string }[]; error?: string };

function JobsCard({ onRan }: { onRan: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<Record<string, string>>({});
  async function run(id: string) {
    setBusy(id);
    try {
      const r = await api<TickResult>(`/api/jobs/tick?force=${id}`, { method: "POST" });
      const mine = r.results?.filter((x) => x.job === id) ?? [];
      setOut((o) => ({ ...o, [id]: mine.length ? mine.map((x) => `${x.ok ? "OK" : "Failed"}: ${x.message}`).join("\n") : r.error ?? "Nothing to do right now." }));
      await onRan();
    } catch (e) {
      setOut((o) => ({ ...o, [id]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(null);
    }
  }
  return (
    <Section title="Background jobs">
      <Card style={{ gap: 14 }}>
        {JOBS.map((j) => (
          <View key={j.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <T v="label" style={{ flex: 1 }}>
                {j.label}
              </T>
              <Button label="Run now" kind="secondary" loading={busy === j.id} disabled={!!busy && busy !== j.id} onPress={() => void run(j.id)} style={{ minHeight: 40 }} />
            </View>
            {!!out[j.id] && (
              <T v="caption" color="muted">
                {out[j.id]}
              </T>
            )}
          </View>
        ))}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------- app_state */

/** Every saved value (weather, schedules, ticket choice, watches...) as editable JSON. */
function StateCard({ rows, onSaved }: { rows: StateRow[] | null; onSaved: () => Promise<void> }) {
  const now = useNow();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const row = rows?.find((r) => r.key === open);
  return (
    <Section title="All saved values">
      {row || (adding && newKey.trim()) ? (
        <JsonEditor
          title={row?.key ?? newKey.trim()}
          value={row?.value ?? {}}
          onSave={async (v) => {
            await save("app_state", row?.key ?? newKey.trim(), v);
            await onSaved();
          }}
          onClose={() => {
            setOpen(null);
            setAdding(false);
            setNewKey("");
          }}
        />
      ) : (
        <Card style={{ gap: 4 }}>
          {!rows && <T v="caption">Loading</T>}
          {rows?.map((r) => (
            <LinkRow key={r.key} icon="code-json" label={r.key} sub={`Updated ${ago(Date.parse(r.updated_at), now)}`} onPress={() => setOpen(r.key)} />
          ))}
          {adding ? (
            <Input label="New key" value={newKey} onChangeText={setNewKey} autoCapitalize="none" placeholder="e.g. note" />
          ) : (
            <Button label="Add a value" icon="plus" kind="ghost" onPress={() => setAdding(true)} />
          )}
        </Card>
      )}
    </Section>
  );
}

/** Edit one JSON value. Save checks it parses; Delete removes it (asks first). */
function JsonEditor({ title, value, onSave, onClose }: { title: string; value: unknown; onSave: (v: unknown) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function run(v: unknown) {
    setBusy(true);
    setNote("");
    try {
      await onSave(v);
      onClose();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={{ gap: 12 }}>
      <T v="heading">{title}</T>
      <Input mono multiline value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} style={{ minHeight: 220 }} />
      <Button
        label="Save"
        icon="content-save-outline"
        loading={busy}
        onPress={() => {
          try {
            void run(JSON.parse(text));
          } catch (e) {
            setNote(`Not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
          }
        }}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Back" kind="secondary" style={{ flex: 1 }} disabled={busy} onPress={onClose} />
        <Button
          label="Delete"
          kind="danger"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={async () => {
            if (await confirm(`Delete ${title}?`, "It's removed for every phone.", "Delete")) void run(null);
          }}
        />
      </View>
      {!!note && (
        <T v="caption" color="bad">
          {note}
        </T>
      )}
    </Card>
  );
}
