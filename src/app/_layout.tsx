import "react-native-url-polyfill/auto";
// Shows fatal errors instead of closing the app silently (release builds).
import { describeError } from "@/core/crash";
// Registers the background location and alert tasks before anything else runs.
import "@/features/location";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from "@expo-google-fonts/manrope";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Pressable, ScrollView, Text, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadSession, useAuth } from "@/core/auth";
import { LangProvider, activeLang, tr } from "@/i18n";
import { useFeedSync } from "@/core/data";
import { checkAlerts, startAlerts } from "@/features/alerts";
import { useTheme } from "@/ui/theme";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useTheme();
  const { ready, session } = useAuth();
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  useEffect(() => {
    void loadSession();
  }, []);
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <LangProvider>
      <SafeAreaProvider>
      <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.text, primary: c.primary, border: c.border } }}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {session && <FeedSync />}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="onboarding/index" />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ presentation: "modal" }} />
            <Stack.Screen name="tools" />
            <Stack.Protected guard={session?.role === "team"}>
              <Stack.Screen name="add-bill" options={{ presentation: "modal" }} />
            </Stack.Protected>
          </Stack.Protected>
        </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </LangProvider>
  );
}

/**
 * Any error while drawing the app (this layout included) lands here instead of
 * closing it. Plain components only: the fonts may not have loaded.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const c = useTheme();
  const lang = activeLang();
  // The splash screen may still be covering the app.
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "700" }}>{tr("Something went wrong", lang)}</Text>
      <Text style={{ color: c.muted, fontSize: 15 }}>{tr("Send a screenshot of this to Om.", lang)}</Text>
      <Text selectable style={{ color: c.bad, fontSize: 13, fontFamily: "monospace" }}>
        {describeError(error)}
      </Text>
      <Pressable onPress={() => void retry()} style={{ backgroundColor: c.primary, borderRadius: 12, padding: 14, alignItems: "center" }}>
        <Text style={{ color: c.onPrimary, fontSize: 16, fontWeight: "600" }}>{tr("Try again", lang)}</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Keeps the data feed fresh and alerts registered while signed in (any screen). */
function FeedSync() {
  useFeedSync();
  // Alerts: start the background checks, and check whenever the app comes to the front.
  useEffect(() => {
    void startAlerts();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void checkAlerts());
    return () => sub.remove();
  }, []);
  return null;
}
