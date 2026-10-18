import { router, type Href } from "expo-router";
import { Linking, Share } from "react-native";
import { useState } from "react";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { Card, LinkRow, Section, type IconName } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";
import type { Tone } from "@/ui/theme";

type Item = { icon: IconName; label: string; sub: string; href: Href; tone?: Tone };

/** Everything that isn't a main tab. Parents get the read-only bits. */
const TEAM: { title: string; items: Item[] }[] = [
  {
    title: "On the way",
    items: [
      { icon: "wallet-outline", label: "Ticket wallet", sub: "Every ticket offline, Show to TTE", href: "/tools/wallet" },
      { icon: "binoculars", label: "Extra PNRs and waitlists", sub: "Track any PNR or a train's waitlist", href: "/tools/watches" },
      { icon: "map-legend", label: "Guides", sub: "Stations, meals on the train, free time", href: "/tools/guides" },
      { icon: "lifebuoy", label: "SOS", sub: "Share where you are, call for help, lost items", href: "/tools/sos", tone: "bad" },
    ],
  },
  {
    title: "Hackathon",
    items: [{ icon: "laptop", label: "Hackathon", sub: "Countdown, rest rotation, board, pitch timer", href: "/tools/hackathon", tone: "good" }],
  },
  {
    title: "Team",
    items: [
      { icon: "bag-checked", label: "Packing and prep", sub: "Shared checklists", href: "/tools/packing" },
      { icon: "notebook-outline", label: "Journal and post", sub: "Notes and photos, LinkedIn recap", href: "/tools/journal" },
      { icon: "bell-outline", label: "Alerts", sub: "Everything the app has warned about", href: "/tools/alerts" },
    ],
  },
  {
    title: "College",
    items: [
      { icon: "school-outline", label: "Grant and final report", sub: "SSIP estimate, report PDF, Excel", href: "/tools/grant", tone: "accent" },
      { icon: "printer-outline", label: "Paper backup", sub: "Print or save everything as a PDF", href: "/tools/print", tone: "accent" },
    ],
  },
  {
    title: "System",
    items: [{ icon: "heart-pulse", label: "System status", sub: "Data sources, background jobs, self-test", href: "/tools/system", tone: "neutral" }],
  },
];

const PARENT: { title: string; items: Item[] }[] = [
  {
    title: "Follow along",
    items: [
      { icon: "laptop", label: "Hackathon schedule", sub: "What they're doing and when", href: "/tools/hackathon", tone: "good" },
      { icon: "notebook-outline", label: "Trip journal", sub: "Notes and photos from the team", href: "/tools/journal" },
      { icon: "bell-outline", label: "Alerts", sub: "Recent trip updates", href: "/tools/alerts" },
    ],
  },
];

export default function More() {
  const { session } = useAuth();
  const team = session?.role === "team";
  return (
    <Screen title="More" subtitle={team ? "Every tool for the trip" : "More from the trip"}>
      {(team ? TEAM : PARENT).map((g) => (
        <Section key={g.title} title={g.title}>
          <Card style={{ gap: 4, paddingVertical: 8 }}>
            {g.items.map((it) => (
              <LinkRow key={it.label} icon={it.icon} label={it.label} sub={it.sub} tone={it.tone} onPress={() => router.push(it.href)} />
            ))}
            {g.title === "System" && <CalendarRow />}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}

/** Adds the live trip calendar to the phone's calendar app. */
function CalendarRow() {
  const [note, setNote] = useState("");
  async function open() {
    setNote("");
    try {
      const r = await api<{ webcal: string; https: string }>("/api/subscribe");
      const ok = await Linking.openURL(r.webcal).then(
        () => true,
        () => false,
      );
      // No calendar app took webcal://: share the link to paste into Google Calendar ("From URL").
      if (!ok) await Share.share({ message: r.https });
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <>
      <LinkRow icon="calendar-sync-outline" label="Trip calendar" sub="Subscribe: times update with delays" tone="neutral" onPress={() => void open()} />
      {!!note && (
        <T v="caption" color="bad">
          {note}
        </T>
      )}
    </>
  );
}
