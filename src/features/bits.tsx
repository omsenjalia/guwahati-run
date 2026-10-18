import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { PLACES, type Leg, type PersonId } from "@/data/trip";
import { useNow } from "@/core/data";
import type { LiveState } from "@/lib/live-types";
import { countdownParts, dayMonth, duration, hhmm, ms } from "@/lib/time";
import { personBerth } from "@/lib/trip-engine";
import { Card, Pill } from "@/ui/kit";
import { T } from "@/ui/text";
import { font, radius, useTheme } from "@/ui/theme";
import { delayText, delayTone, myStatus, statusTone } from "./trip";

/** Big ticking countdown: "3d 04h 12m" (seconds under an hour). */
export function Countdown({ to, light }: { to: number; light?: boolean }) {
  const now = useNow(1000);
  const p = countdownParts(to - now);
  const parts =
    p.days > 0
      ? [
          [p.days, "d"],
          [p.hours, "h"],
          [p.minutes, "m"],
        ]
      : p.hours > 0
        ? [
            [p.hours, "h"],
            [p.minutes, "m"],
            [p.seconds, "s"],
          ]
        : [
            [p.minutes, "m"],
            [p.seconds, "s"],
          ];
  const color = light ? "#FFFFFF" : undefined;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
      {parts.map(([n, unit], i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "baseline" }}>
          <T v="display" num color={color} style={{ fontSize: 40, lineHeight: 46 }}>
            {i === 0 ? String(n) : String(n).padStart(2, "0")}
          </T>
          <T v="heading" color={light ? "rgba(255,255,255,0.7)" : "muted"}>
            {unit}
          </T>
        </View>
      ))}
    </View>
  );
}

/** Gradient hero card. */
export function Hero({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      {children}
    </LinearGradient>
  );
}

/** Live-adjusted departure and arrival for a ticket. */
export function legTimes(leg: Leg, live: LiveState) {
  const l = live.legs[leg.id];
  return {
    depart: ms(l?.expectedDepart ?? leg.depart),
    arrive: ms(l?.expectedArrive ?? leg.arrive),
    plannedDepart: ms(leg.depart),
    plannedArrive: ms(leg.arrive),
  };
}

/** One train ticket at a glance: route, times, live delay, and (for attendees) their seat. */
export function TrainCard({ leg, live, me, onPress }: { leg: Leg; live: LiveState; me?: PersonId; onPress?: () => void }) {
  const c = useTheme();
  const now = useNow();
  const l = live.legs[leg.id];
  const t = legTimes(leg, live);
  const running = !!l?.departed && !l?.terminated;
  const done = now > t.arrive;
  const status = me ? myStatus(leg, live, me) : null;
  const berth = me ? personBerth(leg, live, me) : undefined;
  return (
    <Card onPress={onPress ?? (() => router.navigate("/train"))} style={{ gap: 14 }}>
      <View style={styles.row}>
        <View style={[styles.trainBadge, { backgroundColor: c.primarySoft }]}>
          <MaterialCommunityIcons name="train" size={18} color={c.primary} />
          <T v="label" color="primary" num>
            {leg.train?.number}
          </T>
        </View>
        <T v="heading" style={{ flex: 1 }} numberOfLines={1}>
          {leg.train?.name}
        </T>
        {l?.trainCancelled ? (
          <Pill label="Cancelled" tone="bad" icon="close-octagon" />
        ) : done ? (
          <Pill label="Arrived" tone="neutral" icon="check" />
        ) : l?.liveUpdatedAt && now >= t.depart - 3 * 3600_000 ? (
          <Pill label={delayText(l.delayMin)} tone={delayTone(l.delayMin)} icon={running ? "circle-medium" : "clock-outline"} />
        ) : (
          <Pill label={dayMonth(t.depart)} tone="neutral" icon="calendar-blank" />
        )}
      </View>

      <View style={styles.row}>
        <Endpoint code={PLACES[leg.from].code!} name={PLACES[leg.from].short} time={t.depart} planned={t.plannedDepart} />
        <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <T v="caption" color="faint">
            {duration(t.arrive - t.depart)}
          </T>
          <View style={styles.track}>
            <View style={[styles.trackLine, { backgroundColor: c.border }]} />
            <View
              style={[
                styles.trackFill,
                { backgroundColor: c.primary, width: `${Math.round(Math.min(1, Math.max(0, (now - t.depart) / (t.arrive - t.depart))) * 100)}%` },
              ]}
            />
          </View>
          <T v="caption" color="faint">
            {leg.travelClass}
            {leg.km ? ` · ${leg.km} km` : ""}
          </T>
        </View>
        <Endpoint code={PLACES[leg.to].code!} name={PLACES[leg.to].short} time={t.arrive} planned={t.plannedArrive} right />
      </View>

      {(l?.platform || status || (running && l?.lastStation)) && (
        <View style={[styles.foot, { borderTopColor: c.border }]}>
          {status &&
            (berth ? (
              <Pill label={`${berth.coach} · ${berth.berth} ${berth.type}`} tone="good" icon="seat-recline-normal" />
            ) : (
              <Pill label={status.label} tone={statusTone(status.kind)} icon="ticket-confirmation-outline" />
            ))}
          {l?.platform && <Pill label={`Platform ${l.platform}`} tone="primary" icon="sign-direction" />}
          {running && l?.lastStation && <Pill label={`Near ${l.lastStation}`} tone="accent" icon="map-marker-path" />}
        </View>
      )}
    </Card>
  );
}

function Endpoint({ code, name, time, planned, right }: { code: string; name: string; time: number; planned: number; right?: boolean }) {
  const late = Math.round((time - planned) / 60_000);
  return (
    <View style={{ alignItems: right ? "flex-end" : "flex-start", minWidth: 78 }}>
      <T v="title" num style={{ fontSize: 22 }}>
        {hhmm(time)}
      </T>
      {late > 2 ? (
        <T v="caption" color="bad" num style={{ textDecorationLine: "line-through" }}>
          {hhmm(planned)}
        </T>
      ) : (
        <T v="caption" color="faint">
          {dayMonth(time)}
        </T>
      )}
      <T v="label" style={{ fontFamily: font.bold }}>
        {code}
      </T>
      <T v="caption" color="muted" numberOfLines={1}>
        {name}
      </T>
    </View>
  );
}

/** A ticket in the horizontal picker. */
export function LegChip({ leg, active, onPress }: { leg: Leg; active: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
    >
      <T v="label" num color={active ? c.onPrimary : "text"} style={{ fontFamily: font.bold }}>
        {leg.train?.number}
      </T>
      <T v="caption" color={active ? c.onPrimary : "muted"}>
        {PLACES[leg.from].code} → {PLACES[leg.to].code} · {dayMonth(leg.depart)}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 1 },
  hero: { borderRadius: radius.xl, padding: 20, gap: 10, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  trainBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  track: { width: "100%", height: 4, justifyContent: "center" },
  trackLine: { position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1 },
  trackFill: { position: "absolute", left: 0, height: 4, borderRadius: 2 },
  foot: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
