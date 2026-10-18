import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { BACKUPS, LEGS, type LegId } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { refresh, useFeed } from "@/core/data";
import { db, ensureDb } from "@/core/db";
import { deleteDoc, editDoc, useDocs } from "@/features/docs";
import { newId, uploadBill, type Picked } from "@/features/upload";
import type { DocKind } from "@/lib/documents";
import { CATEGORIES, type Expense, type ExpenseCategory } from "@/lib/expenses";
import { istDateKey } from "@/lib/time";
import { Button, Card, Chips, confirm, Input } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { radius, useTheme } from "@/ui/theme";

type Kind = Exclude<DocKind, "report">;
const KINDS = [
  { value: "receipt", label: "Bill" },
  { value: "ticket", label: "Ticket" },
  { value: "document", label: "Document" },
  { value: "certificate", label: "Certificate" },
] as const;
const TRAINS = [...LEGS.filter((l) => l.train), ...BACKUPS];
/** Paperwork the college asks for (the report checklist looks for these names). */
const DOC_NAMES = ["Invitation letter", "Event schedule"];

/**
 * Add a bill (photo or PDF + what it was for), an e-ticket, a document or a
 * certificate; all go to the private GitHub folder and into the college
 * report. With ?expense=<id> it edits that expense instead (and can attach
 * another bill, or delete it).
 */
export default function AddBill() {
  const params = useLocalSearchParams<{ kind?: Kind; expense?: string }>();
  const feed = useFeed();
  const editing = feed.expenses.find((e) => e.id === params.expense);
  if (params.expense && !editing) {
    return (
      <Page title="Edit bill">
        <T v="body" color="muted">
          Loading
        </T>
      </Page>
    );
  }
  return <Form key={editing?.id ?? "new"} editing={editing} initialKind={params.kind} />;
}

function Form({ editing, initialKind }: { editing?: Expense; initialKind?: Kind }) {
  const c = useTheme();
  const { session } = useAuth();
  const { rows: docs } = useDocs();
  const bills = editing ? (docs ?? []).filter((d) => d.kind === "receipt" && d.expense_id === editing.id) : [];
  const [kind, setKind] = useState<Kind>(initialKind ?? "receipt");
  const [file, setFile] = useState<Picked | null>(null);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? "food");
  const [date, setDate] = useState(() => editing?.spent_on ?? istDateKey(Date.now()));
  const [note, setNote] = useState(editing?.note ?? "");
  const [legId, setLegId] = useState<LegId>(TRAINS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(source: "camera" | "library" | "pdf") {
    setError("");
    if (source === "pdf") {
      const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (!r.canceled) setFile({ uri: r.assets[0].uri, mime: "application/pdf", name: r.assets[0].name, size: r.assets[0].size });
      return;
    }
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError("Camera permission is needed to take a photo.");
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
    const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled) setFile({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? "image/jpeg", name: r.assets[0].fileName ?? undefined });
  }

  const value = Number(amount.replace(/[^\d.]/g, ""));
  const receipt = kind === "receipt";
  const ready = receipt ? title.trim().length > 1 && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && (!!file || !!editing) : !!file;
  const me = session?.person;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      void refresh();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if (!receipt) {
        const leg = TRAINS.find((l) => l.id === legId)!;
        const name = title.trim() || (kind === "ticket" ? `${leg.train!.number} ${leg.train!.name}` : kind === "document" ? "Document" : "Certificate");
        return uploadBill(file!, { id: newId(), kind, title: name, leg_id: kind === "ticket" ? legId : null, created_by: me });
      }
      const fields = { title: title.trim(), amount: Math.round(value * 100) / 100, category, spent_on: date, note: note.trim() || null };
      if (!editing) return uploadBill(file!, { id: newId(), kind: "receipt", title: fields.title, created_by: me, expense: fields });
      // Editing: through the bill when there is one (renames the file in GitHub to match).
      if (bills.length) await editDoc(bills[0].id, fields);
      else {
        await ensureDb();
        const { error } = await db.from("expenses").update(fields).eq("id", editing.id);
        if (error) throw new Error(error.message);
      }
      if (file) await uploadBill(file, { id: newId(), kind: "receipt", title: fields.title, attach_to: editing.id, created_by: me });
    });

  const remove = async () => {
    const what = bills.length ? ` and its ${bills.length > 1 ? `${bills.length} bills` : "bill"} (from GitHub too)` : "";
    if (!(await confirm(`Delete "${editing!.title}"?`, `Removes it${what} for everyone.`, "Delete"))) return;
    await run(async () => {
      // Deleting the last bill removes the expense with it.
      for (const d of bills) await deleteDoc(d.id);
      if (!bills.length) {
        await ensureDb();
        const { error } = await db.from("expenses").delete().eq("id", editing!.id);
        if (error) throw new Error(error.message);
      }
    });
  };

  return (
    <Page title={editing ? "Edit bill" : receipt ? "Add a bill" : `Add a ${kind}`}>
      {!editing && <Chips options={KINDS} value={kind} onChange={setKind} />}

      {file ? (
        <Card style={{ gap: 12 }}>
          {file.mime === "application/pdf" ? (
            <View style={[styles.pdf, { backgroundColor: c.surface2 }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={40} color={c.bad} />
              <T v="label" numberOfLines={1} style={{ flex: 1 }}>
                {file.name ?? "PDF"}
              </T>
            </View>
          ) : (
            <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" accessibilityLabel="Bill photo" />
          )}
          <Button label="Change" icon="swap-horizontal" kind="secondary" onPress={() => setFile(null)} />
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {editing && (
            <T v="label" color="muted">
              {bills.length ? `${bills.length} bill${bills.length > 1 ? "s" : ""} attached. Add another (e.g. the payment screenshot):` : "No bill yet. Add one for the college report:"}
            </T>
          )}
          <View style={styles.pickRow}>
            <PickTile icon="camera-outline" label="Camera" onPress={() => void pick("camera")} />
            <PickTile icon="image-outline" label="Photos" onPress={() => void pick("library")} />
            <PickTile icon="file-pdf-box" label="PDF" onPress={() => void pick("pdf")} />
          </View>
        </View>
      )}

      {kind === "ticket" && (
        <View style={{ gap: 8 }}>
          <T v="label" color="muted">
            Which train
          </T>
          <Chips options={TRAINS.map((l) => ({ value: l.id, label: `${l.train!.number}${l.backupFor ? " (backup)" : ""}` }))} value={legId} onChange={setLegId} />
          <T v="caption" color="faint">
            {TRAINS.find((l) => l.id === legId)?.train?.name}
          </T>
        </View>
      )}

      {(kind === "document" || kind === "certificate") && (
        <View style={{ gap: 8 }}>
          {kind === "document" && <Chips options={DOC_NAMES.map((n) => ({ value: n, label: n }))} value={title} onChange={setTitle} />}
          <Input label="Name" value={title} onChangeText={setTitle} placeholder={kind === "document" ? "e.g. Invitation letter" : "e.g. Finalist certificate"} />
        </View>
      )}

      {receipt && (
        <>
          <Input label="What was it for?" value={title} onChangeText={setTitle} placeholder="e.g. Dinner at Delhi Jn" />
          <Input label="Amount (₹)" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
          <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-29" />
          <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Kamakhya to IIT" />
          <View style={{ gap: 8 }}>
            <T v="label" color="muted">
              Category
            </T>
            <Chips options={CATEGORIES.map((x) => ({ value: x.id, label: x.label }))} value={category} onChange={setCategory} />
            {CATEGORIES.find((x) => x.id === category)?.grant && (
              <T v="caption" color="good">
                Counts for the college grant. Add the bill.
              </T>
            )}
          </View>
        </>
      )}

      {!!error && (
        <T v="label" color="bad">
          {error}
        </T>
      )}
      <Button label={editing ? "Save changes" : "Save"} icon="cloud-upload-outline" onPress={() => void save()} loading={busy} disabled={!ready} />
      {editing && <Button label="Delete" icon="trash-can-outline" kind="danger" disabled={busy} onPress={() => void remove()} />}
      <T v="caption" color="faint" center>
        Photos are shrunk and their location data removed before upload. Saved to the team&apos;s private GitHub folder.
      </T>
    </Page>
  );
}

function PickTile({ icon, label, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.tile, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={24} color={c.primary} />
      </View>
      <T v="label">{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pickRow: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 18, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  preview: { width: "100%", height: 220, borderRadius: radius.md },
  pdf: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md },
});
