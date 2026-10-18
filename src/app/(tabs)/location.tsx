import { Linking, StyleSheet, View } from "react-native";
import { PLACES, TEAM, type PersonId } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useFeed, useNow } from "@/core/data";
import { firstName, personIndex } from "@/features/trip";
import { FRESH_MS, type PersonLocation } from "@/lib/locations";
import { ago } from "@/lib/time";
import { Avatar, avatarColor, Button, Card, Empty, Pill, Section } from "@/ui/kit";
import { MapView } from "@/ui/map-view";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";

/** Where everyone is. Phones report every 30 min; a phone with location off borrows a friend's fix. */
export default function LocationScreen() {
  const { session } = useAuth();
  const feed = useFeed();
  const now = useNow();
  const child = session!.person;
  const people = [...TEAM].sort((a, b) => Number(b.id === child) - Number(a.id === child));

  // One pin per phone that reported (several people can share one).
  const phones = new Map<PersonId, { loc: PersonLocation; people: PersonId[] }>();
  for (const p of TEAM) {
    const loc = feed.locations[p.id];
    if (!loc) continue;
    const entry = phones.get(loc.via) ?? { loc, people: [] };
    entry.people.push(p.id);
    phones.set(loc.via, entry);
  }
  const points = [...phones.entries()].map(([via, e]) => ({
    lat: e.loc.lat,
    lon: e.loc.lon,
    label: e.people.length > 1 ? String(e.people.length) : initials(via),
    color: avatarColor(personIndex(via)),
  }));

  return (
    <Screen title="Location" subtitle="Shared every 30 minutes">
      {points.length ? (
        <MapView points={points} height={320} />
      ) : (
        <Card>
          <Empty icon="map-marker-question-outline" title="No location yet" body="It shows up once someone on the trip turns on location sharing in the app." />
        </Card>
      )}

      <Section title="People">
        {people.map((p) => {
          const loc = feed.locations[p.id];
          const own = loc?.via === p.id;
          const fresh = !!loc && now - loc.at < FRESH_MS;
          const i = personIndex(p.id);
          return (
            <Card key={p.id} style={{ gap: 12 }}>
              <View style={styles.row}>
                <Avatar name={p.name} index={i} size={42} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="heading">
                    {p.name}
                    {p.id === child && session!.role === "parent" ? " · your child" : ""}
                  </T>
                  <T v="caption" color="muted">
                    {!loc ? "Hasn't shared yet" : own ? `Own phone · ${ago(loc.at, now)}` : `Location off · with ${firstName(loc.via)} (${ago(loc.at, now)})`}
                  </T>
                </View>
                <Pill label={!loc ? "None" : fresh ? (own ? "Live" : "Via friend") : "Old"} tone={!loc ? "neutral" : fresh ? (own ? "good" : "warn") : "bad"} />
              </View>
              {loc && (
                <View style={styles.row}>
                  <T v="label" color="muted" style={{ flex: 1 }}>
                    {nearest(loc)}
                    {loc.accuracy ? ` · ±${Math.round(loc.accuracy)} m` : ""}
                  </T>
                  <Button
                    label="Maps"
                    icon="google-maps"
                    kind="secondary"
                    style={{ minHeight: 38, paddingHorizontal: 12 }}
                    onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`)}
                  />
                </View>
              )}
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}

const initials = (id: PersonId) =>
  TEAM[personIndex(id)].name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/** "Near Kamakhya Junction" / "120 km from Delhi Jn" from the trip's known places. */
function nearest(loc: PersonLocation) {
  let best = { name: "", km: Infinity };
  for (const p of Object.values(PLACES)) {
    const km = haversineKm(loc.lat, loc.lon, p.lat, p.lon);
    if (km < best.km) best = { name: p.name, km };
  }
  return best.km < 3 ? `Near ${best.name}` : `${Math.round(best.km)} km from ${best.name}`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
