import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Gatekeeper for the API the app talks to. Everything needs an attendee's
 * bearer token, except
 * - sign-in (/api/auth),
 * - the calendar feed (its own secret token) and the cron tick (CRON_SECRET),
 * - /api/parent/*, which parents may reach too.
 * CORS is open (no cookies are used), so the web build of the app works.
 */
const PUBLIC = ["/api/auth", "/api/calendar", "/api/jobs"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.method === "OPTIONS") return cors(new NextResponse(null, { status: 204 }));
  if (PUBLIC.some((p) => pathname.startsWith(p))) return cors(NextResponse.next());

  const s = await verifyToken(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (s?.role === "team" || (s?.role === "parent" && pathname.startsWith("/api/parent"))) return cors(NextResponse.next());
  return cors(NextResponse.json({ error: "Sign in required" }, { status: 401 }));
}

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/api/:path*"] };
