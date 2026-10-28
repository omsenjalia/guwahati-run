/**
 * Chat store for the assistant tab, in the app's tiny-store style.
 *
 * The phone only renders and requests: POST /api/chat with the sign-in token
 * (core/api.ts), and the server holds the Groq key, the collected trip data
 * and the tools. Pure helpers (wire shape, markdown, suggestions) live in
 * lib/chat-format.ts so the tests never load React Native; they are
 * re-exported here for the chat screen.
 */
import type { PersonId } from "@/data/trip";
import { buildChatPayload, type ChatMeta, type ChatResponse } from "@/lib/chat-format";
import { api } from "@/core/api";
import { currentSession } from "@/core/auth";
import { clockOffset } from "@/core/data";
import { cacheGet, cacheSet } from "@/core/storage";
import { createStore, useStore } from "@/core/store";
import { activeLang } from "@/i18n";

export { HISTORY_TURNS, metaLabel, parseMarkdown, suggestionsFor } from "@/lib/chat-format";
export type { Block, ChatMeta, ChatResponse, Span } from "@/lib/chat-format";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  meta?: ChatMeta;
};

export type ChatStatus = { configured: boolean; model: string | null };

const MAX_SAVED = 50;

let seq = 0;
const nextId = () => `c${Date.now()}-${seq++}`;

type Chat = {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  /** Person the saved conversation belongs to (one per sign-in). */
  owner: PersonId | null;
  loaded: boolean;
};

const store = createStore<Chat>({ messages: [], sending: false, error: null, owner: null, loaded: false });

export const useChat = () => useStore(store);

const keyFor = (person: PersonId) => `gr-chat-v1-${person}`;

function persist() {
  const { owner, messages } = store.get();
  if (owner) void cacheSet(keyFor(owner), messages.slice(-MAX_SAVED));
}

/** Loads this person's saved conversation once (call when the tab opens). */
export async function loadChat() {
  const session = currentSession();
  if (!session) return;
  const { owner, loaded } = store.get();
  if (loaded && owner === session.person) return;
  const saved = await cacheGet<ChatMessage[]>(keyFor(session.person));
  store.set({ messages: Array.isArray(saved) ? saved : [], sending: false, error: null, owner: session.person, loaded: true });
}

export function clearChat() {
  store.set((c) => ({ ...c, messages: [], error: null }));
  persist();
}

/** Whether the server has the AI switched on (a Groq key), for the tab's note. */
export const fetchChatStatus = () => api<ChatStatus>("/api/chat");

export async function sendChat(text: string) {
  const clean = text.trim();
  if (!clean || store.get().sending) return;
  await loadChat();
  const user: ChatMessage = { id: nextId(), role: "user", content: clean, at: Date.now() };
  const before = store.get().messages;
  store.set((c) => ({ ...c, messages: [...c.messages, user], sending: true, error: null }));
  persist();
  try {
    const res = await api<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(buildChatPayload(before, clean, activeLang(), Date.now() + clockOffset)),
    });
    const assistant: ChatMessage = { id: nextId(), role: "assistant", content: res.response, at: Date.now(), meta: res.meta };
    store.set((c) => ({ ...c, messages: [...c.messages, assistant], sending: false }));
  } catch (e) {
    store.set((c) => ({ ...c, sending: false, error: e instanceof Error ? e.message : String(e) }));
  }
  persist();
}

/** Re-asks the last user message after a failed send. */
export async function retryChat() {
  const last = [...store.get().messages].reverse().find((m) => m.role === "user");
  if (!last || store.get().sending) return;
  store.set((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== last.id) }));
  await sendChat(last.content);
}
