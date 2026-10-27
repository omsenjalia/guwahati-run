import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TEAM, TRIP, type PersonId } from "@/data/trip";
import { saveSession, signIn, type Role, type Session } from "@/core/auth";
import { startSharing } from "@/features/location";
import { LangPicker } from "@/i18n/picker";
import { personIndex } from "@/features/trip";
import { Avatar, Button, Icon, type IconName } from "@/ui/kit";
import { T } from "@/ui/text";
import { font, radius, useTheme } from "@/ui/theme";
import { dayMonth } from "@/lib/time";

type Step = "language" | "role" | "person" | "password" | "location";

/** Sign in: language -> attendee or parent -> who -> password -> (attendees) location sharing. */
export default function Onboarding() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("language");
  const [role, setRole] = useState<Role>("team");
  const [who, setWho] = useState<PersonId | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Session | null>(null);

  const back = () => {
    setError("");
    setStep(step === "password" ? "person" : step === "person" ? "role" : "language");
  };

  async function submit() {
    if (!who || !password.trim()) return;
    setBusy(true);
    setError("");
    try {
      const s = await signIn(role, who, password);
      if (s.role === "team") {
        // Saved but not active yet, so we can ask for location on this screen first.
        await saveSession(s, false);
        setPending(s);
        setStep("location");
      } else {
        await saveSession(s);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function finish(share: boolean) {
    if (!pending) return;
    setBusy(true);
    if (share) await startSharing().catch(() => "off");
    await saveSession(pending);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 36 }]}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="train-variant" size={30} color="#0E1A3A" />
          </View>
          <T v="display" color="#FFFFFF">
            {TRIP.name}
          </T>
          <T v="body" color="rgba(255,255,255,0.78)">
            Anand to IIT Guwahati and back · {dayMonth(TRIP.start)} to {dayMonth(TRIP.end)}
          </T>
          <RouteDots />
        </LinearGradient>

        <View style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 24 }]}>
          {step !== "language" && step !== "role" && step !== "location" && (
            <Pressable onPress={back} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
              <Icon name="arrow-left" size={18} color={c.muted} />
              <T v="label" color="muted">
                Back
              </T>
            </Pressable>
          )}

          {step === "language" && (
            <>
              <T v="title">Choose your language</T>
              <T v="body" color="muted">
                Everything in the app will be in this language. You can change it later in Settings.
              </T>
              <View style={{ gap: 12, marginTop: 6 }}>
                <LangPicker label={false} />
              </View>
              <Button label="Continue" icon="arrow-right" onPress={() => setStep("role")} />
            </>
          )}

          {step === "role" && (
            <>
              <T v="title">Welcome</T>
              <T v="body" color="muted">
                Who’s using this phone?
              </T>
              <Choice
                icon="bag-personal"
                title="I'm on the trip"
                body="For Om, Om, Heet and Sujal: tickets, coach, plan and bills."
                onPress={() => {
                  setRole("team");
                  setStep("person");
                }}
              />
              <Choice
                icon="account-heart"
                title="I'm a parent"
                body="Follow the train live, see where they are and what's been spent."
                onPress={() => {
                  setRole("parent");
                  setStep("person");
                }}
              />
            </>
          )}

          {step === "person" && (
            <>
              <T v="title">{role === "team" ? "Who are you?" : "Whose parent are you?"}</T>
              <View style={{ gap: 10 }}>
                {TEAM.map((p, i) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setWho(p.id);
                      setPassword("");
                      setStep("password");
                    }}
                    style={({ pressed }) => [styles.person, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Avatar name={p.name} index={i} />
                    <T v="heading" style={{ flex: 1 }}>
                      {p.name}
                    </T>
                    <Icon name="chevron-right" color={c.faint} />
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === "password" && who && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={TEAM[personIndex(who)].name} index={personIndex(who)} size={48} />
                <View style={{ flex: 1 }}>
                  <T v="title">{role === "team" ? `Hi ${TEAM[personIndex(who)].name.split(" ")[0]}` : "Parent sign-in"}</T>
                  <T v="label" color="muted">
                    {role === "team" ? "Enter your password" : `Following ${TEAM[personIndex(who)].name}. Enter the parent passcode.`}
                  </T>
                </View>
              </View>
              <View style={[styles.input, { backgroundColor: c.surface, borderColor: error ? c.bad : c.border }]}>
                <Icon name="lock-outline" color={c.muted} />
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError("");
                  }}
                  placeholder={role === "team" ? "Password" : "Parent passcode"}
                  placeholderTextColor={c.faint}
                  secureTextEntry={!show}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  style={[styles.inputText, { color: c.text }]}
                  accessibilityLabel={role === "team" ? "Password" : "Parent passcode"}
                />
                <Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? "Hide password" : "Show password"}>
                  <Icon name={show ? "eye-off-outline" : "eye-outline"} color={c.muted} />
                </Pressable>
              </View>
              {!!error && (
                <T v="label" color="bad">
                  {error}
                </T>
              )}
              <Button label="Continue" icon="arrow-right" onPress={() => void submit()} loading={busy} disabled={!password.trim()} />
            </>
          )}

          {step === "location" && (
            <>
              <View style={[styles.bigIcon, { backgroundColor: c.primarySoft }]}>
                <MaterialCommunityIcons name="map-marker-radius" size={34} color={c.primary} />
              </View>
              <T v="title">Share your location</T>
              <T v="body" color="muted">
                Parents see where the team is on the Location tab, so nobody has to keep texting updates.
              </T>
              <View style={{ gap: 12, marginVertical: 6 }}>
                <Point icon="clock-outline" text="Sent every 30 minutes, even when the app is closed." />
                <Point icon="shield-account-outline" text="Only the trip parents and the team can see it." />
                <Point icon="account-group-outline" text="If your location is off, a friend's phone is used instead." />
              </View>
              <T v="caption" color="faint">
                On the next screen, pick “Allow all the time” so it works with the app closed.
              </T>
              <Button label="Allow location" icon="crosshairs-gps" onPress={() => void finish(true)} loading={busy} />
              <Button label="Not now" kind="ghost" onPress={() => void finish(false)} disabled={busy} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={26} color={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="heading">{title}</T>
        <T v="label" color="muted" style={{ fontFamily: font.medium }}>
          {body}
        </T>
      </View>
      <Icon name="chevron-right" color={c.faint} />
    </Pressable>
  );
}

function Point({ icon, text }: { icon: IconName; text: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
      <T v="body" style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

/** Anand · Delhi · Guwahati as a little rail line. */
function RouteDots() {
  const stops = ["Anand", "Delhi", "Guwahati"];
  return (
    <View style={{ marginTop: 22, gap: 6 }}>
      <View style={styles.route}>
        {stops.map((s, i) => (
          <View key={s} style={{ flexDirection: "row", alignItems: "center", flex: i < stops.length - 1 ? 1 : 0 }}>
            <View style={[styles.dot, i === stops.length - 1 && { backgroundColor: "#F3A04B", borderColor: "#F3A04B" }]} />
            {i < stops.length - 1 && <View style={styles.rail} />}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {stops.map((s) => (
          <T key={s} v="caption" color="rgba(255,255,255,0.85)">
            {s}
          </T>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 56, gap: 8 },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F3A04B", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  route: { flexDirection: "row", alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "transparent" },
  rail: { flex: 1, height: 2, marginHorizontal: 6, backgroundColor: "rgba(255,255,255,0.35)" },
  sheet: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 26, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  choice: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  choiceIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  person: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 54 },
  inputText: { flex: 1, fontFamily: font.semibold, fontSize: 16, height: "100%" },
  bigIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
