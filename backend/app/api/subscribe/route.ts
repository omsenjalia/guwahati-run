/** The calendar feed's address (it has its own secret), for "Add to calendar". Team only (proxy.ts). */
export async function GET(request: Request) {
  const token = process.env.CALENDAR_TOKEN;
  if (!token) return Response.json({ error: "CALENDAR_TOKEN isn't set on the server" }, { status: 501 });
  const { host, origin } = new URL(request.url);
  return Response.json({ webcal: `webcal://${host}/api/calendar/${token}`, https: `${origin}/api/calendar/${token}` });
}
