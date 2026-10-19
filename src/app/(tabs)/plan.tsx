import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { PLACES } from "@/data/trip";
import { useFeed, useNow } from "@/core/data";
import { delayText } from "@/features/trip";
import { duration, hhmm, istDateKey, weekdayDate } from "@/lib/time";
import { planTransfers, type TransferPlan } from "@/lib/transfer-planner";
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

/** The trip one day at a time (today first), with live-adjusted times. */
export default function Plan() {
  const c = useTheme();
  const live = useFeed().live;
  const now = useNow();
  const [minor, setMinor] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const steps = buildSteps(live).filter((s) => minor || !s.minor);
  const transfers = planTransfers(live).filter((t) => t.reachBy > now);
  const days = new Map<string, Step[]>();
  for (const s of steps) days.set(istDateKey(s.start), [...(days.get(istDateKey(s.start)) ?? []), s]);
  const keys = [...days.keys()];
  const todayKey = istDateKey(now);
  // Before the trip: day 1; after it: the last day.
  const key = picked && days.has(picked) ? picked : days.has(todayKey) ? todayKey : todayKey < keys[0] ? keys[0] : keys[keys.length - 1];
  const list = days.get(key) ?? [];
  const dayTransfers = transfers.filter((t) => istDateKey(t.start) === key);

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
      <View style={styles.days}>
        {keys.map((k, i) => {
          const on = k === key;
          const [wd, date] = weekdayDate(days.get(k)![0].start).split(", ");
          return (
            <Pressable
              key={k}
              onPress={() => setPicked(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Day ${i + 1}, ${wd} ${date}`}
              style={[styles.day, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : k === todayKey ? c.accent : c.border }]}
            >
              <T v="caption" color={on ? c.onPrimary : "faint"}>
                {wd}
              </T>
              <T v="label" num color={on ? c.onPrimary : "text"} style={{ fontFamily: font.bold }}>
                {date.split(" ")[0]}
              </T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
        <T v="heading" style={{ flex: 1 }}>
          Day {keys.indexOf(key) + 1} · {weekdayDate(list[0]?.start ?? now)}
        </T>
        {key === todayKey && <Pill label="Today" tone="primary" />}
      </View>

      {dayTransfers.map((t) => (
        <TransferCard key={t.legId} plan={t} now={now} />
      ))}

      <Card padded={false} style={{ paddingVertical: 6 }}>
        {list.map((s, i) => (
          <StepRow key={s.id} step={s} now={now} last={i === list.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}

/** Metro or cab for one transfer, recalculated from the live arrival time. */
function TransferCard({ plan, now }: { plan: TransferPlan; now: number }) {
  const late = plan.leaveBy !== undefined && now > plan.leaveBy;
  const tone: Tone = late || plan.health === "red" ? "bad" : plan.health === "amber" ? "warn" : "good";
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons name={plan.mode === "metro" ? "subway-variant" : "taxi"} size={20} color="#2446C7" />
        <T v="heading" style={{ flex: 1 }}>
          {plan.mode === "metro" ? "Take the metro" : "Take a cab"}
        </T>
        <Pill label={late ? "Switch to cab" : tone === "good" ? "On track" : tone === "warn" ? "Tight" : "At risk"} tone={tone} />
      </View>
      {plan.lines.length > 0 && (
        <T v="label" color="muted">
          {plan.lines.map((l) => l.name).join(" then ")}
        </T>
      )}
      {plan.mode === "metro" && (
        <T v="caption" color="muted">
          {plan.route}
          {plan.interchange ? `. Change at ${plan.interchange}.` : ""}
        </T>
      )}
      <T v="label" num>
        {plan.leaveBy !== undefined ? "Leave by" : "Start"} {hhmm(plan.leaveBy ?? plan.start)} · {plan.minutes} min · ~₹{plan.costTotal} for 4
      </T>
      <T v="caption" color="faint">
        {plan.reason}
      </T>
    </Card>
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
        {!step.minor && (!!sub || step.end - step.start >= 30 * 60_000) && (
          <T v="caption" color="muted" numberOfLines={2}>
            {[sub, step.end - step.start >= 30 * 60_000 && `${step.approx ? "about " : ""}${duration(step.end - step.start)}`].filter(Boolean).join(" · ")}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: "row", gap: 6 },
  day: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 1 },
  row: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 10, gap: 6, minHeight: 64 },
  time: { width: 50, alignItems: "flex-end", paddingTop: 6 },
  icon: { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: "center", justifyContent: "center" },
  iconSmall: { width: 24, height: 24, borderRadius: 8, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
});
