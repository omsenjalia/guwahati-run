import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/core/auth";
import { refresh } from "@/core/data";
import { newId, uploadBill, type Picked } from "@/features/upload";
import { CATEGORIES, type ExpenseCategory } from "@/lib/expenses";
import { istDateKey } from "@/lib/time";
import { Button, Card, IconButton } from "@/ui/kit";
import { T } from "@/ui/text";
import { font, radius, useTheme } from "@/ui/theme";

/** Add a bill: photo or PDF + what it was for. Goes into the college report automatically. */
export default function AddBill() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [file, setFile] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(() => istDateKey(Date.now()));
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
  const ready = !!file && title.trim().length > 1 && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  async function save() {
    if (!file || !ready) return;
    setBusy(true);
    setError("");
    try {
      await uploadBill(file, {
        id: newId(),
        kind: "receipt",
        title: title.trim(),
        created_by: session?.person,
        expense: { title: title.trim(), amount: value, category, spent_on: date, note: null },
      });
      void refresh();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <T v="title" style={{ flex: 1 }}>
            Add a bill
          </T>
          <IconButton icon="close" label="Close" onPress={() => router.back()} />
        </View>

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
          <View style={styles.pickRow}>
            <PickTile icon="camera-outline" label="Camera" onPress={() => void pick("camera")} />
            <PickTile icon="image-outline" label="Photos" onPress={() => void pick("library")} />
            <PickTile icon="file-pdf-box" label="PDF" onPress={() => void pick("pdf")} />
          </View>
        )}

        <Field label="What was it for?" value={title} onChange={setTitle} placeholder="e.g. Dinner at Delhi Jn" />
        <Field label="Amount (₹)" value={amount} onChange={setAmount} placeholder="0" keyboard="decimal-pad" />
        <Field label="Date (YYYY-MM-DD)" value={date} onChange={setDate} placeholder="2026-10-29" />

        <View style={{ gap: 8 }}>
          <T v="label" color="muted">
            Category
          </T>
          <View style={styles.cats}>
            {CATEGORIES.map((cat) => {
              const on = cat.id === category;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.cat, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}
                >
                  <T v="label" color={on ? c.onPrimary : "text"}>
                    {cat.label}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!!error && (
          <T v="label" color="bad">
            {error}
          </T>
        )}
        <Button label="Save bill" icon="cloud-upload-outline" onPress={() => void save()} loading={busy} disabled={!ready} />
        <T v="caption" color="faint" center>
          Photos are shrunk and their location data removed before upload.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
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

function Field({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: "decimal-pad" }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T v="label" color="muted">
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        keyboardType={keyboard}
        accessibilityLabel={label}
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16, maxWidth: 720, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "center" },
  pickRow: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 18, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  preview: { width: "100%", height: 220, borderRadius: radius.md },
  pdf: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 16 },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
