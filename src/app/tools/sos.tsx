import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Linking, Pressable, Share, View } from "react-native";
import { PLACES, TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed, useNow } from "@/core/data";
import { person } from "@/features/trip";
import { hhmm } from "@/lib/time";
import { buildSteps, computeNow, personBerth } from "@/lib/trip-engine";
import { Button, Card, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { useTheme } from "@/ui/theme";

const LOST = [
  {
    title: "Lost the e-ticket or phone with it",
    steps: [
      "The ticket is the PNR plus a valid photo ID. Tell the TTE your PNR (it's in this app and on the paper backup).",
      "Any teammate can show the PNR from their phone, or you can text PNR <number> to 139.",
      "Reprint later from IRCTC: My Account, Booked Ticket History.",
    ],
  },
  {
    title: "Lost an ID card",
    steps: [
      "Railways accept Aadhaar or driving licence from DigiLocker (or the mAadhaar app) as valid ID.",
      "Set up DigiLocker on every phone before the trip so this is ready offline.",
      "If the ID was lost on the train or at a station, report it to RPF (139) for a written record.",
    ],
  },
  {
    title: "Lost or stolen phone",
    steps: [
      "Call the number from a teammate's phone. Ask the TTE or coach attendant to check the coach.",
      "Report it: Rail Madad (139 or the Rail Madad app) and RPF or GRP at the next big station. Get the complaint number.",
      "Block the SIM with your operator, then block the phone's IMEI on the Sanchar Saathi (CEIR) portal using that complaint.",
      "Change your UPI PIN and email password from another device.",
    ],
  },
  {
    title: "Lost wallet or cards",
    steps: [
      "Block cards from your bank app on a teammate's phone, or call the bank's helpline.",
      "If teammates cover you, add it in Splitwise so it's settled later.",
      "Report to RPF (139) if it happened on the train.",
    ],
  },
];

const call = (n: string) => void Linking.openURL(`tel:${n.replace(/\s+/g, "")}`);

/** Emergency: share where we are (with train, coach and PNR), call for help, find a hospital, lost items. */
export default function Sos() {
  const c = useTheme();
  const me = useAuth().session!.person;
  const live = useFeed().live;
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const state = computeNow(buildSteps(live), now);
  const step = state.focus;
  const leg = step?.leg;
  const berth = leg ? personBerth(leg, live, me) : undefined;

  function tripLine() {
    if (!step) return "";
    if (leg?.train && state.focusMode === "active") {
      const near = live.legs[leg.id]?.lastStation ? `, near ${live.legs[leg.id]!.lastStation}` : "";
      return `On ${leg.train.number} ${leg.train.name} (${PLACES[leg.from].short} to ${PLACES[leg.to].short}${near})${berth ? `, coach ${berth.coach} berth ${berth.berth}` : ""}${leg.pnr ? `, PNR ${leg.pnr}` : ""}.`;
    }
    return `${step.title}${step.place ? ` at ${PLACES[step.place].name}` : ""}.`;
  }

  async function share() {
    setBusy(true);
    let loc = "";
    try {
      if ((await Location.requestForegroundPermissionsAsync()).granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        loc = ` Location: https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
      }
    } catch {
      // No fix in time: send without it.
    }
    await Share.share({ message: `SOS from ${person(me).name} at ${hhmm(Date.now())} IST. ${tripLine()}${loc}` }).catch(() => {});
    setBusy(false);
  }

  return (
    <Page title="SOS">
      <Button label={busy ? "Getting location" : "Share where I am"} icon="share-variant" kind="danger" loading={busy} onPress={() => void share()} style={{ minHeight: 64 }} />
      <T v="caption" color="muted">
        Opens WhatsApp, SMS and the rest with your location{leg?.train ? ", train, coach and PNR" : ""}.
      </T>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, gap: 4, backgroundColor: c.badSoft }} onPress={() => call("112")}>
          <T v="title" color="bad">
            112
          </T>
          <T v="caption" color="bad">
            Police, ambulance, fire
          </T>
        </Card>
        <Card style={{ flex: 1, gap: 4, backgroundColor: c.warnSoft }} onPress={() => call("139")}>
          <T v="title" color="warn">
            139
          </T>
          <T v="caption" color="warn">
            Rail Madad, RPF on trains
          </T>
        </Card>
      </View>
      <Button label="Nearest hospital" icon="hospital-box-outline" kind="secondary" onPress={() => void Linking.openURL("https://www.google.com/maps/search/?api=1&query=hospital")} />

      <Section title="Team">
        <Card style={{ gap: 10 }}>
          {TEAM.map((p) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <T v="label" style={{ flex: 1 }}>
                {p.name}
              </T>
              {!!p.phone && <Button label="Call" kind="secondary" style={{ minHeight: 38 }} onPress={() => call(p.phone)} />}
              {!!p.guardian.phone && <Button label="Parent" kind="secondary" style={{ minHeight: 38 }} onPress={() => call(p.guardian.phone)} />}
            </View>
          ))}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {USEFUL_NUMBERS.filter((n) => n.number !== "112" && n.number !== "139").map((n) => (
              <Button key={n.number} label={`${n.number} ${n.label}`} kind="secondary" style={{ minHeight: 38 }} onPress={() => call(n.number)} />
            ))}
          </View>
        </Card>
      </Section>

      <Section title="If something is lost">
        <Card style={{ gap: 4 }}>
          {LOST.map((l) => (
            <View key={l.title}>
              <Pressable
                onPress={() => setOpen(open === l.title ? null : l.title)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === l.title }}
                style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 }}
              >
                <T v="label" style={{ flex: 1, fontSize: 15 }}>
                  {l.title}
                </T>
                <MaterialCommunityIcons name={open === l.title ? "chevron-up" : "chevron-down"} size={20} color={c.faint} />
              </Pressable>
              {open === l.title &&
                l.steps.map((s, i) => (
                  <T key={i} v="body" style={{ marginBottom: 8 }}>
                    {i + 1}. {s}
                  </T>
                ))}
            </View>
          ))}
        </Card>
      </Section>
    </Page>
  );
}
