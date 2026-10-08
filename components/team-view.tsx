"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Phone, Moon, Sun, DeviceMobile } from "@phosphor-icons/react";
import { PACKING_TEAM, PICKUP, TEAM, USEFUL_NUMBERS } from "@/data/trip";
import { Panel, PanelTitle, Skeleton } from "@/components/bits";
import { useNow } from "@/lib/clock";
import { setMe, useMe } from "@/lib/me";
import { telLink } from "@/lib/links";
import { cn } from "@/lib/utils";

export function TeamView() {
  const me = useMe();
  // Phone-only state (localStorage) renders after mount to avoid hydration mismatches.
  const mounted = useNow() !== null;
  if (!mounted) return <Skeleton className="h-96" />;
  return (
    <div className="flex flex-col gap-3">
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
              className={cn(
                "flex h-12 items-center justify-between rounded-lg border px-3 text-[0.95rem] font-medium transition active:scale-[0.98]",
                me === p.id ? "border-primary bg-accent text-accent-foreground" : "bg-secondary",
              )}
            >
              {p.name}
              {me === p.id && <Check className="size-4" weight="bold" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">Used to highlight your own berth and alerts.</p>
      </Panel>

      <Panel>
        <PanelTitle>Members</PanelTitle>
        <ul className="flex flex-col gap-3">
          {TEAM.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {p.name} <span className="font-normal text-muted-foreground">{p.age}</span>
                </p>
                <p className="text-sm text-muted-foreground">{p.role || "Role not set"}</p>
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
              ) : (
                <span className="text-xs text-subtle">No number</span>
              )}
            </li>
          ))}
        </ul>
        {!PICKUP.name && (
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
            Anand pickup on 4 Nov, 01:42 is not arranged yet.
          </p>
        )}
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
                <span className="font-mono text-lg font-semibold tabular">{n.number}</span>
                <span className="text-xs leading-tight text-muted-foreground">{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <PackingPanel />
      <ThemePanel />
    </div>
  );
}

/** Local-only for now; shared syncing arrives with the database. */
function PackingPanel() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("gr-packing") ?? "{}");
    } catch {
      return {};
    }
  });
  const toggle = (item: string) => {
    const next = { ...done, [item]: !done[item] };
    setDone(next);
    try {
      localStorage.setItem("gr-packing", JSON.stringify(next));
    } catch {}
  };
  return (
    <Panel>
      <PanelTitle aside={<span className="text-sm text-muted-foreground">{Object.values(done).filter(Boolean).length}/{PACKING_TEAM.length}</span>}>
        Team packing
      </PanelTitle>
      <ul className="flex flex-col">
        {PACKING_TEAM.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={!!done[item]}
              className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 text-left active:bg-secondary"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                  done[item] ? "border-ok bg-ok text-background" : "border-input",
                )}
              >
                {done[item] && <Check className="size-4" weight="bold" />}
              </span>
              <span className={cn("text-[0.95rem]", done[item] && "text-muted-foreground line-through")}>{item}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
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
      <div className="grid grid-cols-3 gap-2">
        {opts.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => set(id)}
            aria-pressed={theme === id}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium active:scale-[0.98]",
              theme === id ? "border-primary bg-accent text-accent-foreground" : "bg-secondary",
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
