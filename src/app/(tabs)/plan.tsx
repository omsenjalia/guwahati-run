import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { PLACES } from "@/data/trip";
import { useFeed, useNow } from "@/core/data";
import { delayText } from "@/features/trip";
import { duration, hhmm, istDateKey, weekdayDate } from "@/lib/time";
import { buildSteps, type Step, type StepKind } from "@/lib/trip-engine";
import { Card, Pill, type IconName } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, radius, toneColors, useTheme, type Tone } from "@/ui/theme";

const KIND: Record<StepKind, { icon: IconName; tone: Tone }> = {
  train: { icon: "train", tone: "primary" },
  transfer: { icon: "transit-transfer", tone: "accent" },
  event: { icon: "laptop", tone: "good" },
  stay: { icon: "bed-outline", tone: "neutral" },
  explore: { icon: "compass-outline", tone: "accent" },
  pickup: { icon: "home-import-outline", tone: "good" },
  meal: { icon: "silverware-fork-knife", tone: "neutral" },
  sleep: { icon: "weather-night", tone: "neutral" },
};

/** The whole trip, day by day, with live-adjusted times. */
export default function Plan() {
  const live = useFeed().live;
  const now = useNow();
  const [minor, setMinor] = useState(false);
  const steps = buildSteps(live).filter((s) => minor || !s.minor);
  const days = new Map<string, Step[]>();
  for (const s of steps) days.set(istDateKey(s.start), [...(days.get(istDateKey(s.start)) ?? []), s]);

  return (
    <Screen
      title="Trip plan"
      subtitle="Times update live with delays"
      right={
        <Pressable onPress={() => setMinor(!minor)} accessibilityRole="switch" accessibilityState={{ checked: minor }}>
          <Pill label={minor ? "Meals & sleep on" : "Meals & sleep"} tone={minor ? "primary" : "neutral"} icon="silverware-fork-knife" />
        </Pressable>
      }
    >
      {[...days].map(([key, list]) => {
        const today = key === istDateKey(now);
        return (
          <View key={key} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
              <T v="overline" color={today ? "primary" : "faint"}>
                {weekdayDate(list[0].start)}
              </T>
              {today && <Pill label="Today" tone="primary" />}
            </View>
            <Card padded={false} style={{ paddingVertical: 6 }}>
              {list.map((s, i) => (
                <StepRow key={s.id} step={s} now={now} last={i === list.length - 1} />
              ))}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

function StepRow({ step, now, last }: { step: Step; now: number; last: boolean }) {
  const c = useTheme();
  const k = KIND[step.kind];
  const { fg, bg } = toneColors(c, k.tone);
  const done = now >= step.end;
  const active = now >= step.start && now < step.end;
  const shiftMin = Math.round((step.start - step.plannedStart) / 60_000);
  const sub =
    step.kind === "train"
      ? `${PLACES[step.from!].short} → ${PLACES[step.to!].short} · arrive ${hhmm(step.end)}`
      : step.kind === "transfer"
        ? step.leg?.modeHint
        : step.block?.notes?.[0] ?? (step.place ? PLACES[step.place].name : undefined);
  return (
    <View style={[styles.row, step.minor && { minHeight: 44 }, done && { opacity: 0.55 }]}>
      <View style={styles.time}>
        <T v="label" num style={{ fontFamily: font.bold }}>
          {hhmm(step.start)}
        </T>
        {shiftMin > 2 && (
          <T v="caption" num color="bad" style={{ textDecorationLine: "line-through" }}>
            {hhmm(step.plannedStart)}
          </T>
        )}
      </View>
      <View style={{ alignItems: "center", width: 36 }}>
        <View style={[styles.icon, { backgroundColor: active ? fg : bg }, step.minor && styles.iconSmall]}>
          <MaterialCommunityIcons name={done ? "check" : k.icon} size={step.minor ? 13 : 17} color={active ? c.surface : fg} />
        </View>
        {!last && <View style={[styles.line, { backgroundColor: c.border }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: 14, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <T v={step.minor ? "label" : "heading"} color={step.minor ? "muted" : "text"} style={{ flexShrink: 1 }}>
            {step.title}
          </T>
          {active && <Pill label="Now" tone="accent" solid />}
          {shiftMin > 2 && step.kind === "train" && <Pill label={delayText(shiftMin)} tone="bad" />}
        </View>
        {!step.minor && !!sub && (
          <T v="caption" color="muted">
            {sub}
          </T>
        )}
        {!step.minor && step.end - step.start >= 30 * 60_000 && (
          <T v="caption" color="faint">
            {step.approx ? "About " : ""}
            {duration(step.end - step.start)}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 10, gap: 6, minHeight: 64 },
  time: { width: 50, alignItems: "flex-end", paddingTop: 6 },
  icon: { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: "center", justifyContent: "center" },
  iconSmall: { width: 24, height: 24, borderRadius: 8, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
});
