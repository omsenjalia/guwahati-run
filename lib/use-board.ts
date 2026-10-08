"use client";

import { useEffect, useState } from "react";
import { idbGet, idbSet } from "@/lib/offline/idb";
import { browserDb, channelName } from "@/lib/supabase/browser";
import { ensureSession } from "@/lib/sync";

/** Hackathon kanban, shared live across phones (board_cards table). */

export type CardStatus = "todo" | "doing" | "done";
export type Card = { id: string; title: string; status: CardStatus; assignee: string | null; sort: number };

const KEY = "board";

export function useBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let alive = true;
    const sb = browserDb();
    idbGet<Card[]>(KEY).then((saved) => alive && saved && setCards((c) => c ?? saved));
    const load = async () => {
      if (!(await ensureSession())) return;
      const { data } = await sb.from("board_cards").select("id, title, status, assignee, sort").order("sort");
      if (!alive || !data) return;
      setCards(data as Card[]);
      void idbSet(KEY, data);
    };
    void load();
    const ch = sb
      .channel(channelName("board"))
      .on("postgres_changes", { event: "*", schema: "public", table: "board_cards" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(ch);
    };
  }, []);

  async function add(title: string, assignee: string | null) {
    const sort = (cards?.reduce((m, c) => Math.max(m, c.sort), 0) ?? 0) + 1;
    const { data, error } = await browserDb()
      .from("board_cards")
      .insert({ title, assignee, sort, status: "todo" })
      .select("id, title, status, assignee, sort")
      .single();
    if (error) throw new Error(error.message);
    setCards((c) => [...(c ?? []), data as Card]);
  }

  async function move(card: Card, status: CardStatus) {
    setCards((c) => c?.map((x) => (x.id === card.id ? { ...x, status } : x)) ?? c);
    await browserDb().from("board_cards").update({ status, updated_at: new Date().toISOString() }).eq("id", card.id);
  }

  async function remove(card: Card) {
    setCards((c) => c?.filter((x) => x.id !== card.id) ?? c);
    await browserDb().from("board_cards").delete().eq("id", card.id);
  }

  return { cards, add, move, remove };
}
