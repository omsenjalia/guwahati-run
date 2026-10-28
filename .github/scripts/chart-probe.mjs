// Temporary: reads IRCTC's public reservation-chart JSON API for 19031 / 28 Oct 2026.
const BASE = "https://www.irctc.co.in";
const H = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  Origin: BASE,
  Referer: BASE + "/online-charts/",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
};

async function post(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  return { status: r.status, text };
}

const parse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const TRAIN = "19031";
const JOURNEY = "2026-10-28";
const BOARD = "SBIB";

const comp = await post("/online-charts/api/trainComposition", {
  trainNo: TRAIN,
  jDate: JOURNEY,
  boardingStation: BOARD,
});
console.log("COMP_STATUS", comp.status);
console.log("COMP_BODY", comp.text.slice(0, 8000));
const c = parse(comp.text);

const base = {
  trainNo: TRAIN,
  boardingStation: BOARD,
  remoteStation: c?.remote ?? BOARD,
  trainSourceStation: c?.from ?? BOARD,
  jDate: c?.trainStartDate ?? JOURNEY,
};
console.log("BASE", JSON.stringify(base));

for (const chartType of [1, 2]) {
  const v = await post("/online-charts/api/vacantBerth", { ...base, cls: "SL", chartType });
  console.log(`VACANT chart=${chartType} status=${v.status}`);
  console.log("VACANT_BODY", v.text.slice(0, 30000));
}

const cc = await post("/online-charts/api/coachComposition", { ...base, coach: "S5", cls: "SL" });
console.log("COACH_S5_STATUS", cc.status);
console.log("COACH_S5_BODY", cc.text.slice(0, 60000));
