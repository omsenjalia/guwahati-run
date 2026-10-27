/**
 * Watchers run after each sync: they turn live data into decisions and
 * alerts. Everything they conclude is stored in app_state so every phone
 * shows the same verdicts, and each alert is sent only once.
 *
 *   connections   buffer for both Delhi connections, green/amber/red, plan B
 *   transfers     metro or cab for each transfer, from the live ETA
 *   deadlines     every backup rule evaluated: "action needed" or "no action"
 *   wake          "Wake up, Delhi in 45 min" from the live ETA
 *   leave IIT     1 Nov: 30 min before and at the "leave IIT by" time
 *   briefing      07:00 IST daily summary during the trip
 *   settle        Splitwise reminder after the trip
 */
import { CONNECTIONS, DEADLINES, EVENT, LEGS, PLACES, REST_PLAN, BOOKING_OWNER, TEAM } from "@/data/trip";
import type { LegLive, LiveState } from "@/lib/live-types";
import { notify, type Alert } from "@/lib/notify";
import { serverDb } from "@/lib/supabase/server";
import { HOUR, MIN, duration, hhmm, istDateKey, ms } from "@/lib/time";
import { evaluate, type Verdict } from "@/lib/deadline-rules";
import { planTransfers, type TransferPlan } from "@/lib/transfer-planner";
import { buildSteps, computeNow, connectionStates, type ConnectionState, type Health } from "@/lib/trip-engine";
import { returnLeaveBy } from "@/lib/phases";

const name = (id: string) => TEAM.find((p) => p.id === id)?.short ?? id;

type Store = {
  connections?: Record<string, ConnectionState>;
  transfers?: Record<string, TransferPlan>;
  deadlines?: Record<string, Verdict>;
  sent?: Record<string, number>;
};


export async function runWatchers(legs: Map<string, LegLive>, now: number) {
  const db = serverDb();
  const keys = ["connections", "transfers", "deadlines", "sent"];
  const { data } = await db.from("app_state").select("key, value").in("key", keys);
  const prev: Store = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const sent = { ...(prev.sent ?? {}) };
  const outbox: Alert[] = [];
  /** Queue an alert once per tag. */
  const once = (tag: string, alert: Omit<Alert, "tag">) => {
    if (sent[tag]) return;
    sent[tag] = now;
    outbox.push({ ...alert, tag });
  };

  const live: LiveState = { legs: Object.fromEntries(legs), state: {} };

  /* ---- connections ---------------------------------------------------- */
  const conns = connectionStates(live);
  for (const c of conns) {
    const before = prev.connections?.[c.id]?.health ?? "green";
    const cfg = CONNECTIONS.find((x) => x.id === c.id)!;
    if (c.outboundDepart > now && rank(c.health) > rank(before)) {
      once(`conn-${c.id}-${c.health}`, {
        kind: "connection",
        title: `${c.label} connection is ${c.health === "red" ? "at risk" : "getting tight"}: ${duration(Math.max(0, c.bufferMin) * MIN)} spare`,
        body: `Plan B (${name(cfg.planB.owner)}): ${cfg.planB.text}`,
        url: "/",
      });
    }
  }

  /* ---- transfers ------------------------------------------------------ */
  const plans = planTransfers(live);
  for (const p of plans) {
    const before = prev.transfers?.[p.legId];
    const soon = p.start - now < 6 * HOUR && p.start > now - HOUR;
    if (soon && before && before.mode !== p.mode) {
      once(`transfer-${p.legId}-${p.mode}-${istDateKey(p.start)}`, {
        kind: "connection",
        title: `Switch to ${p.mode === "cab" ? "a cab" : "the metro"} at ${PLACES[LEGS.find((l) => l.id === p.legId)!.from].short}`,
        body: p.reason,
        url: "/timeline",
      });
    }
  }

  /* ---- deadlines ------------------------------------------------------ */
  const verdicts = Object.fromEntries(DEADLINES.map((d) => [d.id, evaluate(d, live, now)]));
  for (const d of DEADLINES) {
    const v = verdicts[d.id];
    const at = ms(d.at);
    const owner = `${name(d.owner)}${d.owner === BOOKING_OWNER && d.link ? " (ticket booker)" : ""}`;
    if (v.status === "action" && prev.deadlines?.[d.id]?.status !== "action") {
      once(`deadline-action-${d.id}`, {
        kind: "deadline",
        title: `Action needed: ${d.title}`,
        body: `${v.message} Owner: ${owner}.`,
        url: "/",
      });
    }
    if (at > now && at - now <= 2 * HOUR && v.status !== "ok") {
      once(`deadline-2h-${d.id}`, {
        kind: "deadline",
        title: `In ${duration(at - now)}: ${d.title}`,
        body: `${v.message} Owner: ${owner}.`,
        url: "/",
      });
    }
  }

  /* ---- wake-up -------------------------------------------------------- */
  const steps = buildSteps(live);
  for (const s of steps) {
    if (s.kind !== "train" || !s.leg) continue;
    const lead = 45 * MIN;
    if (now >= s.end - lead && now < s.end - 5 * MIN) {
      const berths = live.legs[s.leg.id]?.berths ?? s.leg.berths;
      const coach = berths?.length ? ` Coach ${[...new Set(berths.map((b) => b.coach))].join(", ")}.` : "";
      once(`wake-${s.leg.id}-${istDateKey(s.leg.arrive)}`, {
        kind: "wake",
        title: `Wake up: ${PLACES[s.leg.to].short} in ${duration(s.end - now)}`,
        body: `Arriving ${hhmm(s.end)}.${coach} Pack up and check under the berths.`,
        url: "/",
      });
    }
  }

  /* ---- leave IIT for the train home (1 Nov) ---------------------------- */
  const back = returnLeaveBy(live);
  for (const lead of [30 * MIN, 0]) {
    const at = back.leaveIit - lead;
    if (now >= at && now < at + 20 * MIN) {
      once(`leave-iit-${lead ? "30" : "now"}`, {
        kind: "wake",
        title: lead ? `Leave IIT in 30 min (by ${hhmm(back.leaveIit)})` : `Leave IIT now for the ${hhmm(back.depart)} train`,
        body: `Be on the Kamakhya platform by ${hhmm(back.atStation)}. Leave Kamakhya Temple by ${hhmm(back.leaveTemple)}.`,
        url: "/",
      });
    }
  }

  /* ---- hackathon rest rotation ---------------------------------------- */
  for (const slot of REST_PLAN) {
    const start = ms(slot.start);
    if (now >= start - 5 * MIN && now < start + 15 * MIN) {
      const awake = TEAM.filter((p) => !slot.resting.includes(p.id)).map((p) => p.short);
      once(`rest-${slot.start}`, {
        kind: "rest",
        title: `Rest time: ${slot.resting.map(name).join(" and ")}`,
        body: `Sleep until ${hhmm(ms(slot.end))}. ${awake.join(" and ")} keep building.`,
        url: "/hackathon",
      });
    }
  }

  /* ---- morning briefing ---------------------------------------------- */
  const tripStart = ms("2026-10-27T00:00:00+05:30");
  const tripEnd = ms("2026-11-04T23:59:00+05:30");
  const istMin = Math.floor(((now + 5.5 * HOUR) % (24 * HOUR)) / MIN);
  let briefing: { at: number; title: string; body: string } | undefined;
  if (now >= tripStart && now <= tripEnd && istMin >= 7 * 60 && istMin < 7 * 60 + 30) {
    briefing = buildBriefing(live, now, verdicts);
    once(`briefing-${istDateKey(now)}`, { kind: "briefing", title: briefing.title, body: briefing.body, url: "/" });
  }

  /* ---- settle up ------------------------------------------------------ */
  if (now >= ms("2026-11-04T10:00:00+05:30") && now < ms("2026-11-07T00:00:00+05:30")) {
    once("settle-up", {
      kind: "settle",
      title: "Home safe? Settle up in Splitwise",
      body: "Check balances and settle up while it's fresh.",
      url: "/money",
    });
  }

  /* ---- save + send ---------------------------------------------------- */
  const rows = [
    { key: "connections", value: Object.fromEntries(conns.map((c) => [c.id, c])) },
    { key: "transfers", value: Object.fromEntries(plans.map((p) => [p.legId, p])) },
    { key: "deadlines", value: verdicts },
    { key: "sent", value: sent },
    ...(briefing ? [{ key: "briefing", value: briefing }] : []),
  ].map((r) => ({ ...r, updated_at: new Date(now).toISOString() }));
  const { error } = await db.from("app_state").upsert(rows);
  if (error) throw new Error(error.message);
  for (const a of outbox) await notify(a);

  const actions = Object.values(verdicts).filter((v) => v.status === "action").length;
  return {
    ok: true,
    message: `connections ${conns.map((c) => c.health).join("/")}, ${actions} action${actions === 1 ? "" : "s"} needed, ${outbox.length} alert${outbox.length === 1 ? "" : "s"} sent`,
  };
}

const rank = (h: Health) => (h === "red" ? 2 : h === "amber" ? 1 : 0);

/* ------------------------------------------------------------ briefing */

function buildBriefing(live: LiveState, now: number, verdicts: Record<string, Verdict>) {
  const today = istDateKey(now);
  const steps = buildSteps(live).filter((s) => !s.minor && istDateKey(s.start) === today);
  const state = computeNow(buildSteps(live), now);
  const actions = DEADLINES.filter((d) => verdicts[d.id]?.status === "action").map((d) => d.title);
  const event = now >= ms(EVENT.start) - 24 * HOUR && now <= ms(EVENT.end) ? ` ${EVENT.name} today.` : "";
  const lines = [
    steps.length ? `Today: ${steps.map((s) => `${hhmm(s.start)} ${s.title}`).join(", ")}.` : "No travel today.",
    state.focus ? `Now: ${state.instruction}` : "",
    actions.length ? `Action needed: ${actions.join("; ")}.` : "",
  ].filter(Boolean);
  return { at: now, title: `Good morning.${event}`.trim(), body: lines.join(" ") };
}
