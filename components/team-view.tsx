"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BookOpenText, CaretRight, Check, DeviceMobile, MapTrifold, Moon, Phone, Printer, Sun } from "@phosphor-icons/react";
import { TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { AlertsPanel } from "@/components/alerts-panel";
import { ChecklistPanel } from "@/components/checklist-panel";
import { PrepPanel } from "@/components/prep-panel";
import { useNow } from "@/lib/clock";
import { setMe, useMe } from "@/lib/me";
import { telLink } from "@/lib/links";
import { cn } from "@/lib/utils";

const MORE = [
  { href: "/journal", label: "Trip journal and post", Icon: BookOpenText },
  { href: "/guide", label: "Station guides, meals and explore", Icon: MapTrifold },
  { href: "/print", label: "Paper backup (print or PDF)", Icon: Printer },
];

export function TeamView() {
  const me = useMe();
  // Phone-only state (localStorage) renders after mount to avoid hydration mismatches.
  const mounted = useNow() !== null;
  if (!mounted) return <Skeleton className="h-96" />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Team</h1>

      <Panel>
        <PanelTitle>Whose phone is this?</PanelTitle>
        <div className="grid grid-cols-2 gap-2">
          {TEAM.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setMe(p.id)}
              aria-pressed={me === p.id}
              aria-label={p.name}
              className={cn(
                "flex h-12 items-center justify-between rounded-lg border px-4 text-[0.95rem] font-medium transition active:scale-[0.98]",
                me === p.id ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-secondary",
              )}
            >
              {p.name.split(" ")[0]}
              {me === p.id && <Check className="size-4" weight="bold" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">Used to highlight your own berth and alerts.</p>
      </Panel>

      <AlertsPanel />

      <Panel>
        <PanelTitle>Members</PanelTitle>
        <ul className="flex flex-col gap-3">
          {TEAM.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {p.name} <span className="font-normal text-muted-foreground">{p.age}</span>
                </p>
                {p.role && <p className="text-sm text-muted-foreground">{p.role}</p>}
                {p.guardian.phone && (
                  <a href={telLink(p.guardian.phone)} className="text-sm text-primary">
                    {p.guardian.relation || "Guardian"}: {p.guardian.name}
                  </a>
                )}
              </div>
              {p.phone ? (
                <a
                  href={telLink(p.phone)}
                  aria-label={`Call ${p.name}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary active:scale-[0.98]"
                >
                  <Phone className="size-5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelTitle>Useful numbers</PanelTitle>
        <ul className="grid grid-cols-2 gap-2">
          {USEFUL_NUMBERS.map((n) => (
            <li key={n.number}>
              <a
                href={telLink(n.number)}
                className="flex h-full min-h-14 flex-col justify-center rounded-lg bg-secondary px-3 py-2 active:scale-[0.98]"
              >
                <span className="tabular text-lg font-semibold">{n.number}</span>
                <span className="text-xs leading-tight text-muted-foreground">{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <PrepPanel />
      <ChecklistPanel owner="team" title="Team packing" />
      {me && <ChecklistPanel owner={me} title={`${TEAM.find((p) => p.id === me)?.short}'s packing`} />}
      <ThemePanel />
      <Panel className="p-0">
        <ul className="divide-y">
          {MORE.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-5 text-[0.95rem] font-medium transition-colors active:bg-secondary">
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <CaretRight className="size-4 text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Link href="/admin" className="py-3 text-center text-sm text-subtle underline-offset-4 hover:underline">
        System status and data self-test
      </Link>
    </div>
  );
}

type Theme = "system" | "dark" | "light";
const themeListeners = new Set<() => void>();
const readTheme = (): Theme => {
  try {
    return (localStorage.getItem("gr-theme") as Theme) || "system";
  } catch {
    return "system";
  }
};

function ThemePanel() {
  const theme = useSyncExternalStore(
    (cb) => {
      themeListeners.add(cb);
      return () => themeListeners.delete(cb);
    },
    readTheme,
    () => "system" as Theme,
  );
  const set = (t: Theme) => {
    try {
      if (t === "system") localStorage.removeItem("gr-theme");
      else localStorage.setItem("gr-theme", t);
    } catch {}
    document.documentElement.classList.remove("dark", "light");
    if (t !== "system") document.documentElement.classList.add(t);
    themeListeners.forEach((l) => l());
  };
  const opts: { id: Theme; label: string; Icon: typeof Sun }[] = [
    { id: "system", label: "Auto", Icon: DeviceMobile },
    { id: "dark", label: "Dark", Icon: Moon },
    { id: "light", label: "Light", Icon: Sun },
  ];
  return (
    <Panel>
      <PanelTitle>Display</PanelTitle>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {opts.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => set(id)}
            aria-pressed={theme === id}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition",
              theme === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
