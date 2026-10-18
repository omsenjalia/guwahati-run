/**
 * ConfirmTkt (ixigo group). Unofficial: these are the JSON endpoints its own
 * website calls. No API key. They can change without notice, which is why
 * every call goes through the failover in ./index.ts.
 */
import type { Availability, LiveRunningStatus, PnrStatus, Provider, StationStatus } from "./types.ts";
import { ProviderError } from "./types.ts";

const NAME = "ConfirmTkt";
const API = "https://api.confirmtkt.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
  Accept: "application/json",
  Origin: "https://www.confirmtkt.com",
  Referer: "https://www.confirmtkt.com/",
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new ProviderError(NAME, `HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError(NAME, "response was not JSON (site may have changed)");
  }
}

/** "84% Chance" -> 84 */
const chance = (s?: string | null) => {
  const m = s?.match(/(\d{1,3})\s*%/);
  return m ? Number(m[1]) : undefined;
};

/** "PQWL  23" -> "PQWL 23" */
const tidy = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

/* ----------------------------------------------------------------- PNR */

type CtPnr = {
  Pnr: string;
  TrainNo: string;
  TrainName?: string;
  Doj?: string;
  From?: string;
  To?: string;
  Class?: string;
  ChartPrepared?: boolean;
  TrainCancelledFlag?: boolean;
  ExpectedPlatformNo?: string;
  CoachPosition?: string;
  Error?: string | null;
  ErrorCode?: number;
  PassengerStatus?: {
    Number: number;
    BookingStatus: string;
    CurrentStatus: string;
    Prediction?: string | null;
    PredictionPercentage?: number | null;
    CurrentCoachId?: string | null;
    CurrentBerthNo?: string | null;
    CurrentBerthCode?: string | null;
  }[];
};

async function getPnrStatus(pnr: string): Promise<PnrStatus> {
  const url = new URL(`${API}/api/pnr/statusnewvilkki/${pnr}`);
  url.searchParams.set("email", "");
  url.searchParams.set("querysource", "");
  url.searchParams.set("locale", "en");
  url.searchParams.set("getHighChanceText", "true");
  const j = await getJson<CtPnr>(url.toString());
  if (j.Error) throw new ProviderError(NAME, j.Error);
  if (!j.PassengerStatus?.length) throw new ProviderError(NAME, "no passengers in response");
  return {
    pnr: j.Pnr,
    trainNo: j.TrainNo,
    trainName: j.TrainName,
    journeyDate: j.Doj,
    from: j.From,
    to: j.To,
    travelClass: j.Class,
    chartPrepared: !!j.ChartPrepared,
    trainCancelled: !!j.TrainCancelledFlag,
    expectedPlatform: j.ExpectedPlatformNo && j.ExpectedPlatformNo !== "0" ? j.ExpectedPlatformNo : undefined,
    coachPosition: j.CoachPosition || undefined,
    passengers: j.PassengerStatus.map((p) => {
      const berth = Number(p.CurrentBerthNo);
      return {
        number: p.Number,
        booking: tidy(p.BookingStatus),
        current: tidy(p.CurrentStatus),
        coach: p.CurrentCoachId || undefined,
        berth: berth > 0 ? berth : undefined,
        berthCode: p.CurrentBerthCode || undefined,
        confirmChance: p.PredictionPercentage ?? chance(p.Prediction),
      };
    }),
  };
}

/* ---------------------------------------------------------- live status */

type CtLive = {
  trainDataFound?: string | null;
  trainNo?: string;
  departed?: boolean;
  terminated?: boolean;
  curStn?: string;
  curStnName?: string;
  lastUpdated?: string;
  totalLateMins?: number;
  Error?: string | null;
  stations?: {
    stnCode: string;
    stnCodeName: string;
    schArrTime?: string;
    schDepTime?: string;
    schDayCnt: number;
    actArr?: string;
    actDep?: string;
    actArrDate?: string;
    actDepDate?: string;
    delayArr?: number;
    delayDep?: number;
    pfNo?: number;
    travelled?: boolean;
  }[];
};

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const toDmy = (ymd: string) => ymd.split("-").reverse().join("-");
/** ("2026-10-08T00:00:00.0000000", "09:57") -> "2026-10-08T09:57:00+05:30" */
const isoIst = (datePart: string | undefined, hhmm: string | undefined) =>
  datePart && hhmm && /^\d{2}:\d{2}$/.test(hhmm) ? `${datePart.slice(0, 10)}T${hhmm}:00+05:30` : undefined;

async function fetchLive(trainNo: string, startDate: string) {
  const url = `${API}/api/trains/livestatusall?trainno=${trainNo}&doj=${toDmy(startDate)}&getNames=true`;
  return getJson<CtLive>(url);
}

async function getLiveRunningStatus(trainNo: string, boardDate: string, boardStation: string): Promise<LiveRunningStatus> {
  // The API is keyed by the date the train left its origin. Our boarding
  // station may be on day 2+ of the run, so work out the real start date.
  let startDate = boardDate;
  let j = await fetchLive(trainNo, startDate);
  const at = j.stations?.find((s) => s.stnCode === boardStation);
  if (at && at.schDayCnt > 1) {
    startDate = addDays(boardDate, -(at.schDayCnt - 1));
    j = await fetchLive(trainNo, startDate);
  }
  if (j.Error) throw new ProviderError(NAME, j.Error);

  const stations: StationStatus[] = (j.stations ?? []).map((s) => {
    const schDate = addDays(startDate, s.schDayCnt - 1);
    const pf = s.pfNo && s.pfNo > 0 ? String(s.pfNo) : undefined;
    return {
      code: s.stnCode,
      name: s.stnCodeName,
      schArr: isoIst(schDate, s.schArrTime),
      schDep: isoIst(schDate, s.schDepTime),
      expArr: isoIst(s.actArrDate, s.actArr),
      expDep: isoIst(s.actDepDate, s.actDep),
      delayArrMin: s.delayArr,
      delayDepMin: s.delayDep,
      platform: pf,
      passed: !!s.travelled,
      dayCount: s.schDayCnt,
    };
  });

  return {
    trainNo,
    startDate,
    found: j.trainDataFound === "trainRunningDataFound" && stations.length > 0,
    departed: !!j.departed,
    terminated: !!j.terminated,
    currentStation: j.curStn ? { code: j.curStn, name: j.curStnName ?? j.curStn } : undefined,
    delayMin: j.totalLateMins,
    providerUpdatedAt: j.lastUpdated?.split(",")[0]?.trim(),
    stations,
  };
}

/* --------------------------------------------------------- availability */

type CtAvail = Record<
  string,
  { Doj: string; TravelClass: string; CurrentStatus: string; Prediction?: string; PredictionPercentage?: number | null; ConfirmTktStatus?: string; Error?: string | null }
>[];

async function getAvailability(q: { trainNo: string; from: string; to: string; date: string; travelClass: string; quota: string }): Promise<Availability[]> {
  const url = new URL(`${API}/api/trains/${q.trainNo}/monthlyavailability`);
  url.searchParams.set("source", q.from);
  url.searchParams.set("destination", q.to);
  url.searchParams.set("doj", q.date);
  url.searchParams.set("travelclasses", q.travelClass);
  url.searchParams.set("quota", q.quota);
  url.searchParams.set("enableTG", "false");
  url.searchParams.set("tGPlan", "");
  url.searchParams.set("showTGPrediction", "false");
  const j = await getJson<CtAvail>(url.toString());
  if (!Array.isArray(j)) throw new ProviderError(NAME, "unexpected availability format");
  return j.flatMap((day) =>
    Object.values(day)
      .filter((d) => d && !d.Error)
      .map((d) => ({
        date: d.Doj.slice(0, 10),
        travelClass: d.TravelClass,
        status: tidy(d.CurrentStatus),
        confirmChance: d.PredictionPercentage ?? chance(d.Prediction),
        verdict: d.ConfirmTktStatus,
      })),
  );
}

export const confirmtkt: Provider = {
  name: NAME,
  getPnrStatus,
  getLiveRunningStatus,
  getAvailability,
};
