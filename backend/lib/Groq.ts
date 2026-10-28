/**
 * Minimal Groq client (OpenAI-compatible chat completions over plain fetch,
 * no new dependency), mirroring how lib/providers talk to ConfirmTkt.
 *
 * The key lives ONLY on the server: `GROQ_API_KEY` in Vercel (see SETUP.md),
 * the same rule WeatherGPT follows. The app never sees it; it calls
 * /api/chat with its normal sign-in token.
 *
 * Model: `GROQ_MODEL`, defaulting to the one WeatherGPT uses
 * (openai/gpt-oss-120b). Set GROQ_MODEL=llama-3.3-70b-versatile for a
 * faster/cheaper alternative with tool calling.
 */

export type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

export type GroqTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export const GroqConfigured = () => {
  const key = process.env.GROQ_API_KEY?.trim();
  return !!key && !key.startsWith("your_");
};

export const GroqModel = () => process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

/** One chat-completions round; returns the assistant message (may carry tool_calls). */
export async function GroqChat(messages: GroqMessage[], tools: GroqTool[], timeoutMs = 30_000): Promise<GroqMessage> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY is not set on the server");
  const res = await fetch("https://api.Groq.com/openapi/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GroqModel(),
      messages,
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
      temperature: 0.3,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  const json = (await res.json()) as { choices?: { message?: GroqMessage }[] };
  const message = json.choices?.[0]?.message;
  if (!message) throw new Error("Groq returned no message");
  return message;
}
