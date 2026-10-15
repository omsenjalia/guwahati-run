"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/clock";
import { ago, hhmm } from "@/lib/time";
import type { Health } from "@/lib/trip-engine";

/* ---------------------------------------------------------------- panel */

export function Panel({ className, children, ...rest }: React.ComponentProps<"section">) {
  return (
    <section className={cn("panel rounded-2xl bg-card p-5", className)} {...rest}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

/* --------------------------------------------------------------- status */

const HEALTH_STYLE: Record<Health, string> = {
  green: "bg-ok-soft text-ok",
  amber: "bg-warn-soft text-warn",
  red: "bg-bad-soft text-bad",
};

const HEALTH_WORD: Record<Health, string> = {
  green: "On track",
  amber: "Watch",
  red: "Act now",
};

export function StatusPill({
  health,
  children,
  className,
}: {
  health: Health;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[0.8rem] font-semibold",
        HEALTH_STYLE[health],
        className,
      )}
    >
      {children ?? HEALTH_WORD[health]}
    </span>
  );
}

export const healthText: Record<Health, string> = {
  green: "text-ok",
  amber: "text-warn",
  red: "text-bad",
};

/* ------------------------------------------------------------- online */

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/* ---------------------------------------------------------- live stamp */

/**
 * Freshness line shown on every live card.
 * - live + online: "Updated 2 min ago"
 * - offline: "Offline. Showing data from 14:05"
 * - stale (all sources failed): "Stale since 14:05. Retrying"
 * - no live data yet: the fallback text (e.g. "As booked")
 */
export function LiveStamp({
  updatedAt,
  stale,
  fallback = "As booked",
  className,
}: {
  updatedAt?: number;
  stale?: boolean;
  fallback?: string;
  className?: string;
}) {
  const now = useNow();
  const online = useOnline();
  let text = fallback;
  let tone = "text-subtle";
  if (updatedAt && now) {
    if (!online) {
      text = `Offline. Showing data from ${hhmm(updatedAt)}`;
      tone = "text-warn";
    } else if (stale) {
      text = `Stale since ${hhmm(updatedAt)}. Retrying`;
      tone = "text-warn";
    } else {
      text = `Updated ${ago(updatedAt, now)}`;
    }
  } else if (!online) {
    text = `Offline. ${fallback}`;
  }
  return <p className={cn("text-xs", tone, className)}>{text}</p>;
}

/* ---------------------------------------------------------- copy text */

export function CopyChip({ value, label, className }: { value: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success(`${label ?? "Copied"}: ${value}`);
        } catch {
          toast.error("Could not copy. Long-press to select instead.");
        }
      }}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-lg bg-secondary px-3 tabular text-[0.95rem] tracking-wide transition active:scale-[0.98]",
        className,
      )}
      aria-label={`Copy ${label ?? ""} ${value}`}
    >
      {value}
      <Copy className="size-4 text-muted-foreground" />
    </button>
  );
}

/* ------------------------------------------------------------ skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} />;
}
