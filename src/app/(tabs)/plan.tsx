import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { EXPLORE, STATION_GUIDES } from "@/data/guides";
import {
  EVENT_SCHEDULE,
  PLACES,
  TEAM,
  VENUE_NOTES,
  type PersonId,
} from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed, useNow } from "@/core/data";
import { delayText } from "@/features/trip";
import type { LiveState } from "@/lib/live-types";
import { mapsLink } from "@/lib/links";
import { duration, hhmm, istDateKey, weekdayDate } from "@/lib/time";
import { planTransfers, type TransferPlan } from "@/lib/transfer-planner";
import {
  buildSteps,
  legPassengers,
  personBerth,
  type Step,
  type StepKind,
} from "@/lib/trip-engine";
import { Button, Card, Pill, type IconName } from "@/ui/kit";
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
  const me = useAuth().session?.person;
  const [minor, setMinor] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const steps = buildSteps(live).filter((s) => minor || !s.minor);
  const transfers = planTransfers(live).filter((t) => t.reachBy > now);
  const days = new Map<string, Step[]>();
  for (const s of steps)
    days.set(istDateKey(s.start), [
      ...(days.get(istDateKey(s.start)) ?? []),
      s,
    ]);
  const keys = [...days.keys()];
  const todayKey = istDateKey(now);
  // Before the trip: day 1; after it: the last day.
  const key =
    picked && days.has(picked)
      ? picked
      : days.has(todayKey)
        ? todayKey
        : todayKey < keys[0]
          ? keys[0]
          : keys[keys.length - 1];
  const list = days.get(key) ?? [];
  const dayTransfers = transfers.filter((t) => istDateKey(t.start) === key);

  return (
    <Screen
      title="Trip plan"
      subtitle="Times update live with delays"
      right={
        <Pressable
          onPress={() => setMinor(!minor)}
          accessibilityRole="switch"
          accessibilityState={{ checked: minor }}
        >
          <Pill
            label={minor ? "Meals & sleep on" : "Meals & sleep"}
            tone={minor ? "primary" : "neutral"}
            icon="silverware-fork-knife"
          />
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
              style={[
                styles.day,
                {
                  backgroundColor: on ? c.primary : c.surface,
                  borderColor: on
                    ? c.primary
                    : k === todayKey
                      ? c.accent
                      : c.border,
                },
              ]}
            >
              <T v="caption" color={on ? c.onPrimary : "faint"}>
                {wd}
              </T>
              <T
                v="label"
                num
                color={on ? c.onPrimary : "text"}
                style={{ fontFamily: font.bold }}
              >
                {date.split(" ")[0]}
              </T>
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 4,
        }}
      >
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
          <StepRow
            key={s.id}
            step={s}
            now={now}
            last={i === list.length - 1}
            open={open === s.id}
            onPress={
              s.minor ? undefined : () => setOpen(open === s.id ? null : s.id)
            }
          >
            {open === s.id && (
              <Details step={s} live={live} me={me} now={now} />
            )}
          </StepRow>
        ))}
      </Card>
    </Screen>
  );
}

/** Metro or cab for one transfer, recalculated from the live arrival time. */
function TransferCard({ plan, now }: { plan: TransferPlan; now: number }) {
  const late = plan.leaveBy !== undefined && now > plan.leaveBy;
  const tone: Tone =
    late || plan.health === "red"
      ? "bad"
      : plan.health === "amber"
        ? "warn"
        : "good";
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons
          name={plan.mode === "metro" ? "subway-variant" : "taxi"}
          size={20}
          color="#2446C7"
        />
        <T v="heading" style={{ flex: 1 }}>
          {plan.mode === "metro" ? "Take the metro" : "Take a cab"}
        </T>
        <Pill
          label={
            late
              ? "Switch to cab"
              : tone === "good"
                ? "On track"
                : tone === "warn"
                  ? "Tight"
                  : "At risk"
          }
          tone={tone}
        />
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
        {plan.leaveBy !== undefined ? "Leave by" : "Start"}{" "}
        {hhmm(plan.leaveBy ?? plan.start)} · {plan.minutes} min · ~₹
        {plan.costTotal} for 4
      </T>
      <T v="caption" color="faint">
        {plan.reason}
      </T>
    </Card>
  );
}

/** One step; tap a main one to open its details underneath. */
function StepRow({
  step,
  now,
  last,
  open,
  onPress,
  children,
}: {
  step: Step;
  now: number;
  last: boolean;
  open: boolean;
  onPress?: () => void;
  children?: ReactNode;
}) {
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
        : (step.block?.notes?.[0] ??
          (step.place ? PLACES[step.place].name : undefined));
  return (
    <View
      style={[
        styles.row,
        step.minor && { minHeight: 44 },
        done && !open && { opacity: 0.55 },
      ]}
    >
      <View style={styles.time}>
        <T v="label" num style={{ fontFamily: font.bold }}>
          {hhmm(step.start)}
        </T>
        {shiftMin > 2 && (
          <T
            v="caption"
            num
            color="bad"
            style={{ textDecorationLine: "line-through" }}
          >
            {hhmm(step.plannedStart)}
          </T>
        )}
      </View>
      <View style={{ alignItems: "center", width: 36 }}>
        <View
          style={[
            styles.icon,
            { backgroundColor: active ? fg : bg },
            step.minor && styles.iconSmall,
          ]}
        >
          <MaterialCommunityIcons
            name={done ? "check" : k.icon}
            size={step.minor ? 13 : 17}
            color={active ? c.surface : fg}
          />
        </View>
        {!last && <View style={[styles.line, { backgroundColor: c.border }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: 14, gap: 3 }}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityState={onPress ? { expanded: open } : undefined}
          style={{ flexDirection: "row", gap: 6 }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <T
                v={step.minor ? "label" : "heading"}
                color={step.minor ? "muted" : "text"}
                style={{ flexShrink: 1 }}
              >
                {step.title}
              </T>
              {active && <Pill label="Now" tone="accent" solid />}
              {shiftMin > 2 && step.kind === "train" && (
                <Pill label={delayText(shiftMin)} tone="bad" />
              )}
            </View>
            {!step.minor && (!!sub || step.end - step.start >= 30 * 60_000) && (
              <T v="caption" color="muted" numberOfLines={open ? undefined : 2}>
                {[
                  sub,
                  step.end - step.start >= 30 * 60_000 &&
                    `${step.approx ? "about " : ""}${duration(step.end - step.start)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </T>
            )}
          </View>
          {onPress && (
            <MaterialCommunityIcons
              name={open ? "chevron-up" : "chevron-down"}
              size={20}
              color={c.faint}
              style={{ paddingTop: 4 }}
            />
          )}
        </Pressable>
        {children}
      </View>
    </View>
  );
}

const who = (id: PersonId) => TEAM.find((p) => p.id === id)?.short ?? id;
const CLASS = {
  SL: "Sleeper (SL)",
  "3A": "AC 3-tier (3A)",
  UR: "General, unreserved",
} as const;

type Line = { icon: IconName; text: string; tone?: Tone };

/** Everything we know about one step: train, seats, platforms, live delay, station tips, schedule, notes. */
function Details({
  step,
  live,
  me,
  now,
}: {
  step: Step;
  live: LiveState;
  me?: PersonId;
  now: number;
}) {
  const lines: Line[] = [];
  const add = (
    icon: IconName,
    text: string | false | undefined | null | 0,
    tone?: Tone,
  ) => {
    if (text) lines.push({ icon, text, tone });
  };
  const leg = step.leg;
  let action:
    { label: string; icon: IconName; onPress: () => void } | undefined;

  if (leg?.kind === "train" && leg.train) {
    const l = live.legs[leg.id];
    const from = PLACES[leg.from];
    const to = PLACES[leg.to];
    const late = l?.delayMin ?? 0;
    add(
      "train",
      `${leg.train.number} ${leg.train.name}${leg.travelClass ? ` · ${CLASS[leg.travelClass]}` : ""}`,
    );
    add(
      "clock-start",
      `Leaves ${from.name} (${from.code}) at ${hhmm(step.start)}${l?.platform ? `, platform ${l.platform}` : ""}`,
    );
    add(
      "clock-end",
      `Reaches ${to.name} (${to.code}) at ${hhmm(step.end)}, ${weekdayDate(step.end)}${l?.arrivalPlatform ? `, platform ${l.arrivalPlatform}` : ""}`,
    );
    if (l?.trainCancelled)
      add(
        "alert-octagon",
        "Train cancelled. Check the alternatives on the Ticket tab.",
        "bad",
      );
    else if (
      l?.liveUpdatedAt &&
      now >= step.start - 3 * 3600_000 &&
      now <= step.end
    )
      add(
        "access-point",
        `${late > 0 ? `Running ${delayText(late).toLowerCase()}` : "Running on time"}${l.lastStation ? `, last seen at ${l.lastStation}` : ""}`,
        late > 30 ? "bad" : late > 5 ? "warn" : "good",
      );
    add(
      "information-outline",
      leg.ticketTo &&
        `The ticket is booked to ${leg.ticketTo}; we get off at ${to.short}.`,
    );
    const seat = me ? personBerth(leg, live, me) : undefined;
    add(
      "seat-recline-normal",
      seat &&
        `Your seat: coach ${seat.coach}, berth ${seat.berth} (${seat.type})`,
      "primary",
    );
    const pax = legPassengers(leg, live);
    add(
      "account-group",
      pax.length > 0 &&
        pax.map((p) => `${who(p.person)}: ${p.current}`).join(" · "),
    );
    add(
      "ticket-confirmation-outline",
      leg.pnr && `PNR ${leg.pnr}${l?.chartPrepared ? " · chart prepared" : ""}`,
    );
    const off = STATION_GUIDES.find((g) => g.id === leg.to);
    add("exit-run", off && `Getting off at ${to.short}: ${off.exit}`);
    add(
      "lightbulb-on-outline",
      STATION_GUIDES.find((g) => g.id === leg.from)?.tip,
    );
    action = {
      label: "Live train status",
      icon: "map-marker-path",
      onPress: () => router.push("/train"),
    };
  } else if (leg?.kind === "transfer") {
    const from = PLACES[leg.from];
    const to = PLACES[leg.to];
    add("map-marker-outline", `From ${from.name} to ${to.name}`);
    add("transit-transfer", leg.modeHint);
    add(
      "clock-outline",
      `${step.approx ? "About " : ""}${hhmm(step.start)} to ${hhmm(step.end)}. These times move with the train's real arrival.`,
    );
    action = {
      label: "Directions",
      icon: "directions",
      onPress: () => void Linking.openURL(mapsLink(from, to)),
    };
  } else if (step.block) {
    for (const n of step.block.notes ?? []) add("information-outline", n);
    if (step.kind === "event") {
      for (const e of EVENT_SCHEDULE)
        add(
          "calendar-clock",
          `${hhmm(e.at)} ${e.title}${e.tbc ? " (to be confirmed)" : ""}`,
        );
      for (const [k, v] of Object.entries(VENUE_NOTES))
        add(
          "information-outline",
          v && `${k[0].toUpperCase()}${k.slice(1)}: ${v}`,
        );
    }
    if (step.kind === "explore") {
      for (const e of EXPLORE)
        add(
          "compass-outline",
          `${e.name}: ${e.why} About ${duration(e.stayMin * 60_000)} there, ${e.toKyqMin} min by cab to the station.`,
        );
      action = {
        label: "All guides",
        icon: "book-open-variant",
        onPress: () => router.push("/tools/guides"),
      };
    }
    const at = PLACES[step.block.place];
    add("map-marker-outline", `${at.name}, ${at.city}`);
  }
  if (!lines.length && !action) return null;
  return (
    <View style={{ gap: 6, paddingTop: 8 }}>
      {lines.map((x, i) => (
        <DetailLine key={i} {...x} />
      ))}
      {action && (
        <Button
          label={action.label}
          icon={action.icon}
          kind="secondary"
          onPress={action.onPress}
        />
      )}
    </View>
  );
}

function DetailLine({ icon, text, tone }: Line) {
  const c = useTheme();
  const color = tone ? toneColors(c, tone).fg : undefined;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={color ?? c.faint}
        style={{ marginTop: 2 }}
      />
      <T v="caption" color={color ?? "muted"} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: "row", gap: 6 },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 1,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 6,
    minHeight: 64,
  },
  time: { width: 50, alignItems: "flex-end", paddingTop: 6 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSmall: { width: 24, height: 24, borderRadius: 8, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
});
