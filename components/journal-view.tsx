"use client";

import { useState } from "react";
import { Camera, Copy, ShareNetwork, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { personName } from "@/components/leg-bits";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/clock";
import { useMe } from "@/lib/me";
import { linkedinPost, xPost } from "@/lib/post";
import { istDateKey, weekdayDate } from "@/lib/time";
import { addEntry, deleteEntry, useJournal, type Entry } from "@/lib/use-journal";
import { cn } from "@/lib/utils";

export function JournalView() {
  const now = useNow();
  const { entries, urls } = useJournal();
  if (now === null) return <Skeleton className="h-96" />;
  const days = new Map<string, Entry[]>();
  for (const e of entries ?? []) days.set(e.day, [...(days.get(e.day) ?? []), e]);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
      <Composer today={istDateKey(now)} />

      {!entries ? (
        <Skeleton className="h-48" />
      ) : entries.length === 0 ? (
        <Panel className="border-dashed bg-transparent">
          <p className="text-[0.95rem] text-muted-foreground">Nothing yet. Add a photo or a line about today: it all ends up in the recap.</p>
        </Panel>
      ) : (
        [...days.entries()].map(([day, list]) => (
          <Panel key={day} className="p-0">
            <h2 className="px-4 pt-4 text-[0.95rem] font-semibold">{weekdayDate(`${day}T12:00:00+05:30`)}</h2>
            <ul className="mt-2 flex flex-col">
              {list.map((e) => (
                <li key={e.id} className="border-t px-4 py-3 first:border-t-0">
                  {e.photo_path &&
                    (urls[e.photo_path] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- private signed URLs, no optimisation needed
                      <img src={urls[e.photo_path]} alt={e.body ?? `Photo by ${personName(e.author)}`} className="mb-2 w-full rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <Skeleton className="mb-2 h-48 rounded-lg" />
                    ))}
                  {e.body && <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap">{e.body}</p>}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-subtle">{personName(e.author)}</span>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={async () => {
                        if (window.confirm("Delete this entry for everyone?")) await deleteEntry(e);
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-subtle active:bg-secondary"
                    >
                      <Trash className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      {entries && <PostPanel entries={entries} />}
    </div>
  );
}

function Composer({ today }: { today: string }) {
  const me = useMe();
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) {
      toast.error("Pick whose phone this is in the Team tab first.");
      return;
    }
    if (!body.trim() && !photo) return;
    setBusy(true);
    try {
      await addEntry({ day: today, author: me, body: body.trim(), photo });
      setBody("");
      setPhoto(null);
      toast.success("Added to the journal");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <form onSubmit={save} className="flex flex-col gap-3">
        <label htmlFor="journal-body" className="text-sm font-medium">
          Today, in a line or two
        </label>
        <textarea
          id="journal-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm">
            <Camera className="size-5" />
            <span className="truncate">{photo ? photo.name : "Add photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          <Button type="submit" size="lg" disabled={busy || (!body.trim() && !photo)}>
            {busy ? "Saving" : "Add"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PostPanel({ entries }: { entries: Entry[] }) {
  const [kind, setKind] = useState<"linkedin" | "x">("linkedin");
  const text = kind === "linkedin" ? linkedinPost(entries) : xPost(entries);
  return (
    <Panel>
      <PanelTitle>Write the post</PanelTitle>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(["linkedin", "x"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn("h-10 rounded-lg text-sm font-medium", kind === k ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {k === "linkedin" ? "LinkedIn" : "X"}
          </button>
        ))}
      </div>
      <pre className="mt-3 max-h-80 overflow-y-auto rounded-lg bg-secondary p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
      <p className="mt-1 text-xs text-subtle">
        {text.length} characters. Built from the trip and your journal: edit it before posting.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            toast.success("Copied");
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary font-medium active:scale-[0.98]"
        >
          <Copy className="size-5" /> Copy
        </button>
        <button
          type="button"
          onClick={() => navigator.share?.({ text }).catch(() => {})}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground active:scale-[0.98]"
        >
          <ShareNetwork className="size-5" /> Share
        </button>
      </div>
    </Panel>
  );
}
