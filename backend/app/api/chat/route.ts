import { sessionFrom } from "@/lib/auth";
import { chatRateLimited, runChat, type ChatTurn } from "@/lib/chat";
import { GroqConfigured, GroqModel } from "@/lib/Groq";

export const maxDuration = 60;

/**
 * The Chat tab's assistant (team and parents: see proxy.ts; role-safe data
 * comes from lib/chat-context.ts).
 *
 * POST { message, messages?: [{role, content}], language?, now? }
 *   → { response: "<markdown>", meta: { path, intent, model?, toolsUsed, sources } }
 * `response` + additive `meta` mirrors WeatherGPT's /chat contract.
 * GET → { configured, model } so the tab can say whether the AI is switched on.
 */
export async function GET() {
  return Response.json(
    { configured: GroqConfigured(), model: GroqConfigured() ? GroqModel() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const session = await sessionFrom(request);
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    message?: unknown;
    messages?: unknown;
    language?: unknown;
    now?: unknown;
  };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: "Write a message first" }, { status: 400 });
  if (message.length > 2000) return Response.json({ error: "That message is too long (2000 characters max)" }, { status: 400 });

  const now = typeof body.now === "number" && Number.isFinite(body.now) ? body.now : Date.now();
  if (chatRateLimited(session, Date.now())) {
    return Response.json({ error: "Too many messages at once. Give it a minute and try again." }, { status: 429 });
  }

  const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
    .flatMap((m): ChatTurn[] => {
      const t = m as { role?: unknown; content?: unknown };
      return (t.role === "user" || t.role === "assistant") && typeof t.content === "string"
        ? [{ role: t.role, content: t.content }]
        : [];
    })
    .slice(-10);
  const language = typeof body.language === "string" ? body.language.slice(0, 5) : "en";

  try {
    const result = await runChat({ message, history, language, session, now });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
