import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { PLACES, type Leg } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed, useNow } from "@/core/data";
import { LegChip, TrainCard } from "@/features/bits";
import { delayText, delayTone, focusLeg, lastPassed, stopsFor, trainLegs, type Stop } from "@/features/trip";
import { ago, dayMonth, hhmm, ms } from "@/lib/time";
import { Card, Pill } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, radius, toneColors, useTheme } from "@/ui/theme";

/** Live running status, station by station (like NTES). */
export default function TrainScreen() {
  const c = useTheme();
  const { session } = useAuth();
  const live = useFeed().live;
  const now = useNow();
  const legs = trainLegs(live);
  const [picked, setPicked] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const leg = legs.find((l) => l.id === picked) ?? focusLeg(legs, live, now);
  const l = live.legs[leg.id];
  const { stops, from, to, live: isLive } = stopsFor(leg, live, now);
  const shown = full ? stops : stops.slice(from, to + 1);
  const offset = full ? 0 : from;
  const passed = lastPassed(stops);

  return (
    <Screen title="Train status" subtitle={isLive && l?.liveUpdatedAt ? `Live · updated ${ago(l.liveUpdatedAt, now)}` : "Timetable"}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -4 }}>
        {legs.map((x) => (
          <LegChip key={x.id} leg={x} active={x.id === leg.id} onPress={() => setPicked(x.id)} />
        ))}
      </ScrollView>

      <TrainCard leg={leg} live={live} me={session?.person} onPress={() => {}} />

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name={isLive ? "access-point" : "timetable"} size={22} color={isLive ? c.good : c.muted} />
          <View style={{ flex: 1 }}>
            <T v="heading">{statusLine(leg, stops, passed, isLive, now, l?.terminated)}</T>
            <T v="caption" color="muted">
              {isLive
                ? `${delayText(l?.delayMin)}${l?.stale ? " · last known, sources are down" : ""}`
                : `Live tracking starts 3 hours before departure (${hhmm(ms(leg.depart) - 3 * 3600_000)} on ${dayMonth(leg.depart)}).`}
            </T>
          </View>
        </View>
        {leg.backupFor && (
          <Pill label="Backup ticket: used only if the North East Express doesn't clear" tone="warn" icon="lifebuoy" />
        )}
      </Card>

      <View style={[styles.segment, { backgroundColor: c.surface2 }]}>
        {(["Our journey", "Full route"] as const).map((label, i) => {
          const on = full === (i === 1);
          return (
            <Pressable key={label} onPress={() => setFull(i === 1)} style={[styles.segmentItem, on && { backgroundColor: c.surface }]} accessibilityRole="button">
              <T v="label" color={on ? "text" : "muted"}>
                {label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <Card padded={false} style={{ paddingVertical: 8 }}>
        {shown.map((s, i) => (
          <StopRow
            key={`${s.code}-${i}`}
            stop={s}
            first={i === 0}
            last={i === shown.length - 1}
            passed={i + offset <= passed}
            here={i + offset === passed && !(l?.terminated && i + offset === stops.length - 1)}
            between={i + offset === passed && i < shown.length - 1}
            tag={i + offset === from ? "Board" : i + offset === to ? "Get off" : undefined}
            dim={full && (i + offset < from || i + offset > to)}
          />
        ))}
      </Card>
      {!isLive && stops.length <= 2 && (
        <T v="caption" color="faint" center>
          All stops appear once the background job fetches the timetable.
        </T>
      )}
    </Screen>
  );
}

function statusLine(leg: Leg, stops: Stop[], passed: number, isLive: boolean, now: number, terminated?: boolean) {
  if (terminated) return `Reached ${PLACES[leg.to].short}`;
  if (!isLive) return now < ms(leg.depart) ? `Departs ${PLACES[leg.from].short} ${dayMonth(leg.depart)}, ${hhmm(leg.depart)}` : "No live data";
  if (passed < 0) return "Not started yet";
  const next = stops[passed + 1];
  return next ? `Left ${stops[passed].name}, next ${next.name}` : `At ${stops[passed].name}`;
}

function StopRow({
  stop,
  first,
  last,
  passed,
  here,
  between,
  tag,
  dim,
}: {
  stop: Stop;
  first: boolean;
  last: boolean;
  passed: boolean;
  here: boolean;
  between: boolean;
  tag?: string;
  dim?: boolean;
}) {
  const c = useTheme();
  const sch = stop.schArr ?? stop.schDep;
  const exp = stop.expArr ?? stop.expDep;
  const late = stop.delayMin && stop.delayMin > 0 ? stop.delayMin : 0;
  const tone = toneColors(c, delayTone(late));
  const lineColor = passed ? c.primary : c.border;
  return (
    <View style={[styles.stop, dim && { opacity: 0.5 }]}>
      <View style={styles.times}>
        {sch && (
          <T v="label" num style={{ fontFamily: font.bold }}>
            {hhmm(sch)}
          </T>
        )}
        {exp && exp !== sch && (
          <T v="caption" num color={late ? tone.fg : c.good}>
            {hhmm(exp)}
          </T>
        )}
      </View>
      <View style={styles.rail}>
        <View style={[styles.railTop, { backgroundColor: first ? "transparent" : lineColor }]} />
        <View
          style={[
            styles.dot,
            { borderColor: passed ? c.primary : c.faint, backgroundColor: passed ? c.primary : c.surface },
            tag && { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: c.accent },
          ]}
        />
        <View style={[styles.railBottom, { backgroundColor: last ? "transparent" : between ? c.border : lineColor }]} />
        {here && (
          <View style={[styles.trainIcon, { backgroundColor: c.accent }, between ? { top: "62%" } : { top: "30%" }]}>
            <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={{ flex: 1, paddingVertical: 12, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <T v="label" style={{ fontFamily: tag ? font.heavy : font.semibold, flexShrink: 1 }} numberOfLines={1}>
            {stop.name}
          </T>
          {tag && <Pill label={tag} tone="accent" />}
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <T v="caption" color="faint">
            {stop.code}
          </T>
          {stop.platform && (
            <T v="caption" color="primary">
              PF {stop.platform}
            </T>
          )}
          {!!stop.day && stop.day > 1 && (
            <T v="caption" color="faint">
              Day {stop.day}
            </T>
          )}
          {late > 0 && (
            <T v="caption" color={tone.fg}>
              +{late}m
            </T>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12 },
  stop: { flexDirection: "row", alignItems: "stretch", paddingHorizontal: 14, minHeight: 58 },
  times: { width: 54, alignItems: "flex-end", justifyContent: "center", paddingRight: 10 },
  rail: { width: 26, alignItems: "center" },
  railTop: { width: 3, flex: 1 },
  railBottom: { width: 3, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  trainIcon: { position: "absolute", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: -12 },
});
