/**
 * GUWAHATI RUN - all static trip data lives here.
 *
 * This is the one file a human might ever edit. Everything live (PNR status,
 * delays, platforms, berths after charting) is fetched automatically and
 * layered on top of this at runtime; you never need to type those in.
 *
 * All times are IST and written with an explicit +05:30 offset.
 */

export type PersonId = "heet" | "omk" | "oms" | "sujal";

export type Person = {
  id: PersonId;
  name: string;
  short: string;
  age: number;
  gender: "M" | "F";
  /** Fill in: +91 number, used for SOS and the team screen. */
  phone: string;
  guardian: { name: string; relation: string; phone: string };
  /** e.g. "Tatkal booker", "Chart checker", "Navigator". */
  role: string;
  /** Spelling differences between real name and a ticket, keyed by leg id. */
  ticketNameNotes?: Partial<Record<LegId, string>>;
};

export type PlaceId =
  | "ANND"
  | "ADI"
  | "SBIB"
  | "DLI"
  | "ANVT"
  | "KYQ"
  | "IITG"
  | "DEE"
  | "NZM";

export type Place = {
  id: PlaceId;
  name: string;
  /** Short label for tight UI. */
  short: string;
  city: string;
  /** Indian Railways station code, if a station. */
  code?: string;
  lat: number;
  lon: number;
};

export type LegId = "L0" | "L0b" | "L1" | "L1b" | "L2" | "L2b" | "L3" | "L3b" | "L4";

export type LegKind = "train" | "local-train" | "transfer";

export type Berth = {
  person: PersonId;
  coach: string;
  berth: number;
  type: "Lower" | "Middle" | "Upper" | "Side Lower" | "Side Upper";
};

export type Leg = {
  id: LegId;
  kind: LegKind;
  from: PlaceId;
  to: PlaceId;
  /** Train legs only. */
  train?: { number: string; name: string };
  backupTrain?: { number: string; name: string; depart: string };
  /** For transfers: what we expect; the transfer planner recalculates live. */
  modeHint?: string;
  depart: string;
  arrive: string;
  /** True when times are estimates (transfers). */
  approx?: boolean;
  travelClass?: "SL" | "3A" | "UR";
  pnr?: string;
  /** Exactly as booked, e.g. "PQWL 24-27". */
  bookedStatus?: string;
  /** Per-passenger booked status in booking order. */
  passengers?: { person: PersonId; booked: string }[];
  /** Confirmed berths known at booking. Live chart data overrides this. */
  berths?: Berth[];
  /** Total for 4 passengers, rupees. */
  fareTotal?: number;
  notes?: string[];
};

export type Connection = {
  id: "C1" | "C2";
  label: string;
  inbound: LegId;
  transfer: LegId;
  outbound: LegId;
  /** Planned buffer as stated when booking, minutes. */
  plannedBufferMin: number;
  note: string;
  /** Shown automatically when the connection turns amber or red. */
  planB: { text: string; owner: PersonId; link?: { label: string; href: string } };
};

export type TransferOption = {
  metro?: {
    route: string;
    lines: { name: string; color: string }[];
    interchange?: string;
    minutes: number;
    /** First and last train from our boarding metro station (IST, approx.). */
    firstTrain: string;
    lastTrain: string;
    farePerPerson: number;
  };
  cab: { minutes: number; fareTotal: number; label: string };
  /** Station exit to metro/cab stand, minutes. */
  walkMin: number;
};

export type DeadlineId = "D1" | "D2" | "D3" | "D4" | "D5" | "D6";

export type Deadline = {
  id: DeadlineId;
  at: string;
  title: string;
  /** What the deadline watcher checks, in plain words. */
  condition: string;
  /** What to do if the condition is true. */
  action: string;
  leg: LegId;
  owner: PersonId;
  link?: { label: string; href: string };
};

export type Block = {
  id: string;
  kind: "event" | "stay" | "explore" | "pickup";
  title: string;
  start: string;
  end: string;
  place: PlaceId;
  notes?: string[];
};

/* ---------------------------------------------------------------- team */

export const TEAM: Person[] = [
  {
    id: "heet",
    name: "Heet",
    short: "Heet",
    age: 17,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
  {
    id: "omk",
    name: "Om Kumar",
    short: "Om K",
    age: 18,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
  {
    id: "oms",
    name: "Om Senjalia",
    short: "Om S",
    age: 18,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "Tatkal booker",
    ticketNameNotes: {
      L2: "Spelled SENJALIYA on this ticket. Carry an original photo ID.",
    },
  },
  {
    id: "sujal",
    name: "Sujal",
    short: "Sujal",
    age: 18,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
];

/** Has an Aadhaar-verified IRCTC account. Shown on every Tatkal deadline. */
export const TATKAL_BOOKER: PersonId = "oms";

/* -------------------------------------------------------------- places */
// Coordinates are station entrances (approx.) used for weather, maps and cab links.

export const PLACES: Record<PlaceId, Place> = {
  ANND: { id: "ANND", name: "Anand Junction", short: "Anand", city: "Anand", code: "ANND", lat: 22.5546, lon: 72.9664 },
  ADI: { id: "ADI", name: "Ahmedabad Junction (Kalupur)", short: "Ahmedabad", city: "Ahmedabad", code: "ADI", lat: 23.0264, lon: 72.6009 },
  SBIB: { id: "SBIB", name: "Sabarmati BG", short: "Sabarmati", city: "Ahmedabad", code: "SBIB", lat: 23.0784, lon: 72.5895 },
  DLI: { id: "DLI", name: "Delhi Junction (Old Delhi)", short: "Delhi Jn", city: "Delhi", code: "DLI", lat: 28.6616, lon: 77.2275 },
  ANVT: { id: "ANVT", name: "Anand Vihar Terminal", short: "Anand Vihar", city: "Delhi", code: "ANVT", lat: 28.6502, lon: 77.3152 },
  KYQ: { id: "KYQ", name: "Kamakhya Junction", short: "Kamakhya", city: "Guwahati", code: "KYQ", lat: 26.1578, lon: 91.6935 },
  IITG: { id: "IITG", name: "IIT Guwahati", short: "IIT Guwahati", city: "Guwahati", lat: 26.1878, lon: 91.6916 },
  DEE: { id: "DEE", name: "Delhi Sarai Rohilla", short: "Sarai Rohilla", city: "Delhi", code: "DEE", lat: 28.6631, lon: 77.1867 },
  NZM: { id: "NZM", name: "Hazrat Nizamuddin", short: "Nizamuddin", city: "Delhi", code: "NZM", lat: 28.5887, lon: 77.2539 },
};

/* ---------------------------------------------------------------- event */

export const EVENT = {
  name: "WhyCode4U Hackathon Finals",
  venue: "IIT Guwahati",
  place: "IITG" as PlaceId,
  start: "2026-10-31T10:00:00+05:30",
  end: "2026-11-01T11:00:00+05:30",
  /** Hackathon mode (nav swap, schedule) is on during this window. */
  modeStart: "2026-10-30T18:00:00+05:30",
  modeEnd: "2026-11-01T11:00:00+05:30",
};

/* ----------------------------------------------------------------- legs */
// Passenger order is assumed to follow the team order above (the same order as
// the Garib Rath berths). The PNR sync replaces these with the real per-passenger data.

const ORDER: PersonId[] = ["heet", "omk", "oms", "sujal"];
const seq = (prefix: string, from: number) =>
  ORDER.map((person, i) => ({ person, booked: `${prefix} ${from + i}` }));

export const LEGS: Leg[] = [
  {
    id: "L0",
    kind: "local-train",
    from: "ANND",
    to: "ADI",
    train: { number: "19310", name: "Shanti Express" },
    backupTrain: { number: "11464", name: "Somnath Express", depart: "2026-10-28T06:29:00+05:30" },
    depart: "2026-10-28T06:55:00+05:30",
    arrive: "2026-10-28T08:20:00+05:30",
    travelClass: "UR",
    notes: ["Unreserved. Buy tickets in the UTS app before reaching the platform."],
  },
  {
    id: "L0b",
    kind: "transfer",
    from: "ADI",
    to: "SBIB",
    modeHint: "Ahmedabad Metro Blue Line to Old High Court, then Red Line to Sabarmati",
    depart: "2026-10-28T09:30:00+05:30",
    arrive: "2026-10-28T10:15:00+05:30",
    approx: true,
  },
  {
    id: "L1",
    kind: "train",
    from: "SBIB",
    to: "DLI",
    train: { number: "19031", name: "Yoga Express" },
    depart: "2026-10-28T11:25:00+05:30",
    arrive: "2026-10-29T04:50:00+05:30",
    travelClass: "SL",
    pnr: "8942993403",
    bookedStatus: "PQWL 24-27",
    passengers: seq("PQWL", 24),
    fareTotal: 1997.7,
  },
  {
    id: "L1b",
    kind: "transfer",
    from: "DLI",
    to: "ANVT",
    modeHint: "Chandni Chowk (Yellow Line) to Rajiv Chowk, then Blue Line to Anand Vihar",
    depart: "2026-10-29T05:15:00+05:30",
    arrive: "2026-10-29T06:15:00+05:30",
    approx: true,
  },
  {
    id: "L2",
    kind: "train",
    from: "ANVT",
    to: "KYQ",
    train: { number: "12506", name: "North East Express" },
    depart: "2026-10-29T07:40:00+05:30",
    arrive: "2026-10-30T16:25:00+05:30",
    travelClass: "3A",
    pnr: "2164635217",
    bookedStatus: "WL 44-47",
    passengers: seq("WL", 44),
    fareTotal: 8275.4,
  },
  {
    id: "L2b",
    kind: "transfer",
    from: "KYQ",
    to: "IITG",
    modeHint: "Cab from Kamakhya to IIT Guwahati",
    depart: "2026-10-30T16:45:00+05:30",
    arrive: "2026-10-30T17:45:00+05:30",
    approx: true,
  },
  {
    id: "L3",
    kind: "train",
    from: "KYQ",
    to: "DLI",
    train: { number: "15658", name: "Brahmaputra Express" },
    depart: "2026-11-01T16:55:00+05:30",
    arrive: "2026-11-03T04:50:00+05:30",
    travelClass: "3A",
    pnr: "6210810899",
    bookedStatus: "RAC 38-41",
    passengers: seq("RAC", 38),
    fareTotal: 8477.2,
    notes: ["Often runs late. The app watches the 3 Nov Delhi connection automatically."],
  },
  {
    id: "L3b",
    kind: "transfer",
    from: "DLI",
    to: "DEE",
    modeHint: "Auto or cab, about 20 min",
    depart: "2026-11-03T05:15:00+05:30",
    arrive: "2026-11-03T05:40:00+05:30",
    approx: true,
  },
  {
    id: "L4",
    kind: "train",
    from: "DEE",
    to: "ANND",
    train: { number: "12215", name: "BDTS Garib Rath" },
    depart: "2026-11-03T08:55:00+05:30",
    arrive: "2026-11-04T01:42:00+05:30",
    travelClass: "3A",
    pnr: "2164636496",
    bookedStatus: "CNF",
    passengers: ORDER.map((person) => ({ person, booked: "CNF" })),
    berths: [
      { person: "heet", coach: "G8", berth: 18, type: "Middle" },
      { person: "omk", coach: "G8", berth: 19, type: "Upper" },
      { person: "oms", coach: "G8", berth: 21, type: "Middle" },
      { person: "sujal", coach: "G8", berth: 22, type: "Upper" },
    ],
    fareTotal: 3995.4,
    notes: [
      "Garib Rath usually has no bedding. Carry a bedsheet each.",
      "Arrives Anand at 01:42. Pickup must be arranged.",
    ],
  },
];

/* ---------------------------------------------------------- connections */

export const CONNECTIONS: Connection[] = [
  {
    id: "C1",
    label: "29 Oct, Delhi",
    inbound: "L1",
    transfer: "L1b",
    outbound: "L2",
    plannedBufferMin: 170,
    note: "Delhi Jn 04:50 to Anand Vihar 07:40, cross-city.",
    planB: {
      text: "Go straight to Anand Vihar by cab. If 12506 will still be missed, book the next train to Guwahati on IRCTC (AC Tatkal for tomorrow opens 10:00).",
      owner: "oms",
      link: { label: "Open IRCTC", href: "https://www.irctc.co.in/nget/train-search" },
    },
  },
  {
    id: "C2",
    label: "3 Nov, Delhi",
    inbound: "L3",
    transfer: "L3b",
    outbound: "L4",
    plannedBufferMin: 245,
    note: "Delhi Jn 04:50 to Sarai Rohilla 08:55. Brahmaputra is often late.",
    planB: {
      text: "Tatkal 12918 Gujarat Sampark Kranti (Nizamuddin 13:25 to Anand 01:58) and cancel the Garib Rath before its chart.",
      owner: "oms",
      link: { label: "Open IRCTC", href: "https://www.irctc.co.in/nget/train-search" },
    },
  },
];

/* ------------------------------------------------------------ transfers */
// Used by the transfer planner to pick metro or cab from the live arrival time.
// Metro hours and fares are approximate: check them once before the trip.

export const TRANSFERS: Partial<Record<LegId, TransferOption>> = {
  L0b: {
    metro: {
      route: "Kalupur Railway Station to Old High Court (Blue Line), then Red Line to Sabarmati",
      lines: [
        { name: "Blue Line", color: "#2563eb" },
        { name: "Red Line", color: "#dc2626" },
      ],
      interchange: "Old High Court",
      minutes: 40,
      firstTrain: "06:20",
      lastTrain: "22:00",
      farePerPerson: 30,
    },
    cab: { minutes: 30, fareTotal: 250, label: "Cab or auto" },
    walkMin: 10,
  },
  L1b: {
    metro: {
      route: "Chandni Chowk to Rajiv Chowk (Yellow Line), then Blue Line to Anand Vihar",
      lines: [
        { name: "Yellow Line", color: "#eab308" },
        { name: "Blue Line", color: "#2563eb" },
      ],
      interchange: "Rajiv Chowk",
      minutes: 50,
      firstTrain: "05:30",
      lastTrain: "23:00",
      farePerPerson: 45,
    },
    cab: { minutes: 40, fareTotal: 450, label: "Cab" },
    walkMin: 15,
  },
  L2b: { cab: { minutes: 50, fareTotal: 600, label: "Cab" }, walkMin: 10 },
  L3b: { cab: { minutes: 25, fareTotal: 150, label: "Auto or cab" }, walkMin: 10 },
};

/* ------------------------------------------------------------- backups */

export const FALLBACK_TRAINS = {
  /** Used if 15658 is running 3h+ late on 2 Nov. */
  L4: {
    number: "12918",
    name: "Gujarat Sampark Kranti",
    from: "NZM" as PlaceId,
    to: "ANND" as PlaceId,
    depart: "2026-11-03T13:25:00+05:30",
    arrive: "2026-11-04T01:58:00+05:30",
  },
};

export const IRCTC_BOOK_URL = "https://www.irctc.co.in/nget/train-search";

/* ------------------------------------------------------------ deadlines */

export const DEADLINES: Deadline[] = [
  {
    id: "D1",
    at: "2026-10-27T11:00:00+05:30",
    title: "Tatkal (SL) opens for 19031 Yoga Exp",
    condition: "PQWL is still high (confirmation chance low).",
    action: "Book Tatkal SL for 28 Oct, Sabarmati to Delhi.",
    leg: "L1",
    owner: "oms",
    link: { label: "Open IRCTC", href: IRCTC_BOOK_URL },
  },
  {
    id: "D2",
    at: "2026-10-27T21:00:00+05:30",
    title: "Chart for 19031 Yoga Exp",
    condition: "All 4 still waitlisted after charting.",
    action: "Ticket auto-cancels (₹60/person deducted). Switch to the Tatkal ticket or plan B.",
    leg: "L1",
    owner: "oms",
  },
  {
    id: "D3",
    at: "2026-10-28T10:00:00+05:30",
    title: "Tatkal (AC) opens for 12506 North East Exp",
    condition: "WL is still above about 15-20.",
    action: "Book Tatkal 3A for 29 Oct, Anand Vihar to Kamakhya.",
    leg: "L2",
    owner: "oms",
    link: { label: "Open IRCTC", href: IRCTC_BOOK_URL },
  },
  {
    id: "D4",
    at: "2026-10-28T21:00:00+05:30",
    title: "Chart for 12506 North East Exp",
    condition: "Any of us still waitlisted after charting.",
    action: "Use the Tatkal ticket. If none, decide the onward plan now.",
    leg: "L2",
    owner: "oms",
  },
  {
    id: "D5",
    at: "2026-11-02T10:00:00+05:30",
    title: "Decide: is 15658 Brahmaputra 3h+ late?",
    condition: "Live running status shows 3 hours or more delay.",
    action:
      "Tatkal 12918 Gujarat Sampark Kranti (Nizamuddin 13:25 to Anand 01:58) and cancel the Garib Rath before its chart.",
    leg: "L3",
    owner: "oms",
    link: { label: "Open IRCTC", href: IRCTC_BOOK_URL },
  },
  {
    id: "D6",
    at: "2026-11-02T21:00:00+05:30",
    title: "Chart for 12215 Garib Rath",
    condition: "We switched to 12918.",
    action: "Cancel 12215 before this time for a refund.",
    leg: "L4",
    owner: "oms",
  },
];

/** Applies to every onward leg. Evaluated automatically by the deadline watcher. */
export const CASCADE_RULE =
  "If one onward leg fails and its backup fails too, cancel the other onward leg early.";

/* --------------------------------------------------------------- blocks */

export const BLOCKS: Block[] = [
  {
    id: "settle",
    kind: "stay",
    title: "Check in at IIT Guwahati, rest",
    start: "2026-10-30T17:45:00+05:30",
    end: "2026-10-31T09:30:00+05:30",
    place: "IITG",
  },
  {
    id: "hackathon",
    kind: "event",
    title: EVENT.name,
    start: EVENT.start,
    end: EVENT.end,
    place: "IITG",
  },
  {
    id: "explore",
    kind: "explore",
    title: "Free time in Guwahati",
    start: "2026-11-01T11:00:00+05:30",
    end: "2026-11-01T16:00:00+05:30",
    place: "KYQ",
    notes: ["Kamakhya Temple is right next to Kamakhya station. A natural last stop."],
  },
  {
    id: "pickup",
    kind: "pickup",
    title: "Pickup at Anand station",
    start: "2026-11-04T01:42:00+05:30",
    end: "2026-11-04T02:30:00+05:30",
    place: "ANND",
    notes: ["Who is picking us up? Fill in below."],
  },
];

/** Who picks us up at Anand at 01:42 on 4 Nov. */
export const PICKUP = { name: "", phone: "" };

/* -------------------------------------------------------------- numbers */

export const USEFUL_NUMBERS = [
  { label: "IRCTC", number: "14646" },
  { label: "Rail enquiry, Rail Madad, RPF", number: "139" },
  { label: "e-Catering", number: "1323" },
  { label: "National emergency", number: "112" },
];

/* ------------------------------------------------------------ reminders */

export const REMINDERS = [
  "Om Senjalia: name is SENJALIYA on the North East Exp ticket. Carry an original photo ID.",
  "Garib Rath has no bedding. Carry a bedsheet each.",
  "Arrival at Anand is 01:42 on 4 Nov. Confirm the pickup.",
];

/* ---------------------------------------------------------------- grant */
// BVM SSIP 2.0 "Student Innovation Event Participation Expenses
// Reimbursement Policy". Amounts per student unless noted.

export type GrantItem = {
  id: string;
  label: string;
  /** What each of us actually pays. */
  paidPerPerson: number;
  /** Claimable if the college insists on the most economical class. */
  economyPerPerson?: number;
  note?: string;
  kind: "train" | "local" | "fee";
  leg?: LegId;
};

export const GRANT = {
  policy: "BVM SSIP 2.0: Student Innovation Event Participation Expenses Reimbursement",
  /** Outside Gujarat. Within Gujarat it is 2,000. */
  capPerStudent: 5000,
  /** Larger events may get more, case by case, up to this per event. */
  maxPerEventCaseByCase: 50000,
  items: [
    { id: "g-L0", leg: "L0", kind: "train", label: "Anand to Ahmedabad (unreserved)", paidPerPerson: 35, note: "UTS fare, approx." },
    { id: "g-L0b", leg: "L0b", kind: "local", label: "Kalupur to Sabarmati (metro)", paidPerPerson: 30 },
    { id: "g-L1", leg: "L1", kind: "train", label: "19031 Yoga Express (SL)", paidPerPerson: 1997.7 / 4 },
    { id: "g-L1b", leg: "L1b", kind: "local", label: "Delhi Jn to Anand Vihar (metro or cab)", paidPerPerson: 45 },
    {
      id: "g-L2",
      leg: "L2",
      kind: "train",
      label: "12506 North East Express (3A)",
      paidPerPerson: 8275.4 / 4,
      economyPerPerson: 825,
      note: "Sleeper fare ₹825 if only the most economical class is allowed",
    },
    { id: "g-L2b", leg: "L2b", kind: "local", label: "Kamakhya to IIT Guwahati (shared cab)", paidPerPerson: 150, note: "Station to venue, sharing basis" },
    { id: "g-back", kind: "local", label: "IIT Guwahati to Kamakhya (shared cab)", paidPerPerson: 150, note: "Venue to station, sharing basis" },
    {
      id: "g-L3",
      leg: "L3",
      kind: "train",
      label: "15658 Brahmaputra Express (3A)",
      paidPerPerson: 8477.2 / 4,
      economyPerPerson: 825,
      note: "Sleeper fare ₹825 if only the most economical class is allowed",
    },
    { id: "g-L3b", leg: "L3b", kind: "local", label: "Delhi Jn to Sarai Rohilla (shared auto)", paidPerPerson: 37.5 },
    { id: "g-L4", leg: "L4", kind: "train", label: "12215 BDTS Garib Rath (3A)", paidPerPerson: 3995.4 / 4, note: "3A is the only class on Garib Rath" },
    { id: "g-reg", kind: "fee", label: "Registration fee", paidPerPerson: 900, note: "Approved" },
  ] as GrantItem[],
  documents: [
    "Prior approval from HOD (before 28 Oct)",
    "Approved application form",
    "Event invitation and schedule",
    "Proof of participation (certificate or letter)",
    "Original travel tickets (print every e-ticket)",
    "Bills: metro tickets, cab invoices, registration receipt",
    "Brief report on learnings from the event",
    "Confirm no similar reimbursement in the last 6 months",
  ],
};

/* ------------------------------------------------------------- expenses */
// Added to the shared expenses list on first run. After that, add and edit
// expenses in the app (Money tab), not here.

export const INITIAL_EXPENSES = [
  { title: "Hackathon registration fee", amount: 3600, paid_by: "oms", category: "registration", spent_on: "2026-10-07" },
  { title: "Train tickets (all 4 PNRs)", amount: 23191.11, paid_by: "heet", category: "tickets", spent_on: "2026-10-07" },
] as const;

/* -------------------------------------------------------------- packing */

export const PACKING_TEAM = [
  "Power bank (one each)",
  "Bedsheet for Garib Rath",
  "Original photo IDs (all 4)",
  "Laptops and chargers",
  "Extension board for the hackathon",
  "Water bottles",
];

/** Starting personal list for each of us (everyone can edit their own). */
export const PACKING_PERSONAL = [
  "Original photo ID",
  "Phone charger and cable",
  "Clothes for 7 days",
  "Warm layer for AC coaches",
  "Toiletries and towel",
  "Personal medicines",
  "Earphones",
];

export const TRIP = {
  name: "Guwahati Run",
  start: "2026-10-28T06:00:00+05:30",
  end: "2026-11-04T03:00:00+05:30",
  timezone: "Asia/Kolkata",
  perPersonEachWayTarget: 3000,
};
