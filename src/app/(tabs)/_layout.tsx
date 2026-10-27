import { Tabs } from "expo-router/js-tabs";
import { useEffect } from "react";
import { useAuth } from "@/core/auth";
import { useNow } from "@/core/data";
import { shownTabs } from "@/core/tabs";
import { tr, useLang } from "@/i18n";
import { keepSendingWhileOpen, sharingState } from "@/features/location";
import { FloatingTabBar, type TabSpec } from "@/ui/tab-bar";
import { useTheme } from "@/ui/theme";

const SPECS: Record<string, TabSpec> = {
  index: { label: "Home", icon: "home-variant-outline", activeIcon: "home-variant" },
  train: { label: "Train", icon: "train", activeIcon: "train" },
  ticket: { label: "Ticket", icon: "ticket-outline", activeIcon: "ticket" },
  food: { label: "Food", icon: "silverware-fork-knife", activeIcon: "silverware-fork-knife" },
  plan: { label: "Plan", icon: "map-legend", activeIcon: "map-legend" },
  location: { label: "Location", icon: "map-marker-outline", activeIcon: "map-marker" },
  money: { label: "Money", icon: "wallet-outline", activeIcon: "wallet" },
  more: { label: "More", icon: "dots-grid", activeIcon: "dots-grid" },
};

export default function TabsLayout() {
  const c = useTheme();
  const { lang } = useLang();
  const now = useNow();
  const role = useAuth().session?.role ?? "parent";

  useEffect(() => {
    if (role !== "team") return;
    // Already allowed earlier: send now and every 30 min while open (the background task covers the rest).
    void sharingState().then((s) => s !== "off" && keepSendingWhileOpen());
  }, [role]);

  // The pantry car list only while we are around the journey (see core/tabs).
  const shown = shownTabs(role, now);
  const specs = Object.fromEntries(shown.map((k) => [k, { ...SPECS[k], label: tr(SPECS[k].label, lang) }]));
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }} tabBar={(props) => <FloatingTabBar {...props} specs={specs} />}>
      {Object.keys(SPECS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: tr(SPECS[name].label, lang), href: shown.includes(name) ? undefined : null }} />
      ))}
    </Tabs>
  );
}
