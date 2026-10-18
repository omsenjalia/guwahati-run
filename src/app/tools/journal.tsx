import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, Share, View } from "react-native";
import { TEAM } from "@/data/trip";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { useNow } from "@/core/data";
import { db, ensureDb } from "@/core/db";
import { useLoad } from "@/core/use-load";
import { newId, prepare, type Picked } from "@/features/upload";
import { linkedinPost, xPost, type Entry } from "@/lib/post";
import { istDateKey, weekdayDate } from "@/lib/time";
import { Button, Card, Chips, confirm, Empty, Input, Section } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";
import { radius, useTheme } from "@/ui/theme";

type Journal = { entries: Entry[]; urls: Record<string, string> };
const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

/** Notes and photos per day, shared with parents (read only); the team also writes the recap post from it. */
export default function JournalScreen() {
  const team = useAuth().session?.role === "team";
  const { data, error, reload } = useLoad(() => api<Journal>("/api/journal"));
  const days = new Map<string, Entry[]>();
  for (const e of data?.entries ?? []) days.set(e.day, [...(days.get(e.day) ?? []), e]);

  return (
    <Page title="Journal" subtitle={team ? "Ends up in the recap post" : "From the team"}>
      {team && <Composer onAdded={() => void reload()} />}
      {!data && (
        <T v="caption" color={error ? "bad" : "muted"}>
          {error || "Loading"}
        </T>
      )}
      {data && !data.entries.length && <Empty icon="notebook-outline" title="Nothing yet" body={team ? "Add a photo or a line about today." : "The team's notes and photos show up here."} />}
      {[...days].map(([day, list]) => (
        <Section key={day} title={weekdayDate(`${day}T12:00:00+05:30`)}>
          <Card style={{ gap: 16 }}>
            {list.map((e) => (
              <EntryView key={e.id} e={e} url={e.photo_path ? data!.urls[e.photo_path] : undefined} team={team} onDeleted={() => void reload()} />
            ))}
          </Card>
        </Section>
      ))}
      {team && data && <PostCard entries={data.entries} />}
    </Page>
  );
}

function EntryView({ e, url, team, onDeleted }: { e: Entry; url?: string; team: boolean; onDeleted: () => void }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {url && (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: c.surface2 }}
          resizeMode="cover"
          accessibilityLabel={e.body ?? `Photo by ${short(e.author)}`}
        />
      )}
      {!!e.body && <T v="body">{e.body}</T>}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T v="caption" color="faint">
          {short(e.author)}
        </T>
        {team && (
          <Pressable
            hitSlop={8}
            accessibilityLabel="Delete entry"
            onPress={async () => {
              if (!(await confirm("Delete this entry?", "It's removed for everyone.", "Delete"))) return;
              await ensureDb();
              if (e.photo_path) await db.storage.from("trip-files").remove([e.photo_path]);
              await db.from("journal_entries").delete().eq("id", e.id);
              onDeleted();
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={c.faint} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Composer({ onAdded }: { onAdded: () => void }) {
  const me = useAuth().session!.person;
  const now = useNow();
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(camera: boolean) {
    setError("");
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return setError("Camera permission is needed.");
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled) setPhoto({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? "image/jpeg" });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await ensureDb();
      const day = istDateKey(now);
      let photo_path: string | null = null;
      if (photo) {
        // Shrunk to a JPEG under 2 MB; re-encoding drops the location data.
        const { data, mime } = await prepare(photo);
        photo_path = `journal/${day}/${newId()}.jpg`;
        const up = await db.storage.from("trip-files").upload(photo_path, data, { contentType: mime });
        if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);
      }
      const { error } = await db.from("journal_entries").insert({ day, author: me, body: body.trim() || null, photo_path });
      if (error) throw new Error(error.message);
      setBody("");
      setPhoto(null);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Input label="Today, in a line or two" multiline value={body} onChangeText={setBody} style={{ minHeight: 80 }} />
      {photo && <Image source={{ uri: photo.uri }} style={{ width: "100%", height: 180, borderRadius: radius.md }} resizeMode="cover" accessibilityLabel="Chosen photo" />}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Camera" icon="camera-outline" kind="secondary" style={{ flex: 1 }} onPress={() => void pick(true)} />
        <Button label={photo ? "Change" : "Photo"} icon="image-outline" kind="secondary" style={{ flex: 1 }} onPress={() => void pick(false)} />
      </View>
      <Button label="Add to journal" icon="plus" loading={busy} disabled={!body.trim() && !photo} onPress={() => void save()} />
      {!!error && (
        <T v="caption" color="bad">
          {error}
        </T>
      )}
    </Card>
  );
}

/** LinkedIn or X post built from the trip's numbers and the journal; edit, then share. */
function PostCard({ entries }: { entries: Entry[] }) {
  const [kind, setKind] = useState<"linkedin" | "x">("linkedin");
  const [drafts, setDrafts] = useState<Partial<Record<"linkedin" | "x", string>>>({});
  const text = drafts[kind] ?? (kind === "linkedin" ? linkedinPost(entries) : xPost(entries));
  return (
    <Section title="Write the post">
      <Card style={{ gap: 10 }}>
        <Chips
          options={[
            { value: "linkedin", label: "LinkedIn" },
            { value: "x", label: "X" },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Input multiline value={text} onChangeText={(v) => setDrafts((d) => ({ ...d, [kind]: v }))} style={{ minHeight: 260 }} />
        <T v="caption" color={kind === "x" && text.length > 280 ? "bad" : "faint"}>
          {text.length} characters{kind === "x" && text.length > 280 ? " (over 280 for X)" : ""}
        </T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {drafts[kind] !== undefined && <Button label="Reset" kind="secondary" style={{ flex: 1 }} onPress={() => setDrafts((d) => ({ ...d, [kind]: undefined }))} />}
          <Button label="Share" icon="share-variant-outline" style={{ flex: 1 }} onPress={() => void Share.share({ message: text })} />
        </View>
      </Card>
    </Section>
  );
}
