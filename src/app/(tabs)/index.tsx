import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { EVENT, PLACES, TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { refresh, useFeed, useNow } from "@/core/data";
import { db, ensureDb } from "@/core/db";
import { Countdown, Hero, TrainCard } from "@/features/bits";
import { sendNow, sharingState, startSharing, useShareStatus, type ShareState } from "@/features/location";
import { firstName, focusLeg, personIndex, trainLegs } from "@/features/trip";
import type { Weather } from "@/lib/live-types";
import { ROUTE_BACK, ROUTE_OUT } from "@/lib/phases";
import { ago, duration, hhmm, ms, weekdayDate } from "@/lib/time";
import { buildSteps, computeNow, connectionStates, tripHealth, type NowState } from "@/lib/trip-engine";
import { describeWeather } from "@/lib/weather";
import { Avatar, Button, Card, IconButton, InfoRow, Pill, Section } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { useTheme } from "@/ui/theme";

export default function Home() {
  const { session } = useAuth();
  const feed = useFeed();
  const live = feed.live;
  const now = useNow();
  const me = session!.person;
  const isTeam = session!.role === "team";

  const steps = buildSteps(live);
  const state = computeNow(steps, now);
  const legs = trainLegs(live);
  const next = focusLeg(legs, live, now);
  const health = tripHealth(live, now);
  const conns = connectionStates(live).filter((x) => x.outboundDepart > now);

  return (
    <Screen
      title={isTeam ? `Hi ${firstName(me)}` : `${firstName(me)}'s trip`}
      subtitle={weekdayDate(now)}
      right={<IconButton icon="cog-outline" label="Settings" onPress={() => router.push("/settings")} />}
    >
      <StatusHero now={now} />

      <Section title={state.phase === "post-trip" ? "Last train" : "Next train"}>
        <TrainCard leg={next} live={live} me={me} />
      </Section>

      {isTeam && <CheckinCard place={checkpointLabel(state)} />}

      {isTeam ? <ShareCard /> : <WhereCard />}

      {conns.length > 0 && (
        <Section title="Connections">
          <Card style={{ gap: 14 }}>
            {conns.map((x) => (
              <InfoRow
                key={x.id}
                icon={x.health === "green" ? "check-circle-outline" : "alert-circle-outline"}
                tone={x.health === "green" ? "good" : x.health === "amber" ? "warn" : "bad"}
                label={x.label}
                value={`${x.bufferMin >= 0 ? duration(x.bufferMin * 60_000) : "No"} spare between trains`}
              />
            ))}
            <T v="caption" color="faint">
              {health.overall === "green" ? "Everything on track." : "Watching closely. Plan B shows up in the app if needed."}
            </T>
          </Card>
        </Section>
      )}

      <WeatherCard placeId={state.focus?.to ?? "IITG"} />

      {isTeam && (
        <Section title="Emergency">
          <View style={styles.sos}>
            {USEFUL_NUMBERS.filter((n) => ["112", "139"].includes(n.number)).map((n) => (
              <Card key={n.number} style={{ flex: 1, gap: 6 }} onPress={() => void Linking.openURL(`tel:${n.number}`)}>
                <MaterialCommunityIcons name={n.number === "112" ? "alarm-light-outline" : "phone-in-talk-outline"} size={22} color={n.number === "112" ? "#C2362F" : "#2446C7"} />
                <T v="heading" num>
                  {n.number}
                </T>
                <T v="caption" color="muted" numberOfLines={2}>
                  {n.label}
                </T>
              </Card>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

/** Where the trip is right now: countdown before, current step during, done after. */
function StatusHero({ now }: { now: number }) {
  const live = useFeed().live;
  const steps = buildSteps(live);
  const s = computeNow(steps, now);
  const back = now >= ms(EVENT.end);
  // Stations are evenly spaced, so each train fills its own gap by time.
  const ids = back ? ["L3", "L4"] : ["L0", "L1", "L2"];
  const progress =
    ids.reduce((sum, id) => {
      const t = steps.find((x) => x.id === id);
      return sum + (t ? Math.min(1, Math.max(0, (now - t.start) / (t.end - t.start))) : 0);
    }, 0) / ids.length;
  const route = back ? ROUTE_BACK : ROUTE_OUT;

  return (
    <Hero>
      <Pill
        label={s.phase === "pre-trip" ? "Trip starts in" : s.phase === "post-trip" ? "Trip complete" : s.focusMode === "active" ? "Right now" : "Up next"}
        tone="accent"
        solid
      />
      {s.countdownTo && s.countdownTo > now ? (
        <View style={{ gap: 2 }}>
          <Countdown to={s.countdownTo} light />
          <T v="label" color="rgba(255,255,255,0.75)">
            {s.countdownLabel} · {hhmm(s.countdownTo)}
          </T>
        </View>
      ) : (
        <T v="title" color="#FFFFFF">
          {s.phase === "post-trip" ? "Welcome home" : s.focus?.title}
        </T>
      )}
      {s.focus && s.phase !== "post-trip" && !!s.countdownTo && s.countdownTo > now && (
        <T v="heading" color="#FFFFFF" style={{ marginTop: 4 }}>
          {s.focus.title}
        </T>
      )}
      <T v="body" color="rgba(255,255,255,0.82)">
        {s.instruction}
      </T>

      <View style={styles.route}>
        <View style={styles.routeLine} />
        <View style={[styles.routeFill, { width: `${progress * 100}%` }]} />
        <View style={styles.routeStops}>
          {route.map((id, i) => (
            <View key={id} style={[styles.routeDot, progress >= i / (route.length - 1) - 0.001 && styles.routeDotOn]} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {route.map((id) => (
          <T key={id} v="caption" color="rgba(255,255,255,0.8)">
            {PLACES[id].short}
          </T>
        ))}
      </View>
    </Hero>
  );
}

/** Where we should be right now, as a check-in label. */
function checkpointLabel(state: NowState): string {
  const s = state.focus;
  if (state.phase === "post-trip" || !s) return "Home";
  if (state.phase === "pre-trip") return s.from ? PLACES[s.from].name : "Home";
  const active = state.focusMode === "active";
  if (s.kind === "train") return active ? `On ${s.leg?.train?.name ?? "the train"}` : PLACES[s.from!].name;
  if (s.kind === "transfer") return active ? `On the way to ${PLACES[s.to!].short}` : PLACES[s.from!].name;
  if (s.kind === "event") return "Hackathon venue, IIT Guwahati";
  return s.place ? PLACES[s.place].name : "On the way";
}

/** One tap "I'm here" at each key point, and whether all four of us are together. */
function CheckinCard({ place }: { place: string }) {
  const { session } = useAuth();
  const feed = useFeed();
  const now = useNow();
  const me = session!.person;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fresh = (id: (typeof TEAM)[number]["id"]) => {
    const c = feed.checkins[id];
    return !!c && c.place === place && now - Date.parse(c.created_at) < 3 * 3600_000;
  };
  const here = TEAM.filter((p) => fresh(p.id));
  const iAmIn = here.some((p) => p.id === me);

  async function checkIn() {
    setBusy(true);
    setError("");
    try {
      let lat: number | null = null;
      let lon: number | null = null;
      if ((await Location.getForegroundPermissionsAsync()).granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
        lat = pos?.coords.latitude ?? null;
        lon = pos?.coords.longitude ?? null;
      }
      await ensureDb();
      const { error } = await db.from("checkins").insert({ person: me, place, lat, lon });
      if (error) throw new Error(error.message);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Check-in">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T v="label" style={{ flex: 1 }}>
            {place}
          </T>
          <Pill label={here.length === TEAM.length ? "All 4 together" : `${here.length} of 4 here`} tone={here.length === TEAM.length ? "good" : here.length ? "warn" : "neutral"} />
        </View>
        <Button label={iAmIn ? "You're checked in" : "I'm here"} icon={iAmIn ? "check-circle" : "map-marker-check"} loading={busy} disabled={iAmIn} onPress={() => void checkIn()} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {TEAM.map((p) => {
            const c = feed.checkins[p.id];
            return <Pill key={p.id} label={`${p.short} · ${fresh(p.id) ? "here" : c ? ago(Date.parse(c.created_at), now) : "not yet"}`} tone={fresh(p.id) ? "good" : "neutral"} />;
          })}
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

/** Attendee: is my phone sharing location? */
function ShareCard() {
  const c = useTheme();
  const status = useShareStatus();
  const now = useNow();
  const [state, setState] = useState<ShareState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void sharingState().then(setState);
  }, []);
  const on = state === "on" || state === "foreground-only";
  return (
    <Section title="Location sharing">
      <Card style={{ gap: 12 }}>
        <InfoRow
          icon={on ? "map-marker-check-outline" : "map-marker-off-outline"}
          tone={state === "on" ? "good" : on ? "warn" : "bad"}
          label={state === "on" ? "On, every 30 minutes" : state === "foreground-only" ? "Only while the app is open" : "Off"}
          value={
            status.lastSentAt
              ? `Last sent ${ago(status.lastSentAt, now)}`
              : on
                ? "Parents see where you are"
                : "Parents will see a friend's location instead"
          }
        />
        {state !== "on" && state !== null && (
          <T v="caption" color="muted">
            {state === "foreground-only"
              ? 'For sharing with the app closed, allow location "All the time" in Settings.'
              : "Turn it on so parents can see the team without texting."}
          </T>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {state !== "on" && (
            <Button
              label="Turn on"
              icon="crosshairs-gps"
              style={{ flex: 1 }}
              loading={busy}
              onPress={async () => {
                setBusy(true);
                const s = await startSharing().catch(() => "off" as const);
                if (s === "foreground-only" && state === "foreground-only") void Linking.openSettings();
                setState(s);
                setBusy(false);
              }}
            />
          )}
          {on && <Button label="Share now" icon="send-outline" kind="secondary" style={{ flex: 1 }} onPress={() => void sendNow()} />}
        </View>
        {status.error && (
          <T v="caption" color={c.bad}>
            Last try failed: {status.error}
          </T>
        )}
      </Card>
    </Section>
  );
}

/** Parent: where is everyone? */
function WhereCard() {
  const { session } = useAuth();
  const feed = useFeed();
  const now = useNow();
  const child = session!.person;
  const loc = feed.locations[child];
  return (
    <Section title="Where they are">
      <Card onPress={() => router.navigate("/location")} style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={TEAM[personIndex(child)].name} index={personIndex(child)} size={44} />
          <View style={{ flex: 1 }}>
            <T v="heading">{TEAM[personIndex(child)].name}</T>
            <T v="label" color="muted">
              {loc
                ? loc.via === child
                  ? `Location shared ${ago(loc.at, now)}`
                  : `With ${firstName(loc.via)}, ${ago(loc.at, now)} (their phone)`
                : "No location yet"}
            </T>
          </View>
          <MaterialCommunityIcons name="map-search-outline" size={24} color="#2446C7" />
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {TEAM.filter((p) => p.id !== child).map((p) => {
            const l = feed.locations[p.id];
            return <Pill key={p.id} label={`${firstName(p.id)} · ${l ? ago(l.at, now) : "none"}`} tone={l && now - l.at < 45 * 60_000 ? "good" : "neutral"} />;
          })}
        </View>
      </Card>
    </Section>
  );
}

function WeatherCard({ placeId }: { placeId: keyof typeof PLACES }) {
  const c = useTheme();
  const weather = useFeed().live.state.weather as Record<string, Weather> | undefined;
  const w = weather?.[placeId] ?? weather?.IITG;
  if (!w) return null;
  const rainy = w.code >= 51;
  return (
    <Section title={`Weather · ${PLACES[w.placeId as keyof typeof PLACES]?.city ?? ""}`}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <MaterialCommunityIcons name={rainy ? "weather-pouring" : w.code <= 1 ? "weather-sunny" : "weather-partly-cloudy"} size={40} color={rainy ? c.primary : c.accent} />
        <View style={{ flex: 1 }}>
          <T v="title" num>
            {Math.round(w.tempC)}°
          </T>
          <T v="label" color="muted">
            {describeWeather(w.code)} · {Math.round(w.todayMin)}° to {Math.round(w.todayMax)}°
          </T>
        </View>
        <Pill label={`${w.rainChance}% rain`} tone={w.rainChance >= 50 ? "primary" : "neutral"} icon="water-outline" />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  sos: { flexDirection: "row", gap: 12 },
  route: { height: 14, justifyContent: "center", marginTop: 14 },
  routeLine: { position: "absolute", left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)" },
  routeFill: { position: "absolute", left: 0, height: 3, borderRadius: 2, backgroundColor: "#F3A04B" },
  routeStops: { flexDirection: "row", justifyContent: "space-between" },
  routeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)", backgroundColor: "#1B2A63" },
  routeDotOn: { backgroundColor: "#F3A04B", borderColor: "#F3A04B" },
});
