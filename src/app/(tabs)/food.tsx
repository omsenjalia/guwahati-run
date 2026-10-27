import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { FOOD_SOURCE, FOOD_VEG, type FoodItem } from "@/data/food";
import { Button, Card, Input, LinkRow, Pill, Section } from "@/ui/kit";
import { Screen } from "@/ui/screen";
import { T } from "@/ui/text";

const rupees = (n: number) => `₹${n}`;

/** Green (veg) or red (non-veg) mark, the way IRCTC prints it. */
function VegMark({ veg }: { veg: boolean }) {
  const col = veg ? "#1F8A44" : "#B3261E";
  return (
    <View style={[styles.mark, { borderColor: col }]}>
      <View style={[styles.markDot, { backgroundColor: col, borderRadius: veg ? 999 : 1 }]} />
      <View style={[styles.markInner, { borderColor: col }]} />
    </View>
  );
}

function Row({ item }: { item: FoodItem }) {
  return (
    <View style={styles.row}>
      <VegMark veg={item.veg} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{item.name}</T>
        {!!item.portion && (
          <T v="caption" color="faint">
            {item.portion}
          </T>
        )}
        {item.station !== undefined && item.station !== item.train && (
          <T v="caption" color="muted">
            {`At a station ${rupees(item.station)}`}
          </T>
        )}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <T v="heading" num>
          {rupees(item.train)}
        </T>
        <T v="caption" color="faint">
          in train
        </T>
      </View>
    </View>
  );
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Our own copy of the list, for printing or saving when there is no signal. */
function listHtml() {
  const rows = FOOD_VEG.map(
    (s) =>
      `<h2>${esc(s.title)}</h2><table><tr><th>Item</th><th>What you get</th><th class="r">In train</th><th class="r">At station</th></tr>${s.items
        .map(
          (i) =>
            `<tr><td>${i.veg ? "&#9679;" : "&#9632;"} ${esc(i.name)}</td><td class="m">${esc(i.portion ?? "")}</td><td class="r"><b>₹${i.train}</b></td><td class="r">${i.station !== undefined ? `₹${i.station}` : ""}</td></tr>`,
        )
        .join("")}</table>`,
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Train food prices (veg)</title>
<style>body{font:12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:18px}h1{font-size:17px;margin:0 0 2px}
h2{font-size:13px;margin:14px 0 4px}table{width:100%;border-collapse:collapse;margin-bottom:6px}
th{font-size:9px;text-transform:uppercase;color:#555;text-align:left;border-bottom:1px solid #999;padding:3px 4px}
td{border-bottom:1px solid #ddd;padding:3px 4px;vertical-align:top}.m{color:#555}.r{text-align:right;white-space:nowrap}</style></head>
<body><h1>Train food prices (veg)</h1>
<div class="m">${esc(FOOD_SOURCE.authority)} — ${esc(FOOD_SOURCE.name)}. Vegetarian dishes only. Prices include GST. Effective ${esc(FOOD_SOURCE.updated)}; checked ${esc(FOOD_SOURCE.checked)}.</div>
${rows}
<p class="m">Charged more than this? Complain on Rail Madad ${FOOD_SOURCE.complaint}. Source: ${esc(FOOD_SOURCE.url)}</p></body></html>`;
}

/**
 * Official pantry car prices. Shown to the people on the trip, until they are
 * home: after that there is no pantry car to check.
 */
export default function Food() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const query = q.trim().toLowerCase();
  const sections = useMemo(
    () =>
      FOOD_VEG.map((s) => ({
        ...s,
        items: query
          ? s.items.filter((i) => i.name.toLowerCase().includes(query) || (i.portion ?? "").toLowerCase().includes(query))
          : s.items,
      })).filter((s) => s.items.length),
    [query],
  );
  const hits = sections.reduce((n, s) => n + s.items.length, 0);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const { uri } = await Print.printToFileAsync({ html: listHtml() });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Train food prices" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function printWeb() {
    const w = window.open("", "_blank");
    if (!w) return setError("Allow pop-ups for this site to print.");
    w.document.write(listHtml());
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Screen title="Food" subtitle="Veg dishes, at the pantry car rates">
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill label={FOOD_SOURCE.name} tone="accent" />
          <T v="caption" color="muted">
            {`Updated ${FOOD_SOURCE.updated}`}
          </T>
        </View>
        <T v="caption" color="muted">
          Every price includes GST. A pantry car may not charge more than this, and must show the rate list.
        </T>
        <T v="caption" color="muted">
          Only the vegetarian dishes are listed.
        </T>
        <T v="caption" color="faint">
          {`Last checked ${FOOD_SOURCE.checked}`}
        </T>
      </Card>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Official PDF"
            icon="file-pdf-box"
            onPress={() => void Linking.openURL(FOOD_SOURCE.pdf)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={Platform.OS === "web" ? "Print the list" : "Save the list"}
            icon="download"
            kind="secondary"
            loading={busy}
            onPress={() => (Platform.OS === "web" ? printWeb() : void save())}
          />
        </View>
      </View>

      <Input value={q} onChangeText={setQ} placeholder="Search a dish or a price" autoCorrect={false} />
      {!!query && (
        <T v="caption" color="muted">
          {`${hits} dishes match`}
        </T>
      )}

      {sections.map((s) => (
        <Section key={s.id} title={s.title}>
          <Card style={{ gap: 12 }}>
            {!!s.note && (
              <T v="caption" color="muted">
                {s.note}
              </T>
            )}
            {s.items.map((i) => (
              <Row key={`${s.id}-${i.name}`} item={i} />
            ))}
          </Card>
        </Section>
      ))}

      {!sections.length && (
        <T v="body" color="muted">
          Nothing on the list matches that.
        </T>
      )}

      <Section title="Overcharging">
        <Card style={{ gap: 10 }}>
          <T v="caption" color="muted">
            {`Paid more than the price above, or no bill given? Complain on Rail Madad ${FOOD_SOURCE.complaint} with the train number and coach.`}
          </T>
          <LinkRow icon="phone" label="Rail Madad 139" sub="Food, cleanliness, staff" onPress={() => void Linking.openURL("tel:139")} />
          <LinkRow icon="web" label="IRCTC menu page" sub={FOOD_SOURCE.url} onPress={() => void Linking.openURL(FOOD_SOURCE.url)} />
        </Card>
      </Section>

      {!!error && (
        <T v="label" color="bad">
          {error}
        </T>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  mark: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center", marginTop: 2 },
  markInner: { width: 8, height: 8, borderWidth: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  markDot: { width: 5, height: 5, position: "absolute" },
});
