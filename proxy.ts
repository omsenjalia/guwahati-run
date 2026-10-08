import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyCookie } from "@/lib/auth";

/**
 * Gatekeeper: everything needs the team passcode cookie, except
 * - the login page and auth API,
 * - the calendar feed (protected by its secret token instead),
 * - PWA files (manifest, icons, service worker).
 * Parents (separate passcode) can only reach /parent.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = await verifyCookie(request.cookies.get(AUTH_COOKIE)?.value);

  const parentArea = pathname === "/parent" || pathname.startsWith("/parent/") || pathname.startsWith("/api/parent");
  if (role === "team" || (role === "parent" && parentArea)) {
    return withNoIndex(NextResponse.next());
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

function withNoIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|robots.txt|login|api/auth|api/calendar).*)",
  ],
};
