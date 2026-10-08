"use client";

import { useEffect, useState } from "react";
import { BellRinging, BellSlash } from "@phosphor-icons/react";
import { Panel, PanelTitle } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/lib/me";
import {
  ALERT_KINDS,
  currentSubscription,
  disablePush,
  enablePush,
  needsInstallForPush,
  pushSupported,
  readMuted,
  updateMuted,
} from "@/lib/push-client";

type Status = "loading" | "unsupported" | "install" | "off" | "on";

/** Turn alerts on for this phone, and mute categories. */
export function AlertsPanel() {
  const me = useMe();
  const [status, setStatus] = useState<Status>("loading");
  const [muted, setMuted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const next: { status: Status; muted: string[] } = { status: "off", muted: readMuted() };
      if (!pushSupported()) next.status = needsInstallForPush() ? "install" : "unsupported";
      else if (needsInstallForPush()) next.status = "install";
      else if ((await currentSubscription()) && Notification.permission === "granted") next.status = "on";
      if (alive) {
        setStatus(next.status);
        setMuted(next.muted);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      await enablePush(me);
      setStatus("on");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    await disablePush().catch(() => {});
    setStatus("off");
    setBusy(false);
  }

  async function toggle(kind: string, on: boolean) {
    const next = on ? muted.filter((m) => m !== kind) : [...muted, kind];
    setMuted(next);
    await updateMuted(me, next).catch(() => {});
  }

  return (
    <Panel>
      <PanelTitle aside={status === "on" ? <BellRinging className="size-5 text-ok" /> : <BellSlash className="size-5 text-subtle" />}>
        Alerts on this phone
      </PanelTitle>

      {status === "install" && (
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          On iPhone, alerts only work from the home screen app. In Safari tap Share, then Add to Home Screen, open it
          from there and come back here.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          This browser can&apos;t receive alerts. Use Chrome on Android, or the home screen app on iPhone.
        </p>
      )}
      {status === "off" && (
        <>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            Get PNR changes, chart results, connection warnings, deadlines and wake-up calls, even when the app is closed.
          </p>
          <Button onClick={turnOn} disabled={busy} size="lg" className="mt-4 w-full">
            <BellRinging className="size-5" />
            {busy ? "Turning on" : "Turn on alerts"}
          </Button>
        </>
      )}
      {status === "on" && (
        <>
          <ul className="flex flex-col">
            {ALERT_KINDS.map((k) => {
              const on = !muted.includes(k.id);
              return (
                <li key={k.id}>
                  <label className="flex min-h-12 items-center justify-between gap-3">
                    <span className="text-[0.95rem]">{k.label}</span>
                    <Switch checked={on} onCheckedChange={(v) => toggle(k.id, v)} aria-label={k.label} />
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={turnOff} disabled={busy} className="mt-2 text-sm text-subtle underline-offset-4 hover:underline">
            Turn off alerts on this phone
          </button>
        </>
      )}
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </Panel>
  );
}
