import { api } from "@/core/api";
import { useNow } from "@/core/data";
import { useLoad } from "@/core/use-load";
import { ago, stamp } from "@/lib/time";
import { Card, Empty, InfoRow } from "@/ui/kit";
import { Page } from "@/ui/screen";
import { T } from "@/ui/text";

type Alert = { id: number; kind: string; title: string; body: string | null; at: number };

/** Every alert from the last 3 weeks, newest first (parents see trip alerts only, as on their phone). */
async function loadAlerts() {
  const all: Alert[] = [];
  let query = `since=${Date.now() - 21 * 24 * 3600_000}`;
  // The server pages 50 at a time, oldest first.
  for (let i = 0; i < 20; i++) {
    const r = await api<{ alerts: Alert[]; last: number | null }>(`/api/alerts?${query}`);
    all.push(...r.alerts);
    if (!r.last || r.alerts.length === 0 || `after=${r.last}` === query) break;
    query = `after=${r.last}`;
  }
  return all.reverse();
}

const ICON: Record<string, Parameters<typeof InfoRow>[0]["icon"]> = {
  pnr: "ticket-outline",
  chart: "file-check-outline",
  connection: "transit-connection-variant",
  deadline: "calendar-alert",
  wake: "alarm",
  briefing: "weather-sunset-up",
  rest: "sleep",
  system: "alert-outline",
};

export default function Alerts() {
  const now = useNow();
  const { data, error } = useLoad(loadAlerts);
  return (
    <Page title="Alerts" subtitle="Last 3 weeks">
      {!data && (
        <T v="caption" color={error ? "bad" : "muted"}>
          {error || "Loading"}
        </T>
      )}
      {data && !data.length && <Empty icon="bell-check-outline" title="No alerts" body="PNR changes, chart results, delays and deadlines show up here." />}
      {!!data?.length && (
        <Card style={{ gap: 16 }}>
          {data.map((a) => (
            <InfoRow
              key={a.id}
              icon={ICON[a.kind] ?? "bell-outline"}
              tone={a.kind === "chart" || a.kind === "pnr" ? "primary" : "warn"}
              label={`${stamp(a.at)} · ${ago(a.at, now)}`}
              value={
                <>
                  <T v="label">{a.title}</T>
                  {!!a.body && (
                    <T v="caption" color="muted">
                      {a.body}
                    </T>
                  )}
                </>
              }
            />
          ))}
        </Card>
      )}
    </Page>
  );
}
