import { useState } from "react";
import { api } from "@/core/api";
import { useAuth } from "@/core/auth";
import { useLoad } from "@/core/use-load";
import { isDeveloper } from "@/lib/auth";
import { Button, Card, Empty, Input } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

/**
 * Edit the trip plan file (backend/data/trip.ts) from the phone, Om only.
 * The server checks it still works before committing it to GitHub; Vercel
 * then redeploys and phones pick the new plan up on their next refresh.
 */
export default function TripFile() {
  const { session } = useAuth();
  const loaded = useLoad(async () => (isDeveloper(session) ? api<{ text: string; sha: string }>("/api/dev/trip") : null), session ? `${session.role}:${session.person}` : "");
  // The last saved version (from GitHub, or what we just committed) and the edit in progress.
  const [saved, setSaved] = useState<{ text: string; sha: string } | null>(null);
  const [draft, setText] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const file = saved ?? loaded.data;
  const text = draft ?? file?.text ?? "";
  const note = result ?? (loaded.error ? { ok: false, text: loaded.error } : null);

  async function save() {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await api<{ sha: string }>("/api/dev/trip", { method: "PUT", body: JSON.stringify({ text, sha: file.sha, message }) });
      setSaved({ text, sha: r.sha });
      setText(null);
      setMessage("");
      setNote({ ok: true, text: "Saved to GitHub. The server updates in about 2 minutes, then every phone picks up the new plan on its next refresh." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!isDeveloper(session)) {
    return (
      <Page title="Trip plan">
        <Empty icon="lock-outline" title="Only for Om" />
      </Page>
    );
  }
  const changed = !!file && text !== file.text;
  return (
    <Page title="Trip plan" subtitle="backend/data/trip.ts">
      <Card style={{ gap: 8 }}>
        <T v="body" color="muted">
          Change only the values between quotes or the numbers. Keep commas, brackets and quotes as they are. If something breaks, Save refuses and tells you the
          line.
        </T>
      </Card>
      {!file && !note && <T v="caption">Loading from GitHub</T>}
      {file && <Input mono multiline value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} spellCheck={false} style={{ minHeight: 480 }} />}
      {file && <Input label="What did you change? (optional)" value={message} onChangeText={setMessage} placeholder="e.g. New platform for 12506" />}
      {!!note && (
        <T v="label" color={note.ok ? "good" : "bad"}>
          {note.text}
        </T>
      )}
      {file && <Button label="Save to GitHub" icon="cloud-upload-outline" loading={busy} disabled={!changed} onPress={() => void save()} />}
      {file && changed && <Button label="Undo my changes" icon="undo" kind="ghost" disabled={busy} onPress={() => setText(null)} />}
      {!file && !!note && <Button label="Try again" icon="refresh" kind="secondary" onPress={() => void loaded.reload()} />}
    </Page>
  );
}
