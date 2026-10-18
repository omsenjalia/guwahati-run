import "react-native-url-polyfill/auto";
// Registers the background location and alert tasks before anything else runs.
import "@/features/location";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from "@expo-google-fonts/manrope";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadSession, useAuth } from "@/core/auth";
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
