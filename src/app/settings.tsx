import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USEFUL_NUMBERS } from "@/data/trip";
import { signOut, useAuth } from "@/core/auth";
import { API_URL } from "@/core/config";
import { clearFeed, useFeed, useNow } from "@/core/data";
import { sharingState, startSharing, useShareStatus, type ShareState } from "@/features/location";
import { person, personIndex } from "@/features/trip";
import { LangPicker } from "@/i18n/picker";
import { isDeveloper } from "@/lib/auth";
import { ago } from "@/lib/time";
import { Avatar, Button, Card, IconButton, InfoRow, LinkRow, Section } from "@/ui/kit";
import { T } from "@/ui/text";
import { useTheme } from "@/ui/theme";

export default function Settings() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const feed = useFeed();
  const now = useNow();
  const share = useShareStatus();
  const [state, setState] = useState<ShareState | null>(null);
  useEffect(() => {
    void sharingState().then(setState);
  }, []);
  if (!session) return null;
  const p = person(session.person);
  const beat = feed.live.state.heartbeat as { at?: number; failing?: string[] } | undefined;
  const healthy = !!beat?.at && now - beat.at < 20 * 60_000 && !beat.failing?.length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.head}>
        <T v="title" style={{ flex: 1 }}>
          Settings
        </T>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={p.name} index={personIndex(p.id)} size={52} />
        <View style={{ flex: 1 }}>
          <T v="heading">{session.role === "team" ? p.name : `Parent of ${p.name}`}</T>
          <T v="label" color="muted">
            {session.role === "team" ? "On the trip" : "Following the trip"}
          </T>
        </View>
      </Card>

      <Section title="Language">
        <Card style={{ gap: 10 }}>
          <T v="caption" color="muted">
            Everything in the app, in the language you pick. Applies on this phone.
          </T>
          <LangPicker label={false} />
        </Card>
      </Section>

      {session.role === "team" && (
        <Section title="Location sharing">
          <Card style={{ gap: 12 }}>
            <InfoRow
              icon="crosshairs-gps"
              tone={state === "on" ? "good" : state === "off" ? "bad" : "warn"}
              label="Status"
              value={state === "on" ? "On, every 30 min (also when closed)" : state === "foreground-only" ? "Only while the app is open" : "Off"}
            />
            {share.lastSentAt && <InfoRow icon="send-check-outline" label="Last sent" value={ago(share.lastSentAt, now)} />}
            {state !== "on" && (
              <Button
                label={state === "foreground-only" ? "Open phone settings" : "Turn on"}
                icon="cog-outline"
                kind="secondary"
                onPress={async () => {
                  if (state === "foreground-only") return void Linking.openSettings();
                  setState(await startSharing().catch(() => "off" as const));
                }}
              />
            )}
          </Card>
        </Section>
      )}

      <Section title="Help lines">
        <Card style={{ gap: 12 }}>
          {USEFUL_NUMBERS.map((n) => (
            <Button key={n.number} label={`${n.label} · ${n.number}`} icon="phone-outline" kind="secondary" onPress={() => void Linking.openURL(`tel:${n.number}`)} />
          ))}
        </Card>
      </Section>

      <Section title="System">
        <Card style={{ gap: 12 }}>
          <InfoRow
            icon={healthy ? "heart-pulse" : "alert-outline"}
            tone={healthy ? "good" : "warn"}
            label="Background tracking"
            value={beat?.at ? `${healthy ? "Running" : "Needs a look"} · last run ${ago(beat.at, now)}` : "No data yet"}
          />
          <InfoRow icon="server-outline" label="Server" value={API_URL.replace(/^https?:\/\//, "")} />
          <InfoRow icon="information-outline" label="App version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        </Card>
      </Section>

      {isDeveloper(session) && (
        <Section title="Developer">
          <Card>
            <LinkRow icon="wrench-outline" tone="accent" label="Developer options" sub="Live data, jobs, trip plan" onPress={() => router.push("/tools/dev")} />
          </Card>
        </Section>
      )}

      <Button
        label="Sign out"
        icon="logout"
        kind="danger"
        onPress={async () => {
          clearFeed();
          await signOut();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 18, maxWidth: 720, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "center" },
});
