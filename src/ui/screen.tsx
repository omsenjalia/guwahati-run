import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { refresh, useFeed, useNow } from "@/core/data";
import { ago } from "@/lib/time";
import { T } from "./text";
import { TAB_BAR_SPACE, useTheme } from "./theme";

/** A tab screen: big title, optional right-hand action, pull to refresh. */
export function Screen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      refreshControl={
        <RefreshControl refreshing={feed.loading && !!feed.fetchedAt} onRefresh={() => void refresh()} tintColor={c.primary} colors={[c.primary]} />
      }
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T v="title">{title}</T>
          {subtitle && (
            <T v="label" color="muted" style={{ marginTop: 2 }}>
              {subtitle}
            </T>
          )}
        </View>
        {right}
      </View>
      {children}
      <SyncNote />
    </ScrollView>
  );
}

function SyncNote() {
  const feed = useFeed();
  const now = useNow();
  if (!feed.fetchedAt) {
    return feed.error ? (
      <T v="caption" color="bad" center>
        Can’t reach the server: {feed.error}
      </T>
    ) : null;
  }
  return (
    <T v="caption" color="faint" center>
      {feed.error ? `Offline copy from ${ago(feed.fetchedAt, now)}` : `Updated ${ago(feed.fetchedAt, now)}`}
    </T>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 18, maxWidth: 720, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
});
