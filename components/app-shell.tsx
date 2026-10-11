"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Lightning,
  Path,
  Ticket,
  Wallet,
  UsersThree,
  CodeBlock,
  WifiSlash,
  ClockCounterClockwise,
  Warning,
  HandCoins,
} from "@phosphor-icons/react";
import { Toaster } from "@/components/ui/sonner";
import { useOnline } from "@/components/bits";
import { useIsSimulated, useNow } from "@/lib/clock";
import { isHackathonMode } from "@/lib/trip-engine";
import { startSync } from "@/lib/sync";
import { startUploads } from "@/lib/receipts";
import { ago, stamp } from "@/lib/time";
import { useLive } from "@/lib/live-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  useServiceWorker();
  useEffect(() => {
    startSync();
    startUploads();
  }, []);
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      <StatusBar />
      <main className="flex-1 px-4 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
}

/* ---------------------------------------------------------- status bar */

function StatusBar() {
  const online = useOnline();
  const simulated = useIsSimulated();
  const now = useNow();
  const live = useLive();
  const beat = live.state.heartbeat as { at: number; lastOkAt: number | null; failing: string[] } | undefined;
  // Real time on purpose: a simulated clock must not fake an outage.
  const stalled = online && beat && !simulated && now && now - Math.max(beat.at, beat.lastOkAt ?? 0) > 20 * 60_000;
  const failing = online && beat && !stalled && beat.failing.length > 0 && now && now - (beat.lastOkAt ?? 0) > 30 * 60_000;
  return (
    <header className="sticky top-0 z-20 bg-background/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md">
      <div className="flex h-8 items-center justify-between gap-3">
        <span className="text-[0.95rem] font-semibold tracking-tight">Guwahati Run</span>
        <div className="flex items-center gap-2">
          {simulated && now && (
            <a
              href="?at=off"
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent px-2.5 text-xs font-medium text-accent-foreground"
            >
              <ClockCounterClockwise className="size-3.5" />
              {stamp(now)}
            </a>
          )}
          <Link
            href="/sos"
            aria-label="SOS and emergency help"
            className="inline-flex h-7 items-center rounded-full bg-bad px-2.5 text-xs font-bold tracking-wide text-background"
          >
            SOS
          </Link>
          {!online && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-warn-soft px-2.5 text-xs font-medium text-warn">
              <WifiSlash className="size-3.5" />
              Offline
            </span>
          )}
        </div>
      </div>
      {(stalled || failing) && beat && (
        <Link
          href="/admin"
          className="mt-2 flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad"
        >
          <Warning className="size-4 shrink-0" weight="bold" />
          {stalled
            ? `Automatic updates stopped ${ago(beat.at, now!)}. Data may be old.`
            : `Live updates failing (${beat.failing.join(", ")}). Showing last known data.`}
        </Link>
      )}
    </header>
  );
}

/* ---------------------------------------------------------- bottom nav */

function BottomNav() {
  const pathname = usePathname();
  const now = useNow();
  const hack = now !== null && isHackathonMode(now);
  const items = [
    { href: "/", label: "Now", Icon: Lightning },
    hack
      ? { href: "/hackathon", label: "Hackathon", Icon: CodeBlock }
      : { href: "/timeline", label: "Timeline", Icon: Path },
    { href: "/tickets", label: "Tickets", Icon: Ticket },
    { href: "/money", label: "Money", Icon: Wallet },
    { href: "/grant", label: "Grant", Icon: HandCoins },
    { href: "/team", label: "Team", Icon: UsersThree },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-6">
        {items.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-medium tracking-tight transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------ service worker */

function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Refresh the full offline copy (all screens) at most every 6 hours.
        const last = Number(localStorage.getItem("gr-precache") ?? 0);
        if (Date.now() - last > 6 * 3600_000) {
          reg.active?.postMessage("precache");
          localStorage.setItem("gr-precache", String(Date.now()));
        }
      })
      .catch(() => {});
  }, []);
}
