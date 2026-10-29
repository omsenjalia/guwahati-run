import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { GRANT } from "@/data/trip";
import { api } from "@/core/api";
import { useFeed } from "@/core/data";
import { cacheGet, cacheSet } from "@/core/storage";
import { useLoad } from "@/core/use-load";
import { Hero } from "@/features/bits";
import { Checklist } from "@/features/checklist";
import { useDocs } from "@/features/docs";
import { shareTextFile } from "@/features/share-file";
import { grantEstimate } from "@/lib/grant";
import { claimDocuments } from "@/lib/grant-documents";
import { defaultSummary, reportCsv, reportRows } from "@/lib/report-data";
import { Button, Card, Input, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { font, useTheme } from "@/ui/theme";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const SUMMARY_KEY = "gr-report-summary";

/** BVM SSIP grant: what we can claim, the documents the college wants, and the final report. */
export default function Grant() {
  const c = useTheme();
  const feed = useFeed();
  const { rows: docs } = useDocs();
  const rows = reportRows(feed.expenses, docs);
  const g = grantEstimate(rows);
  const claim = claimDocuments(docs ?? [], feed.expenses);

  return (
    <Page title="Grant" subtitle="Built from our tickets and the bills in Money">
      <Hero>
        <T v="overline" color="rgba(255,255,255,0.7)">
          Expected grant per student
        </T>
        <T v="display" color="#FFFFFF" num>
          {rupees(g.grant)}
        </T>
        <T v="label" color="rgba(255,255,255,0.8)">
          {g.capped
            ? `Capped at the ${rupees(GRANT.capPerStudent)} limit. Eligible costs are ${rupees(g.eligible)}.`
            : `Under the ${rupees(GRANT.capPerStudent)} limit by ${rupees(GRANT.capPerStudent - g.eligible)}.`}
        </T>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          {[
            ["Spent", g.spent],
            ["Grant", g.grant],
            ["Not covered", g.own],
          ].map(([label, v]) => (
            <View key={label as string}>
              <T v="caption" color="rgba(255,255,255,0.7)">
                {label}
              </T>
              <T v="heading" color="#FFFFFF" num>
                {rupees(v as number)}
              </T>
            </View>
          ))}
        </View>
        <T v="caption" color="rgba(255,255,255,0.7)">
          Team of 4: {rupees(g.team.grant)} grant out of {rupees(g.team.spent)} spent.
        </T>
      </Hero>

      <Section title="What we can claim, per student">
        <Card style={{ gap: 12 }}>
          {g.lines.map((l) => (
            <View key={l.key} style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T v="label">{l.label}</T>
                {(l.note || !l.hasBill) && (
                  <T v="caption" color="muted">
                    {[l.note, l.hasBill ? undefined : "no bill yet"].filter(Boolean).join(" · ")}
                  </T>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T v="label" num style={{ fontFamily: font.bold }}>
                  {rupees(l.claim)}
                </T>
                {l.claim < l.paid - 0.5 && (
                  <T v="caption" color="faint" num style={{ textDecorationLine: "line-through" }}>
                    {rupees(l.paid)}
                  </T>
                )}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: c.border, paddingTop: 10 }}>
            <T v="label" color="muted">
              Eligible total
            </T>
            <T v="label" num style={{ fontFamily: font.bold }}>
              {rupees(g.eligible)}
            </T>
          </View>
          <T v="caption" color="faint">
            Meals on the journey count with the fares. Not covered: local travel under 25 km from BVM, and stay.
          </T>
        </Card>
      </Section>

      {g.capped && (
        <Card style={{ gap: 6, borderColor: c.primary, borderWidth: 1 }}>
          <T v="heading">Worth asking</T>
          <T v="body" color="muted">
            Our costs exceed the {rupees(GRANT.capPerStudent)} cap. The policy lets the institution give more for larger events, case by case (up to{" "}
            {rupees(GRANT.maxPerEventCaseByCase)} per event). A national hackathon final at an IIT is a fair case: ask the SSIP coordinator, with this breakdown.
          </T>
        </Card>
      )}

      <Section title={`Documents for the claim · ${claim.filter((d) => d.have).length}/${claim.length}`}>
        <Card style={{ gap: 10 }}>
          {claim.map((d) => (
            <View key={d.id} style={{ flexDirection: "row", gap: 10 }}>
              <MaterialCommunityIcons name={d.have ? "check-circle" : "circle-outline"} size={20} color={d.have ? c.good : c.warn} />
              <View style={{ flex: 1 }}>
                <T v="label" color={d.have ? "muted" : "text"}>
                  {d.label}
                </T>
                <T v="caption" color="muted">
                  {d.detail}
                </T>
              </View>
            </View>
          ))}
          <T v="caption" color="faint">
            Ticks itself when you upload in Money. Every file here goes into the final report.
          </T>
        </Card>
      </Section>

      <ReportCard rows={rows} />
      <Checklist owner="grant" title="Also for the claim" />
      <T v="caption" color="faint">
        {GRANT.policy}
      </T>
    </Page>
  );
}

/** The final report PDF for the college (download also saves a copy in GitHub), and the expense table for Excel. */
function ReportCard({ rows }: { rows: ReturnType<typeof reportRows> }) {
  const saved = useLoad(() => cacheGet<string>(SUMMARY_KEY));
  const [draft, setDraft] = useState<string | null>(null);
  const summary = draft ?? saved.data ?? defaultSummary();
  const [busy, setBusy] = useState<"" | "preview" | "download">("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const withRef = rows.filter((r) => r.ref).length;

  function edit(v: string) {
    setDraft(v);
    void cacheSet(SUMMARY_KEY, v);
  }

  async function make(mode: "preview" | "download") {
    setBusy(mode);
    setNote(null);
    try {
      const r = await api<{ url: string }>("/api/report", { method: "POST", body: JSON.stringify({ mode, summary }) });
      await WebBrowser.openBrowserAsync(r.url);
      if (mode === "download") setNote({ ok: true, text: "Report ready. A copy is saved in GitHub (documents/reports)." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy("");
    }
  }

  return (
    <Section title="Final report for the college">
      <Card style={{ gap: 12 }}>
        <T v="body" color="muted">
          Cover, trip summary, every expense with receipt numbers, requested vs spent, and every receipt attached. A4, prints well in black and white.
        </T>
        <T v="label" color={withRef < rows.length ? "warn" : "good"}>
          {rows.length} items, {withRef} with a receipt.{withRef < rows.length ? " Add the missing bills in Money first." : ""}
        </T>
        <Input label="Trip summary (page 2)" multiline value={summary} onChangeText={edit} style={{ minHeight: 160 }} />
        <Button label="Reset to the automatic text" kind="ghost" onPress={() => edit(defaultSummary())} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Preview" icon="eye-outline" kind="secondary" style={{ flex: 1 }} loading={busy === "preview"} disabled={!!busy} onPress={() => void make("preview")} />
          <Button label="Download" icon="file-pdf-box" style={{ flex: 1 }} loading={busy === "download"} disabled={!!busy} onPress={() => void make("download")} />
        </View>
        <Button
          label="Expense table for Excel"
          icon="microsoft-excel"
          kind="ghost"
          onPress={() => void shareTextFile("WhyCode4U_Travel_Report.csv", reportCsv(rows), "text/csv").catch((e) => setNote({ ok: false, text: String(e) }))}
        />
        {!!note && (
          <T v="label" color={note.ok ? "good" : "bad"}>
            {note.text}
          </T>
        )}
      </Card>
    </Section>
  );
}
