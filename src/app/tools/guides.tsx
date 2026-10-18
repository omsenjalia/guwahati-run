import { useState } from "react";
import { Linking, View } from "react-native";
import { EXPLORE, EXPLORE_RETURN_MARGIN_MIN, STATION_GUIDES } from "@/data/guides";
import { EVENT, LEGS, PLACES } from "@/data/trip";
import { useFeed, useNow } from "@/core/data";
import { ECATERING_URL, planMeals } from "@/lib/meal-planner";
import { hhmm, MIN, ms, stamp } from "@/lib/time";
import { buildSteps } from "@/lib/trip-engine";
import { Button, Card, Chips, Empty, InfoRow, Pill, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

const TABS = [
  { value: "stations", label: "Stations" },
  { value: "food", label: "Food" },
  { value: "explore", label: "Free time" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const maps = (q: string) => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);

/** Station exits and food, the best stops to order meals on the train, and what fits in the free hours on 1 Nov. */
export default function Guides() {
  const [tab, setTab] = useState<Tab>("stations");
  return (
    <Page title="Guides">
      <Chips options={TABS} value={tab} onChange={setTab} />
      {tab === "stations" && <Stations />}
      {tab === "food" && <Food />}
      {tab === "explore" && <Explore />}
    </Page>
  );
}

function Stations() {
  return STATION_GUIDES.map((g) => {
    const p = PLACES[g.id];
    return (
      <Section key={g.id} title={`${p.name} · ${p.code ?? ""}`}>
        <Card style={{ gap: 12 }}>
          <InfoRow icon="exit-run" label="Exit" value={g.exit} />
          <InfoRow icon="taxi" label="Getting on" value={g.transport} />
          <InfoRow icon="food-outline" label="Food" value={g.food} />
          <InfoRow icon="toilet" label="Facilities" value={g.facilities} />
          {!!g.tip && <Pill label={g.tip} tone="primary" icon="lightbulb-on-outline" />}
          <Button label="Map" icon="map-marker-outline" kind="secondary" onPress={() => maps(`${p.name} railway station`)} />
          {g.verify && (
            <T v="caption" color="faint">
              Worth a quick check on the map.
            </T>
          )}
        </Card>
      </Section>
    );
  });
}

function Food() {
  const live = useFeed().live;
  const now = useNow();
  const { meals, water } = planMeals(live);
  if (!meals.length) return <Empty icon="silverware-fork-knife" title="No timetables yet" body="Train timetables sync once a day. Check back soon." />;
  const upcoming = meals.filter((m) => m.at > now - 30 * MIN);
  return (
    <>
      <Section title="Meals on the train">
        <Card style={{ gap: 12 }}>
          <T v="caption" color="muted">
            Best stop near each mealtime (longest halt), moved with delays. Order IRCTC e-catering at least 2 hours ahead, with PNR and coach.
          </T>
          {upcoming.map((m) => {
            const leg = LEGS.find((l) => l.id === m.legId);
            const soon = m.orderBy > now && m.orderBy - now < 3 * 3600_000;
            return (
              <View key={`${m.legId}-${m.at}`} style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <T v="heading" style={{ flex: 1 }}>
                    {m.meal} at {m.station}
                  </T>
                  <T v="label" num>
                    {stamp(m.at)}
                  </T>
                </View>
                <T v="caption" color="muted">
                  {leg?.train?.name}, {m.haltMin} min halt. Order by {hhmm(m.orderBy)}.
                </T>
                {soon && <Pill label={`Order before ${hhmm(m.orderBy)}`} tone="warn" icon="clock-alert-outline" />}
              </View>
            );
          })}
          <Button label="IRCTC e-catering" icon="open-in-new" onPress={() => void Linking.openURL(ECATERING_URL)} />
          <Button label="Or call 1323" icon="phone-outline" kind="ghost" onPress={() => void Linking.openURL("tel:1323")} />
        </Card>
      </Section>
      {water.some((w) => w.at > now) && (
        <Section title="Water refills">
          <Card style={{ gap: 8 }}>
            <T v="caption" color="muted">
              Long halts to buy sealed Rail Neer and snacks. Keep 2 litres each on the long legs.
            </T>
            {water
              .filter((w) => w.at > now)
              .map((w) => (
                <View key={`${w.legId}-${w.at}`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T v="label">{w.station}</T>
                  <T v="caption" color="muted" num>
                    {stamp(w.at)}, {w.haltMin} min
                  </T>
                </View>
              ))}
          </Card>
        </Section>
      )}
    </>
  );
}

function Explore() {
  const live = useFeed().live;
  const now = useNow();
  const train = buildSteps(live).find((s) => s.id === "L3");
  if (!train) return null;
  const beAtStation = train.start - EXPLORE_RETURN_MARGIN_MIN * MIN;
  const freeFrom = ms(EVENT.end);
  const late = train.start - train.plannedStart >= 5 * MIN;
  return (
    <>
      <Card style={{ gap: 6 }}>
        <T v="heading">Free time on 1 Nov</T>
        <T v="body">
          From {hhmm(freeFrom)} until the Brahmaputra Express at {hhmm(train.start)}
          {late ? ` (running late, was ${hhmm(train.plannedStart)})` : ""}. Be at Kamakhya by {hhmm(beAtStation)} with bags.
        </T>
        <T v="caption" color="faint">
          Leave-by times move automatically if the train is late.
        </T>
      </Card>
      {EXPLORE.map((e) => {
        const leaveBy = beAtStation - e.toKyqMin * MIN;
        const arriveBy = leaveBy - e.stayMin * MIN;
        const gone = now > leaveBy;
        const fits = Math.max(now, freeFrom) <= arriveBy;
        return (
          <Card key={e.name} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <T v="heading" style={{ flex: 1 }}>
                {e.name}
              </T>
              <Pill label={gone ? "Too late" : fits ? "Fits" : "Tight"} tone={gone ? "bad" : fits ? "good" : "warn"} />
            </View>
            <T v="body" color="muted">
              {e.why}
            </T>
            <T v="label" num>
              Spend {e.stayMin} min · {e.toKyqMin} min to Kamakhya · leave by {hhmm(leaveBy)}
            </T>
            <Button label="Map" icon="map-marker-outline" kind="secondary" onPress={() => maps(e.mapsQuery)} />
          </Card>
        );
      })}
    </>
  );
}
