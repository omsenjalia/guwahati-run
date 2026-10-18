import { login, signSession } from "@/lib/auth";

/** App sign-in: { role: "team" | "parent", person, password } -> bearer token. */
export async function POST(request: Request) {
  const { role, person, password } = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;
  const session = login(role ?? "", person ?? "", password ?? "");
  if (!session) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: role === "parent" ? "Wrong parent passcode" : "Wrong password" }, { status: 401 });
  }
  return Response.json({ ...session, token: await signSession(session) }, { headers: { "Cache-Control": "no-store" } });
}
