"use client";

/** Turning alerts on/off on this phone. */

export const ALERT_KINDS = [
  { id: "pnr", label: "PNR status changes" },
  { id: "chart", label: "Chart prepared" },
  { id: "connection", label: "Connection at risk" },
  { id: "deadline", label: "Deadlines and actions" },
  { id: "wake", label: "Wake-up before arrival" },
  { id: "briefing", label: "07:00 morning briefing" },
  { id: "settle", label: "Settle up reminder" },
] as const;

const MUTED_KEY = "gr-muted";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhones only allow push for apps added to the home screen. */
export function needsInstallForPush() {
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  return ios && !standalone;
}

export function readMuted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MUTED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

async function registration() {
  // In development the worker runs in "push only" mode (no caching).
  const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
  await navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription, person: string | null, muted: string[], test: boolean) {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), person, muted, test }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save");
}

export async function enablePush(person: string | null) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in the phone's settings for this app.");
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));
  await save(sub, person, readMuted(), true);
  return sub;
}

export async function updateMuted(person: string | null, muted: string[]) {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
  } catch {}
  const sub = await currentSubscription();
  if (sub) await save(sub, person, muted, false);
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
