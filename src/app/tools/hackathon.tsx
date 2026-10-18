import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";
import { EVENT, EVENT_SCHEDULE, REST_PLAN, TEAM, VENUE_NOTES } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useNow } from "@/core/data";
import { db, ensureDb, useRows } from "@/core/db";
import { Countdown, Hero } from "@/features/bits";
import { Checklist } from "@/features/checklist";
import { hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import { Button, Card, Chips, IconButton, InfoRow, Input, Pill, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, radius, useTheme } from "@/ui/theme";

const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

/** The hackathon: countdown and schedule for everyone; rest rotation, task board, pitch timer and demo checklist for the team. */
export default function Hackathon() {
  const team = useAuth().session?.role === "team";
  const now = useNow(1000);
  const start = ms(EVENT.start);
  const end = ms(EVENT.end);
  const submission = EVENT_SCHEDULE.find((s) => /submission/i.test(s.title));
  const next = EVENT_SCHEDULE.find((s) => ms(s.at) > now);
  const target = now < start ? start : submission && ms(submission.at) > now ? ms(submission.at) : end;

  return (
    <Page title="Hackathon" subtitle={`${EVENT.name}, ${EVENT.venue}`}>
      <Hero>
        <Pill label={now < start ? "Starts in" : now < end ? (target === end ? "Ends in" : "Submission in") : "Finished"} tone="accent" solid />
        {now < end && <Countdown to={target} light />}
        <T v="label" color="rgba(255,255,255,0.8)">
          {stamp(start)} to {stamp(end)}
        </T>
        {next && (
          <T v="heading" color="#FFFFFF">
            Next: {next.title} at {hhmm(next.at)}
            {next.tbc ? " (tbc)" : ""}
          </T>
        )}
      </Hero>

      {team && <RestCard now={now} />}
      {team && <Board />}
      {team && <PitchTimer />}
      {team && <Checklist owner="demo" title="Demo day checklist" />}

      <Section title="Schedule">
        <Card style={{ gap: 10 }}>
          {EVENT_SCHEDULE.map((s) => (
            <View key={s.at + s.title} style={[{ flexDirection: "row", gap: 12 }, ms(s.at) < now && { opacity: 0.45 }]}>
              <T v="label" num style={{ width: 92 }}>
                {weekdayDate(s.at).split(",")[0]} {hhmm(s.at)}
              </T>
              <T v="body" style={{ flex: 1 }}>
                {s.title}
                {s.tbc ? "  (tbc)" : ""}
              </T>
            </View>
          ))}
        </Card>
      </Section>

      {team && (
        <Section title="Venue notes">
          <Card style={{ gap: 12 }}>
            <InfoRow icon="wifi" label="Wi-Fi" value={VENUE_NOTES.wifi} />
            <InfoRow icon="power-plug-outline" label="Power" value={VENUE_NOTES.power} />
            <InfoRow icon="food-outline" label="Food" value={VENUE_NOTES.food} />
            <InfoRow icon="bed-outline" label="Stay" value={VENUE_NOTES.stay} />
            {!!VENUE_NOTES.help && <InfoRow icon="help-circle-outline" label="Help" value={VENUE_NOTES.help} />}
            {TEAM.filter((p) => p.role).map((p) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <T v="label">{p.name}</T>
                <T v="label" color="muted">
                  {p.role}
                </T>
              </View>
            ))}
          </Card>
        </Section>
      )}
    </Page>
  );
}

/* ---------------------------------------------------------------- rest */

function RestCard({ now }: { now: number }) {
  const c = useTheme();
  const me = useAuth().session!.person;
  const current = REST_PLAN.find((s) => now >= ms(s.start) && now < ms(s.end));
  const next = REST_PLAN.find((s) => ms(s.start) > now);
  const mine = REST_PLAN.find((s) => s.resting.includes(me) && ms(s.end) > now);
  if (!current && !next) return null;
  return (
    <Section title="Rest rotation">
      <Card style={{ gap: 10 }}>
        <T v="heading">
          {current ? `Resting now: ${current.resting.map(short).join(" and ")}` : `First rest ${weekdayDate(next!.start).split(",")[0]} ${hhmm(next!.start)}: ${next!.resting.map(short).join(" and ")}`}
        </T>
        {current && (
          <T v="caption" color="muted">
            Until {hhmm(current.end)}. Keep it quiet.
          </T>
        )}
        {mine && <Pill label={mine === current ? `Your turn to sleep. Up at ${hhmm(mine.end)}.` : `Your next rest: ${hhmm(mine.start)} to ${hhmm(mine.end)}`} tone="primary" icon="sleep" />}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {REST_PLAN.map((s) => (
            <View key={s.start} style={[styles.slot, { backgroundColor: c.surface2, borderColor: s === current ? c.primary : "transparent" }]}>
              <T v="label" num>
                {hhmm(s.start)}-{hhmm(s.end)}
              </T>
              <T v="caption" color="muted">
                {s.resting.map(short).join(", ")}
              </T>
            </View>
          ))}
        </View>
      </Card>
    </Section>
  );
}

/* --------------------------------------------------------------- board */

type Status = "todo" | "doing" | "done";
type BoardCard = { id: string; title: string; status: Status; assignee: string | null; sort: number };
const COLUMNS = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
] as const;

/** Hackathon kanban, shared live (board_cards). */
function Board() {
  const c = useTheme();
  const me = useAuth().session!.person;
  const { rows: cards, setRows } = useRows<BoardCard>("board_cards", () => db.from("board_cards").select("id, title, status, assignee, sort").order("sort"));
  const [col, setCol] = useState<Status>("todo");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const shown = cards?.filter((x) => x.status === col) ?? [];

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setError("");
    await ensureDb();
    const { error } = await fn();
    if (error) setError(error.message);
  }
  async function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    const sort = (cards?.reduce((m, x) => Math.max(m, x.sort), 0) ?? 0) + 1;
    await run(() => db.from("board_cards").insert({ title, assignee: me, sort, status: "todo" }));
    setCol("todo");
  }
  function move(card: BoardCard, status: Status) {
    setRows((cur) => cur?.map((x) => (x.id === card.id ? { ...x, status } : x)) ?? cur);
    void run(() => db.from("board_cards").update({ status, updated_at: new Date().toISOString() }).eq("id", card.id));
  }
  function remove(card: BoardCard) {
    setRows((cur) => cur?.filter((x) => x.id !== card.id) ?? cur);
    void run(() => db.from("board_cards").delete().eq("id", card.id));
  }

  return (
    <Section title="Team board">
      <Card style={{ gap: 10 }}>
        <Chips options={COLUMNS.map((x) => ({ ...x, label: `${x.label} ${cards?.filter((y) => y.status === x.value).length ?? 0}` }))} value={col} onChange={setCol} />
        {!cards && <T v="caption">Loading</T>}
        {cards && !shown.length && (
          <T v="caption" color="muted">
            Nothing here.
          </T>
        )}
        {shown.map((card) => {
          const i = COLUMNS.findIndex((x) => x.value === card.status);
          const prev = COLUMNS[i - 1];
          const next = COLUMNS[i + 1];
          return (
            <View key={card.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {prev && (
                <Pressable hitSlop={8} onPress={() => move(card, prev.value)} accessibilityLabel={`Move to ${prev.label}`}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color={c.faint} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <T v="body" color={card.status === "done" ? "muted" : "text"} style={card.status === "done" && { textDecorationLine: "line-through" }}>
                  {card.title}
                </T>
                {card.assignee && (
                  <T v="caption" color="faint">
                    {short(card.assignee)}
                  </T>
                )}
              </View>
              {card.status === "done" ? (
                <Pressable hitSlop={8} onPress={() => remove(card)} accessibilityLabel={`Delete ${card.title}`}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={c.faint} />
                </Pressable>
              ) : (
                next && <Button label={`${next.label} →`} kind="secondary" onPress={() => move(card, next.value)} style={{ minHeight: 38, paddingHorizontal: 12 }} />
              )}
            </View>
          );
        })}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="New task" onSubmitEditing={() => void add()} returnKeyType="done" />
          </View>
          <IconButton icon="plus" label="Add task" onPress={() => void add()} />
        </View>
        {!!error && (
          <T v="caption" color="bad">
            {error}
          </T>
        )}
      </Card>
    </Section>
  );
}

/* --------------------------------------------------------- pitch timer */

function PitchTimer() {
  const c = useTheme();
  const [length, setLength] = useState(180);
  const [left, setLeft] = useState(180);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          Vibration.vibrate([0, 300, 150, 300]);
          return 0;
        }
        if (l === 31) Vibration.vibrate(150);
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const color = left === 0 ? c.bad : left <= 30 ? c.warn : c.text;
  return (
    <Section title="Pitch timer">
      <Card style={{ gap: 12 }}>
        <T v="display" num center color={color} style={{ fontSize: 64, lineHeight: 72, fontFamily: font.heavy }}>
          {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
        </T>
        {left <= 30 && (
          <T v="label" center color={left === 0 ? "bad" : "warn"}>
            {left === 0 ? "Time" : "Wrap up"}
          </T>
        )}
        <Chips
          options={[120, 180, 300].map((s) => ({ value: String(s), label: `${s / 60} min` }))}
          value={String(length)}
          onChange={(v) => {
            setRunning(false);
            setLength(Number(v));
            setLeft(Number(v));
          }}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            label={running ? "Pause" : "Start"}
            icon={running ? "pause" : "play"}
            style={{ flex: 1 }}
            onPress={() => {
              if (left === 0) setLeft(length);
              setRunning((r) => !r);
            }}
          />
          <Button
            label="Reset"
            kind="secondary"
            style={{ flex: 1 }}
            onPress={() => {
              setRunning(false);
              setLeft(length);
            }}
          />
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  slot: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, minWidth: "45%", flexGrow: 1 },
});
