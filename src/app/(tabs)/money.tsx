import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { TEAM } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed } from "@/core/data";
import { Hero } from "@/features/bits";
import { reportRows, type ReportRow } from "@/lib/report-data";
import { dayMonth } from "@/lib/time";
import { Button, Card, Empty, Pill, Section, type IconName } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, useTheme } from "@/ui/theme";

const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

const ICONS: Record<string, IconName> = {
  Train: "train",
  Metro: "subway-variant",
  "Cab or auto": "taxi",
  Food: "food-outline",
  Accommodation: "bed-outline",
  Registration: "badge-account-outline",
  Other: "dots-horizontal-circle-outline",
};

/** What the trip has cost: tickets from the trip data plus every bill added in the app. */
export default function Money() {
  const c = useTheme();
  const { session } = useAuth();
  const feed = useFeed();
  const [showTickets, setShowTickets] = useState(false);
  const rows = reportRows(feed.expenses, null);
  const total = rows.reduce((t, r) => t + r.amount, 0);
  const eligible = rows.reduce((t, r) => t + r.eligible, 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const tickets = rows.filter((r) => r.category === "Train");
  const spends = rows.filter((r) => r.category !== "Train").sort((a, b) => b.date.localeCompare(a.date));
  const isTeam = session?.role === "team";

  return (
    <Screen title="Money" subtitle="Everything the trip has cost">
      <Hero>
        <T v="overline" color="rgba(255,255,255,0.7)">
          Total spent
        </T>
        <T v="display" color="#FFFFFF" num>
          {rupees(total)}
        </T>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pill label={`${rupees(total / TEAM.length)} each`} tone="accent" solid icon="account-group" />
          <View style={styles.glass}>
            <T v="label" color="#FFFFFF">
              College grant can cover {rupees(eligible)}
            </T>
          </View>
        </View>
      </Hero>

      {isTeam && <Button label="Add a bill" icon="camera-plus-outline" onPress={() => router.push("/add-bill")} />}

      <Section title="By category">
        <Card style={{ gap: 14 }}>
          {cats.map(([cat, amount]) => (
            <View key={cat} style={{ gap: 6 }}>
              <View style={styles.row}>
                <MaterialCommunityIcons name={ICONS[cat] ?? "cash"} size={18} color={c.primary} />
                <T v="label" style={{ flex: 1 }}>
                  {cat}
                </T>
                <T v="label" num style={{ fontFamily: font.bold }}>
                  {rupees(amount)}
                </T>
              </View>
              <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
                <View style={[styles.barFill, { backgroundColor: c.primary, width: `${Math.max(2, (amount / total) * 100)}%` }]} />
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section
        title={`Train tickets · ${rupees(tickets.reduce((t, r) => t + r.amount, 0))}`}
        action={
          <Pressable onPress={() => setShowTickets(!showTickets)} hitSlop={8}>
            <T v="label" color="primary">
              {showTickets ? "Hide" : "Show"}
            </T>
          </Pressable>
        }
      >
        {showTickets && (
          <Card style={{ gap: 12 }}>
            {tickets.map((r, i) => (
              <RowItem key={i} row={r} />
            ))}
          </Card>
        )}
      </Section>

      <Section title="Other spending">
        <Card style={{ gap: 12 }}>
          {spends.length ? (
            spends.map((r, i) => <RowItem key={i} row={r} />)
          ) : (
            <Empty icon="receipt" title="No bills yet" body={isTeam ? "Add a photo of each bill so the college report is complete." : "Bills the team adds show up here."} />
          )}
        </Card>
      </Section>
    </Screen>
  );
}

function RowItem({ row }: { row: ReportRow }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}>
        <MaterialCommunityIcons name={ICONS[row.category] ?? "cash"} size={17} color={c.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label" numberOfLines={1}>
          {row.label}
        </T>
        <T v="caption" color="muted">
          {dayMonth(row.date)} · {row.category}
        </T>
      </View>
      <T v="label" num style={{ fontFamily: font.bold }}>
        {rupees(row.amount)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  bar: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  glass: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
