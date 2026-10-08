import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, roleForPasscode, signRole } from "@/lib/auth";

export async function POST(request: Request) {
  const { passcode } = (await request.json().catch(() => ({}))) as { passcode?: string };
  const role = roleForPasscode(passcode ?? "");
  if (!role) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const res = NextResponse.json({ role, redirect: role === "parent" ? "/parent" : "/" });
  res.cookies.set(AUTH_COOKIE, await signRole(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
