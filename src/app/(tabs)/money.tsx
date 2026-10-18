import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BACKUPS, TEAM } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed } from "@/core/data";
import { Hero } from "@/features/bits";
import { deleteDoc, openDoc, useDocs } from "@/features/docs";
import type { DocRow } from "@/lib/documents";
import { categoryLabel, type Expense } from "@/lib/expenses";
import { expectedReceipts } from "@/lib/receipt-checklist";
import { reportRows, type ReportRow } from "@/lib/report-data";
import { dayMonth } from "@/lib/time";
import { Button, Card, confirm, Empty, Pill, Section, type IconName } from "@/ui/kit";
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
  const { session } = useAuth();
  return session?.role === "team" ? <TeamMoney /> : <MoneyView docs={null} />;
}

/** Attendees also see the files: bills on each expense, tickets and documents, and what the report still needs. */
function TeamMoney() {
  const { rows: docs } = useDocs();
  return <MoneyView docs={docs} team />;
}

function MoneyView({ docs, team }: { docs: DocRow[] | null; team?: boolean }) {
  const c = useTheme();
  const feed = useFeed();
  const [showTickets, setShowTickets] = useState(false);
  const rows = reportRows(feed.expenses, docs);
  const total = rows.reduce((t, r) => t + r.amount, 0);
  const eligible = rows.reduce((t, r) => t + r.eligible, 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const tickets = rows.filter((r) => r.category === "Train");
  const spends = feed.expenses.filter((e) => !(e.created_by === "setup" && e.category === "train")).sort((a, b) => b.spent_on.localeCompare(a.spent_on));

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

      {team && <Button label="Add a bill" icon="camera-plus-outline" onPress={() => router.push("/add-bill")} />}

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
              <TicketRow key={i} row={r} />
            ))}
            {BACKUPS.map((b) => (
              <T key={b.id} v="caption" color="faint">
                Not counted: backup {b.train!.number} {b.train!.name}, to be cancelled for a refund unless we use it.
              </T>
            ))}
            {team && (
              <T v="caption" color="faint">
                A fare counts while its ticket is uploaded. Delete the ticket below and the fare comes off.
              </T>
            )}
          </Card>
        )}
      </Section>

      <Section title="Other spending">
        <Card style={{ gap: 12 }}>
          {spends.length ? (
            spends.map((e) => <ExpenseItem key={e.id} e={e} bills={docs?.filter((d) => d.kind === "receipt" && d.expense_id === e.id)} team={team} />)
          ) : (
            <Empty icon="receipt" title="No bills yet" body={team ? "Add a photo of each bill so the college report is complete." : "Bills the team adds show up here."} />
          )}
          {team && !!spends.length && (
            <T v="caption" color="faint">
              Tap a bill to change or delete it.
            </T>
          )}
        </Card>
      </Section>

      {team && docs && <ReportChecklist docs={docs} expenses={feed.expenses} />}
      {team && docs && <DocumentsCard docs={docs} />}
    </Screen>
  );
}

function TicketRow({ row }: { row: ReportRow }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}>
        <MaterialCommunityIcons name="train" size={17} color={c.muted} />
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

function ExpenseItem({ e, bills, team }: { e: Expense; bills?: DocRow[]; team?: boolean }) {
  const c = useTheme();
  const cat = categoryLabel(e.category);
  return (
    <Pressable disabled={!team} onPress={() => router.push({ pathname: "/add-bill", params: { expense: e.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}>
        <MaterialCommunityIcons name={ICONS[cat] ?? "cash"} size={17} color={c.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label" numberOfLines={1}>
          {e.title}
        </T>
        <T v="caption" color="muted" numberOfLines={1}>
          {dayMonth(`${e.spent_on}T12:00:00+05:30`)} · {cat}
          {e.note ? ` · ${e.note}` : ""}
        </T>
        {bills && !bills.length && (
          <T v="caption" color="warn">
            No bill yet
          </T>
        )}
      </View>
      <T v="label" num style={{ fontFamily: font.bold }}>
        {rupees(e.amount)}
      </T>
    </Pressable>
  );
}

/** What the college report still needs (invitation letter, every ticket, the registration receipt). */
function ReportChecklist({ docs, expenses }: { docs: DocRow[]; expenses: Expense[] }) {
  const c = useTheme();
  const list = expectedReceipts(docs, expenses);
  const missing = list.filter((x) => !x.have).length;
  return (
    <Section title={`Receipts for the report · ${list.length - missing}/${list.length}`}>
      <Card style={{ gap: 10 }}>
        {list.map((x) => (
          <View key={x.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <MaterialCommunityIcons name={x.have ? "check-circle" : "circle-outline"} size={20} color={x.have ? c.good : c.warn} />
            <View style={{ flex: 1 }}>
              <T v="label" color={x.have ? "muted" : "text"}>
                {x.label}
              </T>
              {!x.have && (
                <T v="caption" color="muted">
                  {x.hint}
                </T>
              )}
            </View>
          </View>
        ))}
        {missing > 0 ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Ticket" icon="ticket-outline" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/add-bill", params: { kind: "ticket" } })} />
            <Button label="Document" icon="file-document-outline" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/add-bill", params: { kind: "document" } })} />
          </View>
        ) : (
          <T v="label" color="good">
            Every expected receipt is in. The report is complete.
          </T>
        )}
      </Card>
    </Section>
  );
}

/** Tickets, documents and certificates: open or delete. */
function DocumentsCard({ docs }: { docs: DocRow[] }) {
  const c = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const order: Record<string, number> = { ticket: 0, document: 1, certificate: 2, report: 3 };
  const files = docs.filter((d) => d.kind in order).sort((a, b) => order[a.kind] - order[b.kind]);
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError("");
    await fn().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    setBusy(null);
  };
  return (
    <Section title="Tickets, documents and certificates">
      <Card style={{ gap: 10 }}>
        {!files.length && (
          <T v="caption" color="muted">
            Nothing yet. Add e-tickets and the invitation letter with the buttons above.
          </T>
        )}
        {files.map((d) => (
          <View key={d.id} style={styles.row}>
            <Pressable style={[styles.row, { flex: 1 }]} onPress={() => void run(d.id, () => openDoc(d.id))} accessibilityRole="button" accessibilityLabel={`Open ${d.title}`}>
              <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
                <MaterialCommunityIcons name={d.mime === "application/pdf" ? "file-pdf-box" : "file-image-outline"} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="label" numberOfLines={1}>
                  {d.title ?? d.path.split("/").pop()}
                </T>
                <T v="caption" color="muted">
                  {busy === d.id ? "Working..." : d.kind[0].toUpperCase() + d.kind.slice(1)}
                </T>
              </View>
            </Pressable>
            {d.kind !== "report" && (
              <Pressable
                hitSlop={8}
                accessibilityLabel={`Delete ${d.title}`}
                onPress={async () => {
                  const also = d.kind === "ticket" ? " Its fare comes off Money, the grant and the report." : "";
                  if (await confirm(`Delete "${d.title}"?`, `It's removed from GitHub for everyone.${also}`, "Delete")) void run(d.id, () => deleteDoc(d.id));
                }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={c.faint} />
              </Pressable>
            )}
          </View>
        ))}
        {!!error && (
          <T v="caption" color="bad">
            {error}
          </T>
        )}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  bar: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  glass: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
