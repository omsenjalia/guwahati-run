import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLACES, TEAM, type Leg } from "@/data/trip";
import { useFeed, useNow } from "@/core/data";
import { openDoc, useDocs } from "@/features/docs";
import { trainLegs } from "@/features/trip";
import type { LiveState } from "@/lib/live-types";
import { hhmm, ms, stamp, weekdayDate } from "@/lib/time";
import { canBoard, legBerths, legPassengers, parseStatus } from "@/lib/trip-engine";
import { Button, Card, IconButton, Pill } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { font } from "@/ui/theme";

function seatFor(leg: Leg, live: LiveState, person: string) {
  const b = legBerths(leg, live).find((x) => x.person === person);
  if (b) return { main: `${b.coach}/${b.berth}`, sub: b.type };
  const p = legPassengers(leg, live).find((x) => x.person === person);
  return { main: parseStatus(p?.current).label, sub: "" };
}
const onTicket = (leg: Leg) => TEAM.filter((p) => leg.passengers?.some((x) => x.person === p.id));

/** Every ticket, readable offline (trip data plus the last synced status). "Show to TTE" fills the screen in big type. */
export default function Wallet() {
  const live = useFeed().live;
  const now = useNow();
  const { rows: docs } = useDocs();
  const [tte, setTte] = useState<Leg | null>(null);
  const [error, setError] = useState("");
  const tickets = trainLegs(live).filter((l) => l.pnr);

  return (
    <Page title="Ticket wallet" subtitle="Works offline">
      {tickets.map((leg) => {
        const pdf = docs?.find((d) => d.kind === "ticket" && d.leg_id === leg.id);
        const ok = canBoard(leg, live);
        return (
          <Card key={leg.id} style={[{ gap: 10 }, ms(leg.arrive) < now && { opacity: 0.55 }]}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T v="caption" color="muted" num>
                  {leg.train?.number} · {leg.travelClass}
                  {leg.backupFor ? " · Backup" : ""}
                </T>
                <T v="heading">{leg.train?.name}</T>
              </View>
              <Pill label={ok ? "Can board" : "Waitlisted"} tone={ok ? "good" : "warn"} />
            </View>
            <T v="body">
              {PLACES[leg.from].short} to {PLACES[leg.to].short}
            </T>
            {leg.ticketTo && (
              <T v="caption" color="muted">
                Ticket is to {leg.ticketTo}; we get off at {PLACES[leg.to].short}.
              </T>
            )}
            <T v="caption" color="muted" num>
              {weekdayDate(leg.depart)} · {hhmm(leg.depart)} to {stamp(leg.arrive)}
            </T>
            <T v="title" num selectable>
              PNR {leg.pnr}
            </T>
            {onTicket(leg).map((p) => {
              const s = seatFor(leg, live, p.id);
              return (
                <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T v="label">{p.short}</T>
                  <T v="label" num style={{ fontFamily: font.bold }}>
                    {s.main}
                    {s.sub ? `  ${s.sub}` : ""}
                  </T>
                </View>
              );
            })}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Show to TTE" icon="card-account-details-outline" style={{ flex: 1 }} onPress={() => setTte(leg)} />
              {pdf ? (
                <Button label="E-ticket" icon="file-pdf-box" kind="secondary" style={{ flex: 1 }} onPress={() => void openDoc(pdf.id).catch((e) => setError(String(e)))} />
              ) : (
                <Button label="Add e-ticket" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/add-bill", params: { kind: "ticket" } })} />
              )}
            </View>
          </Card>
        );
      })}
      {!!error && (
        <T v="caption" color="bad">
          {error}
        </T>
      )}
      <T v="caption" color="faint">
        Carry original photo ID. The e-ticket needs signal to open.
      </T>
      {tte && <TteScreen leg={tte} live={live} onClose={() => setTte(null)} />}
    </Page>
  );
}

/** Full screen, high contrast, big type: hand the phone to the TTE. */
function TteScreen({ leg, live, onClose }: { leg: Leg; live: LiveState; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: "#FFFFFF" }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, gap: 8 }}>
        <View style={{ alignItems: "flex-end" }}>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <T v="heading" color="#000000">
          {leg.train?.number} {leg.train?.name} · {leg.travelClass}
        </T>
        <T v="body" color="#444444">
          {PLACES[leg.from].name} to {PLACES[leg.to].name}, {weekdayDate(leg.depart)}
        </T>
        <T v="overline" color="#555555" style={{ marginTop: 18 }}>
          PNR
        </T>
        <T v="display" color="#000000" num selectable style={{ fontSize: 44, lineHeight: 50 }}>
          {leg.pnr}
        </T>
        <View style={{ marginTop: 20, gap: 14 }}>
          {onTicket(leg).map((p) => (
            <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderColor: "#DDDDDD", paddingBottom: 10 }}>
              <T v="title" color="#000000" style={{ flex: 1 }}>
                {p.name}
              </T>
              <T v="title" color="#000000" num style={{ fontFamily: font.heavy }}>
                {seatFor(leg, live, p.id).main}
              </T>
            </View>
          ))}
        </View>
        <T v="body" color="#555555" style={{ marginTop: 24 }}>
          All of us carry original photo ID.
        </T>
      </ScrollView>
    </Modal>
  );
}
