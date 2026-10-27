import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEGS, PLACES, type Leg } from "@/data/trip";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { clockOffset, useFeed, useNow } from "@/core/data";
import { useLoad } from "@/core/use-load";
import { LegPicker, TrainCard } from "@/features/bits";
import { delayTone, focusLeg, lastPassed, stopsFor, trainLegs, tripHalf, type Stop } from "@/features/trip";
import { useAllTrains } from "@/core/dev-prefs";
import { isDeveloper } from "@/lib/auth";
import type { Delays, LegLive } from "@/lib/live-types";
import { buildTrack, trainPosition, type Track, type TrackPoint } from "@/lib/live-track";
import { ago, dayMonth, hhmm, ms } from "@/lib/time";
import { Button, Card, Chips, IconButton, Pill } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, radius, toneColors, useTheme } from "@/ui/theme";
import { TrainMap } from "@/ui/train-map";

type TestRun = { startDate: string; live: Pick<LegLive, "stations" | "departed" | "terminated" | "delayMin" | "liveUpdatedAt">; source: string };

/**
 * Live running status, NTES style: yet to depart, at a station or between
 * two, every station with scheduled and actual or expected times (the ones
 * it runs through too), and a live 3D map with the train moving. ?test=<leg>
 * (developer options) plays the latest real run of that train instead.
 */
export default function TrainScreen() {
  const { session } = useAuth();
  const { test } = useLocalSearchParams<{ test?: string }>();
  const feed = useFeed();
  const live = feed.live;
  const now = useNow(5_000);
  const allTrains = useAllTrains() && isDeveloper(session);
  const legs = allTrains ? trainLegs() : tripHalf(trainLegs(), now);
  const [picked, setPicked] = useState<string | null>(null);
  const testLeg = test ? LEGS.find((l) => l.id === test) : undefined;
  const leg = testLeg ?? legs.find((l) => l.id === picked) ?? focusLeg(legs, live, now);
  const run = useLoad(async () => (testLeg ? api<TestRun>(`/api/dev/live-test?leg=${testLeg.id}`) : null), testLeg?.id ?? "");
  const l = testLeg ? run.data?.live : live.legs[leg.id];
  const track = buildTrack(leg, l, now, !!testLeg);

  return (
    <Screen
      title={testLeg ? "Live tracking test" : "Train status"}
      subtitle={(track ? track.live : !!l?.stations?.length) && l?.liveUpdatedAt ? `Live · updated ${ago(l.liveUpdatedAt, now)}` : "Timetable"}
      right={testLeg ? <IconButton icon="close" label="End test" onPress={() => router.replace("/train")} /> : undefined}
    >
      {testLeg ? (
        <Card style={{ gap: 8, borderColor: "#E07B1F", borderWidth: 1 }}>
          <Pill label="Developer test" tone="accent" solid icon="flask-outline" />
          <T v="body">
            {run.data
              ? `The latest real run of ${leg.train?.number} ${leg.train?.name}, which left its origin on ${dayMonth(`${run.data.startDate.slice(0, 10)}T12:00:00+05:30`)}. Not our trip: nothing is saved.`
              : run.error || `Fetching the latest run of ${leg.train?.number}...`}
          </T>
          {run.data && <Button label="Fetch again" icon="refresh" kind="secondary" onPress={() => void run.reload()} />}
        </Card>
      ) : (
        <LegPicker legs={legs} value={leg} onChange={setPicked} />
      )}

      {!testLeg && <TrainCard leg={leg} live={live} me={session?.person} onPress={() => {}} />}

      {track ? <Tracked leg={leg} track={track} live={l} now={now} mapKey={`${leg.id}-${testLeg ? `test-${run.data?.startDate}` : "live"}`} /> : <Timetable leg={leg} now={now} />}
    </Screen>
  );
}

/* ---------------------------------------------------------------- live */

const VIEWS = [
  { value: "ours", label: "Our journey" },
  { value: "all", label: "Full route" },
  { value: "avg", label: "Avg delay" },
] as const;

function Tracked({ leg, track, live, now, mapKey }: { leg: Leg; track: Track; live?: Pick<LegLive, "liveUpdatedAt" | "stale">; now: number; mapKey: string }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<(typeof VIEWS)[number]["value"]>("ours");
  const [nonStop, setNonStop] = useState(false);
  const [full, setFull] = useState(false);
  const icon = track.state === "yet" ? "clock-outline" : track.state === "done" ? "flag-checkered" : track.state === "at" ? "train" : "access-point";
  const tone = track.state === "between" || track.state === "at" ? c.good : c.muted;
  const running = track.state === "between" || track.state === "at";
  // Same clock as the map's train, so the list moves with it between live updates.
  const here = Math.max(track.points.findLastIndex((p) => p.passed), running ? trainPosition(track, now).index : -1);
  // Our journey, stretched to wherever the train is now (before we board or after we get off).
  const first = view === "ours" ? Math.min(track.from, running ? here : track.from) : 0;
  const last = view === "ours" ? Math.max(track.to, running ? here : track.to) : track.points.length - 1;
  const shown = track.points.slice(first, last + 1).filter((p, i) => nonStop || p.stop || first + i === here);
  const stations = track.points.map((p) => ({ c: p.code, n: p.name, lat: p.lat, lon: p.lon, s: p.stop ? 1 : 0, a: p.arr, d: p.dep, p: p.passed ? 1 : 0 }) as const);
  const map = (
    <TrainMap
      key={mapKey}
      stations={stations as never}
      from={track.from}
      to={track.to}
      offset={clockOffset}
      caption={`${leg.train?.number} · ${track.title}`}
      moving={track.state !== "yet" && track.state !== "done"}
    />
  );

  return (
    <>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name={icon} size={24} color={tone} />
          <T v="heading" style={{ flex: 1 }}>
            {track.title}
          </T>
        </View>
        <T v="body" color="muted">
          {track.detail}
        </T>
        <T v="caption" color="faint">
          {track.live
            ? `Live running status${live?.stale ? " (last known: sources are down)" : ""}.`
            : `Timetable. Live tracking starts 3 hours before departure (${hhmm(ms(leg.depart) - 3 * 3600_000)} on ${dayMonth(leg.depart)}).`}
        </T>
      </Card>

      <View style={[styles.mapBox, { backgroundColor: c.surface2, borderColor: c.border }]}>
        {map}
        <Pressable onPress={() => setFull(true)} accessibilityLabel="Full screen map" style={[styles.expand, { backgroundColor: c.surface }]}>
          <MaterialCommunityIcons name="arrow-expand" size={18} color={c.text} />
        </Pressable>
      </View>
      <View style={styles.legend}>
        <Legend color="#2446C7" label="Stop (flag)" flag />
        <Legend color="#E53935" label="Runs through" />
        <Legend color="#E07B1F" label="Covered" line />
      </View>

      <Chips options={VIEWS} value={view} onChange={setView} />
      {view === "avg" ? (
        <AvgDelay leg={leg} track={track} />
      ) : (
        <>
        <Pressable onPress={() => setNonStop(!nonStop)} accessibilityRole="switch" accessibilityState={{ checked: nonStop }} style={{ alignSelf: "flex-start" }}>
          <Pill label={nonStop ? "Showing stations it runs through" : "Show stations it runs through"} tone={nonStop ? "bad" : "neutral"} icon="map-marker-outline" />
        </Pressable>

        <Card padded={false} style={{ paddingVertical: 8 }}>
          {shown.map((p, i) => {
            const idx = track.points.indexOf(p);
            return (
              <PointRow
                key={`${p.code}-${idx}`}
                p={idx <= here && !p.passed ? { ...p, passed: true } : p}
                first={i === 0}
                last={i === shown.length - 1}
                here={idx === here && running}
                tag={idx === track.from ? "Board" : idx === track.to ? "Get off" : undefined}
                dim={(idx < track.from || idx > track.to) && idx !== here}
                now={now}
                km={idx >= track.from ? p.km - track.points[track.from].km : undefined}
              />
            );
          })}
        </Card>
        </>
      )}

      <Modal visible={full} animationType="slide" onRequestClose={() => setFull(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          {map}
          <View style={{ position: "absolute", top: insets.top + 60, left: 12 }}>
            <IconButton icon="close" label="Close map" onPress={() => setFull(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Our stops with how late the train usually is there, over its last runs. */
function AvgDelay({ leg, track }: { leg: Leg; track: Track }) {
  const c = useTheme();
  const { data, error } = useLoad(() => api<Delays>(`/api/delays?leg=${leg.id}`), leg.id);
  if (!data)
    return (
      <Card>
        <T v="body" color="muted">
          {error || "Checking how late this train has run lately..."}
        </T>
      </Card>
    );
  const by = new Map(data.stations.map((s) => [s.code, s]));
  const stops = track.points.slice(track.from, track.to + 1).filter((p) => p.stop && by.has(p.code));
  return (
    <Card padded={false} style={{ paddingVertical: 4 }}>
      <T v="caption" color="faint" style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
        Over the last {data.runs} runs (from {dayMonth(`${data.dates[data.dates.length - 1]}T12:00:00+05:30`)}). On time = within 5 min.
      </T>
      {stops.map((p, i) => {
        const d = by.get(p.code)!;
        const tone = toneColors(c, delayTone(d.avgMin));
        return (
          <View key={p.code} style={[styles.avgRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" numberOfLines={1} style={{ fontFamily: i === 0 || i === stops.length - 1 ? font.heavy : font.semibold }}>
                {p.name}
              </T>
              <T v="caption" color="faint">
                {p.code} · on time {d.onTimePct}% · worst +{d.maxMin}m
              </T>
            </View>
            <View style={[styles.avgBadge, { backgroundColor: tone.bg }]}>
              <T v="label" num color={tone.fg} style={{ fontFamily: font.bold }}>
                {d.avgMin <= 5 ? "On time" : `+${d.avgMin}m`}
              </T>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function Legend({ color, label, flag, line }: { color: string; label: string; flag?: boolean; line?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: line ? 16 : flag ? 10 : 8, height: line ? 4 : flag ? 8 : 8, borderRadius: flag ? 2 : 4, backgroundColor: color }} />
      <T v="caption" color="muted">
        {label}
      </T>
    </View>
  );
}

/** One station, NTES style: arrival and departure (scheduled, then actual or expected), delay, platform, day and distance. */
/** km = distance from our boarding station (none for stations before it). */
function PointRow({ p, first, last, here, tag, dim, now, km }: { p: TrackPoint; first: boolean; last: boolean; here: boolean; tag?: string; dim?: boolean; now: number; km?: number }) {
  const c = useTheme();
  const lineColor = p.passed ? c.accent : c.border;
  const late = p.delayMin && p.delayMin > 0 ? p.delayMin : 0;
  const tone = toneColors(c, delayTone(late));
  const status = late > 0 ? `delayed by ${late} min` : p.delayMin && p.delayMin < 0 ? `${-p.delayMin} min early` : "on time";
  if (!p.stop) {
    return (
      <View style={[styles.row, { minHeight: 34 }, dim && { opacity: 0.5 }]}>
        <View style={styles.times}>
          {p.dep && (
            <T v="caption" num color="faint">
              ~{hhmm(p.dep)}
            </T>
          )}
        </View>
        <View style={styles.rail}>
          <View style={[styles.railTop, { backgroundColor: first ? "transparent" : lineColor }]} />
          <View style={[styles.passDot, { backgroundColor: "#E53935" }]} />
          <View style={[styles.railBottom, { backgroundColor: last ? "transparent" : lineColor }]} />
          {here && <TrainDot />}
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T v="caption" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {p.name} · {p.code}
          </T>
          {km !== undefined && (
            <T v="caption" color="faint">
              {km} km
            </T>
          )}
        </View>
      </View>
    );
  }
  const time = (sch?: number, act?: number) =>
    sch || act ? (
      <View style={{ alignItems: "flex-end" }}>
        {sch && (
          <T v="caption" num color="faint" style={act && act !== sch ? { textDecorationLine: "line-through" } : undefined}>
            {hhmm(sch)}
          </T>
        )}
        {act && act !== sch && (
          <T v="label" num color={act > (sch ?? act) ? tone.fg : c.good} style={{ fontFamily: font.bold }}>
            {hhmm(act)}
          </T>
        )}
      </View>
    ) : (
      <T v="caption" color="faint">
        {"—"}
      </T>
    );
  return (
    <View style={[styles.row, { minHeight: 70 }, dim && { opacity: 0.5 }]}>
      <View style={[styles.times, { gap: 4 }]}>
        {time(p.schArr, p.arr)}
        {p.schDep && p.schArr && time(p.schDep, p.dep)}
        {!p.schArr && time(p.schDep, p.dep)}
      </View>
      <View style={styles.rail}>
        <View style={[styles.railTop, { backgroundColor: first ? "transparent" : lineColor }]} />
        <View
          style={[
            styles.dot,
            { borderColor: p.passed ? c.accent : c.faint, backgroundColor: p.passed ? c.accent : c.surface },
            tag && { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: c.primary },
          ]}
        />
        <View style={[styles.railBottom, { backgroundColor: last ? "transparent" : lineColor }]} />
        {here && <TrainDot />}
      </View>
      <View style={{ flex: 1, paddingVertical: 10, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <T v="label" style={{ fontFamily: tag ? font.heavy : font.semibold, flexShrink: 1 }} numberOfLines={1}>
            {p.name}
          </T>
          {tag && <Pill label={tag} tone="primary" />}
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <T v="caption" color="faint">
            {p.code}
          </T>
          {km !== undefined && (
            <T v="caption" color="faint">
              {km} km
            </T>
          )}
          {!!p.day && p.day > 1 && (
            <T v="caption" color="faint">
              Day {p.day}
            </T>
          )}
          {p.platform && (
            <T v="caption" color="primary">
              PF {p.platform}
            </T>
          )}
          {p.schArr && p.schDep && (
            <T v="caption" color="faint">
              Halt {Math.round((p.schDep - p.schArr) / 60_000)}m
            </T>
          )}
          {(!!p.delayMin || p.actual) && (
            <T v="caption" color={late > 0 ? tone.fg : "good"} style={{ fontFamily: font.semibold }}>
              {!p.passed && (p.arr ?? 0) > now ? `Likely ${status}` : status[0].toUpperCase() + status.slice(1)}
            </T>
          )}
          {!p.passed && p.arr && p.arr > now && p.arr - now < 3 * 3600_000 && (
            <T v="caption" color="muted">
              in {Math.round((p.arr - now) / 60_000)} min
            </T>
          )}
        </View>
      </View>
    </View>
  );
}

function TrainDot() {
  const c = useTheme();
  return (
    <View style={[styles.trainIcon, { backgroundColor: c.accent }]}>
      <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
    </View>
  );
}

/* ----------------------------------------------- no route data: fallback */

function Timetable({ leg, now }: { leg: Leg; now: number }) {
  const c = useTheme();
  const live = useFeed().live;
  const { stops, from, to } = stopsFor(leg, live, now);
  const passed = lastPassed(stops);
  return (
    <Card padded={false} style={{ paddingVertical: 8 }}>
      {stops.slice(from, to + 1).map((s: Stop, i, arr) => (
        <View key={`${s.code}-${i}`} style={[styles.row, { minHeight: 52 }]}>
          <View style={styles.times}>
            <T v="label" num>
              {s.schArr ?? s.schDep ? hhmm((s.schArr ?? s.schDep)!) : ""}
            </T>
          </View>
          <View style={styles.rail}>
            <View style={[styles.railTop, { backgroundColor: i === 0 ? "transparent" : c.border }]} />
            <View style={[styles.dot, { borderColor: i + from <= passed ? c.primary : c.faint }]} />
            <View style={[styles.railBottom, { backgroundColor: i === arr.length - 1 ? "transparent" : c.border }]} />
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <T v="label">{s.name}</T>
            <T v="caption" color="faint">
              {s.code}
              {s.platform ? ` · PF ${s.platform}` : ""}
            </T>
          </View>
        </View>
      ))}
      <T v="caption" color="faint" center style={{ padding: 8 }}>
        {PLACES[leg.from].short} to {PLACES[leg.to].short}: no map route for this train yet.
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  avgRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  mapBox: { height: 380, borderRadius: radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  expand: { position: "absolute", left: 10, bottom: 24, width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", gap: 14, flexWrap: "wrap", paddingHorizontal: 4, marginTop: -8 },
  row: { flexDirection: "row", alignItems: "stretch", paddingHorizontal: 14 },
  times: { width: 58, alignItems: "flex-end", justifyContent: "center", paddingRight: 10 },
  rail: { width: 26, alignItems: "center" },
  railTop: { width: 3, flex: 1 },
  railBottom: { width: 3, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  passDot: { width: 7, height: 7, borderRadius: 4 },
  trainIcon: { position: "absolute", top: "50%", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: -12 },
});
