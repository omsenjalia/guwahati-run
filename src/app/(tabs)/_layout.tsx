import { Tabs } from "expo-router/js-tabs";
import { useEffect } from "react";
import { useAuth } from "@/core/auth";
import { keepSendingWhileOpen, sharingState } from "@/features/location";
import { FloatingTabBar, type TabSpec } from "@/ui/tab-bar";
import { useTheme } from "@/ui/theme";

const SPECS: Record<string, TabSpec> = {
  index: { label: "Home", icon: "home-variant-outline", activeIcon: "home-variant" },
  train: { label: "Train", icon: "train", activeIcon: "train" },
  ticket: { label: "Ticket", icon: "ticket-outline", activeIcon: "ticket" },
  plan: { label: "Plan", icon: "map-legend", activeIcon: "map-legend" },
  location: { label: "Location", icon: "map-marker-outline", activeIcon: "map-marker" },
  money: { label: "Money", icon: "wallet-outline", activeIcon: "wallet" },
};

/** Parents follow the trip; attendees get their ticket (PNR, then coach) instead of the map. */
const VISIBLE = {
  parent: ["index", "train", "plan", "location", "money"],
  team: ["index", "train", "ticket", "plan", "money"],
};

export default function TabsLayout() {
  const c = useTheme();
  const role = useAuth().session?.role ?? "parent";

  useEffect(() => {
    if (role !== "team") return;
    // Already allowed earlier: send now and every 30 min while open (the background task covers the rest).
    void sharingState().then((s) => s !== "off" && keepSendingWhileOpen());
  }, [role]);

  const specs = Object.fromEntries(VISIBLE[role].map((k) => [k, SPECS[k]]));
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }} tabBar={(props) => <FloatingTabBar {...props} specs={specs} />}>
      {Object.keys(SPECS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: SPECS[name].label, href: VISIBLE[role].includes(name) ? undefined : null }} />
      ))}
    </Tabs>
  );
}
