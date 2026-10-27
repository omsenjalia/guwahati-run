import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ALTERNATE_TRAINS, DEADLINES, IRCTC_BOOK_URL, IRCTC_PNR_URL, TEAM, type Berth, type Leg, type PersonId } from "@/data/trip";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { refresh, useFeed, useNow } from "@/core/data";
import { db, useRows } from "@/core/db";
import { useLoad } from "@/core/use-load";
import { Countdown, Hero, LegPicker } from "@/features/bits";
import { WlGraph } from "@/features/wl-graph";
import { coachKind, coachList, firstName, focusLeg, isSeated, myStatus, personIndex, statusTone, trainLegs, tripHalf } from "@/features/trip";
import { useAllTrains } from "@/core/dev-prefs";
import { isDeveloper } from "@/lib/auth";
import type { LiveState, PassengerLive } from "@/lib/live-types";
import { ago, dayMonth, hhmm } from "@/lib/time";
import { chartTime, legBerths, legPassengers, legSituation, parseStatus, personBerth } from "@/lib/trip-engine";
import { Avatar, avatarColor, Button, Card, InfoRow, Pill, Section } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, radius, useTheme } from "@/ui/theme";

/**
 * The attendee's ticket. While they're waitlisted it shows the PNR status
 * and chart time; once they're RAC or confirmed it switches to where to
 * stand: coach position on the platform, coach, berth and platform.
 */
export default function TicketScreen() {
  const { session } = useAuth();
  const live = useFeed().live;
  const now = useNow();
  const me = session!.person;
  const allTrains = useAllTrains() && isDeveloper(session);
  const legs = allTrains ? trainLegs() : tripHalf(trainLegs(), now);
  const [picked, setPicked] = useState<string | null>(null);
  const leg = legs.find((l) => l.id === picked) ?? focusLeg(legs, live, now);
  const status = myStatus(leg, live, me);
  const seated = isSeated(status.kind);

  return (
    <Screen title={seated ? "Your coach" : "PNR status"} subtitle={`${leg.train?.number} ${leg.train?.name}`}>
      <LegPicker legs={legs} value={leg} onChange={setPicked} />
      {seated ? <CoachView leg={leg} live={live} me={me} /> : <PnrView leg={leg} live={live} me={me} now={now} />}
    </Screen>
  );
}

/* ---------------------------------------------------------------- PNR */

function PnrView({ leg, live, me, now }: { leg: Leg; live: LiveState; me: PersonId; now: number }) {
  const l = live.legs[leg.id];
  const s = myStatus(leg, live, me);
  const situation = legSituation(leg, live);
  const chartAt = chartTime(leg.depart);
  const charted = !!l?.chartPrepared;
  return (
    <>
      <Hero>
        <Pill label={charted ? "Chart prepared" : "Waiting for the chart"} tone="accent" solid icon={charted ? "file-check-outline" : "timer-sand"} />
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T v="caption" color="rgba(255,255,255,0.7)">
              You
            </T>
            <T v="display" color="#FFFFFF" num>
              {s.label}
            </T>
            {s.booked && (
              <T v="label" color="rgba(255,255,255,0.75)">
                Booked {s.booked}
              </T>
            )}
          </View>
          {s.confirmChance !== undefined && (
            <View style={styles.chance}>
              <T v="title" color="#FFFFFF" num>
                {s.confirmChance}%
              </T>
              <T v="caption" color="rgba(255,255,255,0.75)">
                chance
              </T>
            </View>
          )}
        </View>
        {!charted && chartAt > now && (
          <View style={{ marginTop: 6 }}>
            <T v="caption" color="rgba(255,255,255,0.7)">
              Chart around {dayMonth(chartAt)} {hhmm(chartAt)}
            </T>
            <Countdown to={chartAt} light />
          </View>
        )}
      </Hero>

      <Card style={{ gap: 6 }}>
        <T v="heading">{situation.title}</T>
        {!!situation.advice && (
          <T v="body" color="muted">
            {situation.advice}
          </T>
        )}
      </Card>

      <Section title={`PNR ${leg.pnr ?? ""}`}>
        <Card style={{ gap: 14 }}>
          {legPassengers(leg, live).map((p) => {
            const ps = parseStatus(p.current);
            const i = personIndex(p.person);
            return (
              <View key={p.person} style={styles.paxRow}>
                <Avatar name={TEAM[i].name} index={i} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontFamily: p.person === me ? font.heavy : font.semibold }}>
                    {TEAM[i].name}
                    {p.person === me ? " (you)" : ""}
                  </T>
                  <T v="caption" color="muted">
                    Booked {p.booked}
                    {p.confirmChance !== undefined ? ` · ${p.confirmChance}% chance` : ""}
                  </T>
                </View>
                <Pill label={ps.label} tone={statusTone(ps.kind)} />
              </View>
            );
          })}
          <T v="caption" color="faint">
            {l?.pnrUpdatedAt ? `Checked ${ago(l.pnrUpdatedAt, now)}${l.stale ? " (last known)" : ""}` : "Status as last checked by hand"}
          </T>
        </Card>
      </Section>
      {leg.pnr && <PnrHistory key={`h-${leg.id}`} legId={leg.id} />}
      {leg.pnr && <CheckNow key={leg.id} leg={leg} />}
      <Button label="Check on IRCTC" icon="open-in-new" kind="secondary" onPress={() => void Linking.openURL(IRCTC_PNR_URL)} />
      {leg.id === "L2" && <PlanB />}
    </>
  );
}

/** Asks the server to fetch this PNR now (at most every 2 minutes per ticket), then reloads. */
function CheckNow({ leg }: { leg: Leg }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function check() {
    setBusy(true);
    setNote("");
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/pnr/refresh", { method: "POST", body: JSON.stringify({ legId: leg.id }) });
      await refresh();
      setNote(r.ok ? "Updated just now." : `The ticket site didn't answer: ${r.message}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 6 }}>
      <Button label="Check PNR now" icon="refresh" loading={busy} onPress={() => void check()} />
      {!!note && (
        <T v="caption" color="muted" center>
          {note}
        </T>
      )}
    </View>
  );
}

type HistoryRow = { fetched_at: string; passengers: PassengerLive[] };

/** Highest waitlist number on the ticket at each status change (0 once nobody is waitlisted). */
function PnrHistory({ legId }: { legId: string }) {
  const { rows } = useRows<HistoryRow>(
    "pnr_history",
    () => db.from("pnr_history").select("fetched_at, passengers").eq("leg_id", legId).order("fetched_at", { ascending: true }).limit(500),
    `pnr-history-${legId}`,
  );
  if (!rows || rows.length < 2) return null;
  const worst = (r: HistoryRow) => Math.max(0, ...r.passengers.map((p) => parseStatus(p.current)).map((s) => (s.kind === "WL" ? (s.number ?? 0) : 0)));
  return (
    <Card>
      <WlGraph points={rows.map((r) => ({ t: Date.parse(r.fetched_at), wl: worst(r) }))} />
    </Card>
  );
}

type Alt = { number: string; name: string; from: string; to: string; depart?: string; arrive?: string; classes: { travelClass: string; status: string; confirmChance?: number }[]; error?: string };

/** Other Delhi to Guwahati trains on 29 Oct, with seats right now. */
function Alternatives() {
  const { data, error, reload } = useLoad(() => api<{ fetchedAt: number; trains: Alt[] }>("/api/alternatives"));
  return (
    <View style={{ gap: 10 }}>
      {!data && !error && <T v="caption">Checking seats</T>}
      {data?.trains.map((t) => (
        <View key={t.number} style={{ gap: 2 }}>
          <T v="label">
            {t.number} {t.name}
            {t.depart ? ` · ${hhmm(t.depart)}` : ""}
          </T>
          <T v="caption" color="muted">
            {t.from} to {t.to}
            {t.arrive ? `, arrives ${dayMonth(t.arrive)} ${hhmm(t.arrive)}` : ""}
          </T>
          <T v="caption" color={t.classes.length ? "text" : "warn"}>
            {t.classes.length ? t.classes.map((c) => `${c.travelClass} ${c.status}${c.confirmChance !== undefined ? ` (${c.confirmChance}%)` : ""}`).join(" · ") : t.error}
          </T>
        </View>
      ))}
      {!!error && (
        <T v="caption" color="bad">
          Couldn&apos;t load alternatives: {error}
        </T>
      )}
      <Button label="Refresh seats" icon="refresh" kind="secondary" onPress={() => void reload()} />
      {data && (
        <T v="caption" color="faint">
          Seats as of {hhmm(data.fetchedAt)}. Flights only as a last resort.
        </T>
      )}
    </View>
  );
}

/** If the Avadh Assam Express doesn't clear: the Tatkal decision and other trains that day. */
function PlanB() {
  const d = DEADLINES.filter((x) => x.leg === "L2");
  const [showAlt, setShowAlt] = useState(false);
  return (
    <Section title="Plan B">
      <Card style={{ gap: 14 }}>
        {d.map((x) => (
          <InfoRow key={x.id} icon="calendar-alert" tone="warn" label={`${dayMonth(x.at)} ${hhmm(x.at)} · ${x.title}`} value={<T v="caption" color="muted">{x.action}</T>} />
        ))}
        <InfoRow
          icon="train-variant"
          label={`Other trains on ${dayMonth(ALTERNATE_TRAINS.date)}`}
          value={ALTERNATE_TRAINS.trains.map((t) => `${t.number} ${t.name} (${t.fromName} to ${t.toName})`).join("\n")}
        />
        {showAlt ? <Alternatives /> : <Button label="Live seats on other trains" icon="seat-passenger" kind="secondary" onPress={() => setShowAlt(true)} />}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="IRCTC" icon="train" kind="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(IRCTC_BOOK_URL)} />
          <Button label="Flights" icon="airplane" kind="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(ALTERNATE_TRAINS.flightsUrl)} />
        </View>
      </Card>
    </Section>
  );
}

/* -------------------------------------------------------------- coach */

function CoachView({ leg, live, me }: { leg: Leg; live: LiveState; me: PersonId }) {
  const c = useTheme();
  const l = live.legs[leg.id];
  const s = myStatus(leg, live, me);
  const berth = personBerth(leg, live, me);
  const coaches = coachList(l?.coachPosition);
  const team = legBerths(leg, live);
  const myCoach = berth?.coach ?? s.coach;
  const pos = myCoach ? coaches.indexOf(myCoach) : -1;
  const situation = legSituation(leg, live);

  return (
    <>
      <Hero>
        <Pill label={s.kind === "RAC" ? "RAC: you can board" : "Confirmed"} tone="accent" solid icon="check-decagram" />
        <View style={styles.berthRow}>
          <BigStat label="Coach" value={myCoach ?? "TBA"} />
          <BigStat label="Berth" value={berth ? String(berth.berth) : s.kind === "RAC" ? s.label : "TBA"} />
          <BigStat label="Platform" value={l?.platform ?? "TBA"} />
        </View>
        {berth && (
          <T v="label" color="rgba(255,255,255,0.8)">
            {berth.type} berth{pos >= 0 ? ` · coach ${pos + 1} from the engine` : ""}
          </T>
        )}
      </Hero>

      <Section title="Coach position">
        <Card style={{ gap: 12 }}>
          {coaches.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {coaches.map((code, i) => (
                  <CoachBox key={`${code}-${i}`} code={code} index={i} mine={code === myCoach} team={team.filter((b) => b.coach === code)} />
                ))}
              </ScrollView>
              <View style={styles.legend}>
                <MaterialCommunityIcons name="arrow-left" size={14} color={c.muted} />
                <T v="caption" color="muted">
                  Engine end. Stand near your coach number on the platform board.
                </T>
              </View>
            </>
          ) : (
            <InfoRow icon="train-car" label="Coach order" value="Shows up here once the PNR check returns it, usually by chart time." />
          )}
        </Card>
      </Section>

      {berth && <BayDiagram berth={berth} />}

      <Section title="Team seats">
        <Card style={{ gap: 12 }}>
          {legPassengers(leg, live).map((p) => {
            const b = team.find((x) => x.person === p.person);
            const i = personIndex(p.person);
            return (
              <View key={p.person} style={styles.paxRow}>
                <Avatar name={TEAM[i].name} index={i} size={34} />
                <T v="label" style={{ flex: 1 }}>
                  {firstName(p.person)}
                  {p.person === me ? " (you)" : ""}
                </T>
                <Pill label={b ? `${b.coach} / ${b.berth} ${b.type}` : parseStatus(p.current).label} tone={statusTone(parseStatus(p.current).kind)} />
              </View>
            );
          })}
          {!!situation.advice && (
            <T v="caption" color="muted">
              {situation.advice}
            </T>
          )}
        </Card>
      </Section>
    </>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="caption" color="rgba(255,255,255,0.7)">
        {label}
      </T>
      <T v="title" color="#FFFFFF" num numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
    </View>
  );
}

function CoachBox({ code, index, mine, team }: { code: string; index: number; mine: boolean; team: Berth[] }) {
  const c = useTheme();
  const kind = coachKind(code);
  const bg = mine ? c.accent : kind === "engine" ? c.text : kind === "ac" ? c.primarySoft : c.surface2;
  const fg = mine ? "#FFFFFF" : kind === "engine" ? c.bg : kind === "ac" ? c.primary : c.text;
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={[styles.coach, { backgroundColor: bg }, kind === "engine" && { borderTopLeftRadius: 18, borderBottomLeftRadius: 6 }]}>
        {kind === "engine" ? (
          <MaterialCommunityIcons name="train" size={18} color={fg} />
        ) : (
          <T v="label" color={fg} style={{ fontFamily: font.heavy, fontSize: 12 }}>
            {code}
          </T>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 2, height: 8 }}>
        {team.map((b) => (
          <View key={b.person} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: avatarColor(personIndex(b.person)) }} />
        ))}
      </View>
      <T v="caption" color="faint" num style={{ fontSize: 10 }}>
        {index + 1}
      </T>
    </View>
  );
}

/** One bay of the coach (8 berths: 1-6 main, 7 side lower, 8 side upper) with your berth lit up. */
function BayDiagram({ berth }: { berth: Berth }) {
  const c = useTheme();
  const size = 8;
  const bay = Math.ceil(berth.berth / size);
  const first = (bay - 1) * size + 1;
  const n = (k: number) => first + k;
  const main = [
    [n(2), n(5)],
    [n(1), n(4)],
    [n(0), n(3)],
  ];
  const side = [n(7), n(6)];
  const names = ["Upper", "Middle", "Lower"];
  const cell = (num: number, label: string) => {
    const on = num === berth.berth;
    return (
      <View key={num} style={[styles.berth, { backgroundColor: on ? c.accent : c.surface2, borderColor: on ? c.accent : c.border }]}>
        <T v="label" num color={on ? "#FFFFFF" : "text"} style={{ fontFamily: font.heavy }}>
          {num}
        </T>
        <T v="caption" color={on ? "#FFFFFF" : "faint"} style={{ fontSize: 10 }}>
          {label}
        </T>
      </View>
    );
  };
  return (
    <Section title={`Bay ${bay} in ${berth.coach}`}>
      <Card style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 2, gap: 6 }}>
          {main.map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 }}>
              {row.map((num) => cell(num, names[r]))}
            </View>
          ))}
        </View>
        <View style={[styles.aisle, { borderColor: c.border }]} />
        <View style={{ flex: 1, gap: 6, justifyContent: "flex-end" }}>
          {side.map((num, i) => cell(num, ["Side up", "Side low"][i]))}
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  chance: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  paxRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  berthRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  coach: { width: 52, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  berth: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  aisle: { width: 0, borderLeftWidth: 1, borderStyle: "dashed" },
});
