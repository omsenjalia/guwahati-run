/**
 * Pure chat helpers shared by the phone and the tests (no React Native, no
 * server imports): the /api/chat wire shape, starter questions, the
 * routing-chip label and the small markdown the assistant answers in.
 */

export type ChatMeta = {
  path?: string;
  intent?: string;
  model?: string;
  toolsUsed?: string[];
  sources?: string[];
};

export type ChatResponse = { response: string; meta?: ChatMeta };

/** Turns of history sent with each message (enough for follow-ups, keeps Groq cheap). */
export const HISTORY_TURNS = 10;

/** The wire body for POST /api/chat: the new message plus trimmed history. */
export function buildChatPayload(
  messages: { role: "user" | "assistant"; content: string }[],
  message: string,
  language: string,
  now: number,
) {
  return {
    message,
    messages: messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content })),
    language,
    now,
  };
}

/** Starter questions on the empty tab, per viewer (parents never get ticket/PNR prompts). */
export function suggestionsFor(role: "team" | "parent"): string[] {
  return role === "team"
    ? [
        "What's my next train and seat?",
        "Is my ticket confirmed? Check now",
        "Will we make the Delhi connection?",
        "What's the weather in Guwahati?",
        "What does a veg meal cost on the train?",
        "How much have we spent so far?",
      ]
    : [
        "Where is the team right now?",
        "Is their train on time?",
        "When do they reach Guwahati?",
        "What's the weather in Guwahati?",
        "What is the plan for today?",
      ];
}

/** Short chip under an assistant reply, like WeatherGPT's routing note. */
export function metaLabel(meta?: ChatMeta): string | null {
  if (!meta?.path) return null;
  if (meta.path === "Groq") {
    const tools = meta.toolsUsed?.length ? ` · checked ${meta.toolsUsed.length === 1 ? "1 live source" : `${meta.toolsUsed.length} live sources`}` : "";
    return `AI assistant${meta.model ? ` · ${meta.model}` : ""}${tools}`;
  }
  if (meta.path === "data") return "Answered from collected trip data";
  return null;
}

/* ------------------------------------------------------ markdown (lite) *
 * The assistant answers in a small markdown subset (the server asks for it):
 * **bold**, `code`, [links](url), "- " bullets, "1. " lists, # headings and
 * blank-line paragraphs. parseMarkdown turns that into blocks and spans the
 * chat screen renders with the app's Text; anything fancier degrades to
 * readable plain text.
 */

export type Span = { text: string; bold?: boolean; code?: boolean; href?: string };
export type Block = { type: "p" | "li" | "h"; spans: Span[]; num?: string };

function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:[^)\s]+)\))/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index) });
    if (m[2] !== undefined) spans.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) spans.push({ text: m[3], code: true });
    else spans.push({ text: m[4], href: m[5] });
    last = m.index + m[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  // Lone *emphasis* markers read better without the asterisks.
  return spans.map((s) => (s.bold || s.code || s.href ? s : { ...s, text: s.text.replace(/\*([^*]+)\*/g, "$1") }));
}

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^#{1,4}\s+(.*)$/);
    if (head) {
      blocks.push({ type: "h", spans: parseSpans(head[1]) });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/) ?? line.match(/^(\d+)[.)]\s+(.*)$/);
    if (bullet) {
      const numbered = /^\d+$/.test(bullet[1]) && bullet[2] !== undefined && line.match(/^\d+[.)]/);
      blocks.push({ type: "li", spans: parseSpans(numbered ? bullet[2] : bullet[1]), num: numbered ? bullet[1] : undefined });
      continue;
    }
    blocks.push({ type: "p", spans: parseSpans(line) });
  }
  return blocks;
}
