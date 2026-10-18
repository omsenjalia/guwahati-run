import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconName } from "./kit";
import { T } from "./text";
import { font, radius, useTheme } from "./theme";

export type TabSpec = { label: string; icon: IconName; activeIcon: IconName };

/** Floating pill tab bar. Only routes listed in `specs` get a button. */
export function FloatingTabBar({ state, emitter, navigateToTab, specs }: BottomTabBarProps & { specs: Record<string, TabSpec> }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => specs[r.name]);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: c.tabBar, borderColor: c.border, shadowColor: c.shadow }]}>
        {routes.map((route) => {
          const spec = specs[route.name];
          const focused = state.routes[state.index]?.key === route.key;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={spec.label}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
                const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              style={styles.item}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: c.primarySoft }]}>
                <MaterialCommunityIcons name={focused ? spec.activeIcon : spec.icon} size={22} color={focused ? c.primary : c.muted} />
              </View>
              <T v="caption" color={focused ? c.primary : c.muted} style={{ fontSize: 11, fontFamily: focused ? font.bold : font.semibold }} numberOfLines={1}>
                {spec.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: 12 },
  bar: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 520,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 2 },
  iconWrap: { width: 52, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
