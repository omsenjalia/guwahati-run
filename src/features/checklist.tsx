import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { TEAM, type PersonId } from "@/data/trip";
import { useAuth } from "@/core/auth";
import { useNow } from "@/core/data";
import { db, useRows } from "@/core/db";
import { dayMonth, istDateKey } from "@/lib/time";
import { Card, Check, confirm, IconButton, Input, Section } from "@/ui/kit";
import { T } from "@/ui/text";
import { useTheme } from "@/ui/theme";

/**
 * A checklist shared by all 4 phones (packing_items rows with one owner:
 * "team", "prep", "grant", "demo" or a person), live and offline.
 * The prep list has deadlines and per-person items (a tick for each of us).
 */
export type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  done_by: string | null;
  sort: number;
  due?: string | null;
  per_person?: boolean;
  done_people?: string[];
};

const BASE = "id, label, done, done_by, sort";
const cols = (owner: string) => (owner === "prep" ? `${BASE}, due, per_person, done_people` : BASE);
const EVERYONE = TEAM.map((p) => p.id);
const short = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

export function useChecklist(owner: string) {
  const { rows, error, setRows } = useRows<CheckItem>("packing_items", () => db.from("packing_items").select(cols(owner)).eq("owner", owner), `checklist-${owner}`);
  const items = rows ? [...rows].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.sort - b.sort) : null;
  const patch = (id: string, p: Partial<CheckItem>) => setRows((cur) => cur?.map((i) => (i.id === id ? { ...i, ...p } : i)) ?? cur);
  const update = (id: string, p: Partial<CheckItem>) => db.from("packing_items").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id);

  return {
    items,
    error,
    async toggle(item: CheckItem, by: PersonId) {
      const p = { done: !item.done, done_by: item.done ? null : by };
      patch(item.id, p);
      await update(item.id, p);
    },
    /** Per-person item: tick or untick one person; done once all 4 have. */
    async togglePerson(item: CheckItem, person: PersonId) {
      const had = item.done_people ?? [];
      const done_people = had.includes(person) ? had.filter((x) => x !== person) : [...had, person];
      const done = EVERYONE.every((x) => done_people.includes(x));
      const p = { done_people, done, done_by: done ? person : null };
      patch(item.id, p);
      await update(item.id, p);
    },
    async add(label: string) {
      const sort = (rows?.reduce((m, i) => Math.max(m, i.sort), 0) ?? 0) + 1;
      const { data, error } = await db.from("packing_items").insert({ owner, label, sort }).select(cols(owner)).single();
      if (error) throw new Error(error.message);
      setRows((cur) => [...(cur ?? []), data as unknown as CheckItem]);
    },
    async remove(item: CheckItem) {
      setRows((cur) => cur?.filter((i) => i.id !== item.id) ?? cur);
      await db.from("packing_items").delete().eq("id", item.id);
    },
  };
}

/** Progress like "12/20": a per-person item counts once per person. */
export function progress(items: CheckItem[]) {
  let total = 0;
  let done = 0;
  for (const i of items) {
    if (i.per_person) {
      total += EVERYONE.length;
      done += EVERYONE.filter((p) => i.done_people?.includes(p)).length;
    } else {
      total += 1;
      if (i.done) done += 1;
    }
  }
  return { total, done };
}

/** The list with ticks, add and delete (team only: parents have no database session). */
export function Checklist({ owner, title, hint }: { owner: string; title: string; hint?: string }) {
  const c = useTheme();
  const me = useAuth().session!.person;
  const now = useNow();
  const list = useChecklist(owner);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const today = istDateKey(now);
  const p = list.items ? progress(list.items) : null;

  async function add() {
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    await list.add(label).catch((e) => {
      setDraft(label);
      setError(e instanceof Error ? e.message : String(e));
    });
  }

  return (
    <Section title={p ? `${title} · ${p.done}/${p.total}` : title}>
      <Card style={{ gap: 6 }}>
        {!!hint && (
          <T v="caption" color="muted">
            {hint}
          </T>
        )}
        {!list.items && <T v="caption">{list.error || "Loading"}</T>}
        {list.items?.map((item) => {
          const overdue = !item.done && !!item.due && item.due < today;
          const sub = [item.due ? `${overdue ? "Overdue, was due" : "By"} ${dayMonth(`${item.due}T12:00:00+05:30`)}` : "", item.done && item.done_by ? `by ${short(item.done_by)}` : ""]
            .filter(Boolean)
            .join(" · ");
          return (
            <View key={item.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ flex: 1 }}>
                  {item.per_person ? (
                    <View style={{ minHeight: 44, justifyContent: "center" }}>
                      <T v="body" color={item.done ? "muted" : "text"}>
                        {item.label}
                      </T>
                      {!!sub && (
                        <T v="caption" color={overdue ? "bad" : "faint"}>
                          {sub}
                        </T>
                      )}
                    </View>
                  ) : (
                    <Check label={item.label} sub={sub} on={item.done} onPress={() => void list.toggle(item, me)} />
                  )}
                </View>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel={`Delete ${item.label}`}
                  onPress={async () => (await confirm("Delete this item?", item.label, "Delete")) && void list.remove(item)}
                >
                  <MaterialCommunityIcons name="close" size={18} color={c.faint} />
                </Pressable>
              </View>
              {item.per_person && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {TEAM.map((person) => {
                    const on = item.done_people?.includes(person.id) ?? false;
                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => void list.togglePerson(item, person.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${person.short}: ${item.label}`}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 12,
                          height: 34,
                          borderRadius: 17,
                          borderWidth: 1,
                          borderColor: on ? c.good : person.id === me ? c.primary : c.border,
                          backgroundColor: on ? c.goodSoft : "transparent",
                        }}
                      >
                        {on && <MaterialCommunityIcons name="check" size={14} color={c.good} />}
                        <T v="label" color={on ? "good" : "muted"}>
                          {person.short}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Add an item" onSubmitEditing={() => void add()} returnKeyType="done" />
          </View>
          <IconButton icon="plus" label="Add item" onPress={() => void add()} />
        </View>
        {!!error && (
          <T v="caption" color="bad">
            {error}
          </T>
        )}
      </Card>
    </Section>
  );
}
