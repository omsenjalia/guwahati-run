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

export type LegKind = "train" | "transfer";

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
  /**
   * Per-passenger status in ticket order (passenger 1 first). `current` is
   * the status as last checked by hand; only `tracked` legs update live.
   */
  passengers?: { person: PersonId; booked: string; current?: string }[];
  /** True for the one ticket the app still polls (North East Express). */
  tracked?: boolean;
  /** We get off before the ticket's destination (e.g. booked to Haridwar). */
  ticketTo?: string;
  /** A cancelled earlier booking for this leg: what it cost and what came back. */
  rebooking?: { oldPaid: number; refunded: number; cancelledOn: string };
  /** Confirmed berths known at booking. Live chart data overrides this. */
  berths?: Berth[];
  /** Total for 4 passengers, rupees. */
  fareTotal?: number;
  /** Rail distance we ride, from the timetable. */
  km?: number;
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

export type DeadlineId = "ne-tatkal" | "ne-chart" | "bp-late" | "gr-chart";

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
    id: "omk",
    name: "Omkumar Vaghela",
    short: "Om K",
    age: 18,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
  {
    id: "heet",
    name: "Heet Gajera",
    short: "Heet",
    age: 17,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
  {
    id: "sujal",
    name: "Sujal Khatri",
    short: "Sujal",
    age: 18,
    gender: "M",
    phone: "",
    guardian: { name: "", relation: "", phone: "" },
    role: "",
  },
];

/** Has an Aadhaar-verified IRCTC account. Books North East Tatkal on 28 Oct if needed. */
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

/**
 * Hackathon schedule. Times marked tbc are guesses: update them from the
 * official schedule when it arrives (everything else adjusts automatically).
 */
export const EVENT_SCHEDULE: { at: string; title: string; tbc?: boolean }[] = [
  { at: "2026-10-31T09:00:00+05:30", title: "Reporting and registration desk", tbc: true },
  { at: "2026-10-31T10:00:00+05:30", title: "Hacking starts" },
  { at: "2026-10-31T13:00:00+05:30", title: "Lunch", tbc: true },
  { at: "2026-10-31T20:00:00+05:30", title: "Dinner", tbc: true },
  { at: "2026-11-01T08:00:00+05:30", title: "Breakfast", tbc: true },
  { at: "2026-11-01T09:00:00+05:30", title: "Submission deadline", tbc: true },
  { at: "2026-11-01T09:30:00+05:30", title: "Judging and demos", tbc: true },
  { at: "2026-11-01T11:00:00+05:30", title: "Results and closing" },
];

/** Fill in at the venue. */
export const VENUE_NOTES = {
  wifi: "Ask at the registration desk",
  power: "Bring the extension board; claim a table near a socket early",
  food: "Included in our fee: 5 meals (2 breakfasts, 1 lunch, 2 dinners, from dinner on 30 Oct). Keep water and snacks at the table",
  stay: "Included in our fee: IIT Guwahati hostel on the night of 30 Oct",
  help: "",
};

/** Overnight rest rotation: two rest while two keep building. */
export const REST_PLAN: { start: string; end: string; resting: PersonId[] }[] = [
  { start: "2026-10-31T23:00:00+05:30", end: "2026-11-01T01:00:00+05:30", resting: ["heet", "omk"] },
  { start: "2026-11-01T01:00:00+05:30", end: "2026-11-01T03:00:00+05:30", resting: ["oms", "sujal"] },
  { start: "2026-11-01T03:00:00+05:30", end: "2026-11-01T05:00:00+05:30", resting: ["heet", "omk"] },
  { start: "2026-11-01T05:00:00+05:30", end: "2026-11-01T07:00:00+05:30", resting: ["oms", "sujal"] },
];

export const DEMO_CHECKLIST = [
  "Slides final (PDF copy too)",
  "Backup demo video recorded",
  "Repo public, README updated",
  "Deployed URL works on mobile data",
  "Pitch rehearsed under time",
  "Laptops charged, chargers packed",
];

/* ----------------------------------------------------------------- legs */
// Each leg lists passengers in the order printed on its e-ticket (passenger 1-4).
// The North East tracker matches live statuses to people by this order.

export const LEGS: Leg[] = [
  {
    id: "L0",
    kind: "train",
    from: "ANND",
    to: "ADI",
    train: { number: "19310", name: "Shanti Express" },
    km: 64,
    depart: "2026-10-28T06:55:00+05:30",
    arrive: "2026-10-28T08:20:00+05:30",
    travelClass: "SL",
    pnr: "8835664180",
    bookedStatus: "CNF",
    // This ticket lists Sujal first.
    passengers: [
      { person: "sujal", booked: "CNF", current: "CNF" },
      { person: "oms", booked: "CNF", current: "CNF" },
      { person: "omk", booked: "CNF", current: "CNF" },
      { person: "heet", booked: "CNF", current: "CNF" },
    ],
    berths: [
      { person: "sujal", coach: "S5", berth: 10, type: "Middle" },
      { person: "oms", coach: "S5", berth: 15, type: "Side Lower" },
      { person: "omk", coach: "S5", berth: 12, type: "Lower" },
      { person: "heet", coach: "S5", berth: 9, type: "Lower" },
    ],
    fareTotal: 639.5,
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
    km: 950,
    depart: "2026-10-28T11:25:00+05:30",
    arrive: "2026-10-29T04:50:00+05:30",
    travelClass: "SL",
    pnr: "8154913954",
    bookedStatus: "WL 15-18",
    ticketTo: "Haridwar (HW)",
    passengers: [
      { person: "oms", booked: "WL 15", current: "RAC 78" },
      { person: "omk", booked: "WL 17", current: "RAC 80" },
      { person: "heet", booked: "WL 16", current: "RAC 79" },
      { person: "sujal", booked: "WL 18", current: "RAC 81" },
    ],
    fareTotal: 2359.5,
    rebooking: { oldPaid: 1997.7, refunded: 1740, cancelledOn: "2026-10-10" },
    notes: ["Ticket is to Haridwar; we get off at Delhi Jn."],
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
    km: 1856,
    depart: "2026-10-29T07:40:00+05:30",
    arrive: "2026-10-30T16:25:00+05:30",
    travelClass: "3A",
    pnr: "2164635217",
    bookedStatus: "GNWL 81-84",
    // Ticket order. Last known status (11 Oct); the tracker replaces it live.
    passengers: [
      { person: "heet", booked: "GNWL 81", current: "GNWL 44" },
      { person: "omk", booked: "GNWL 82", current: "GNWL 45" },
      { person: "oms", booked: "GNWL 83", current: "GNWL 46" },
      { person: "sujal", booked: "GNWL 84", current: "GNWL 47" },
    ],
    fareTotal: 8275.4,
    tracked: true,
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
    km: 2028,
    depart: "2026-11-01T16:55:00+05:30",
    arrive: "2026-11-03T04:50:00+05:30",
    travelClass: "3A",
    pnr: "6210810899",
    bookedStatus: "WL 7-10",
    passengers: [
      { person: "heet", booked: "WL 7", current: "RAC 38" },
      { person: "oms", booked: "WL 8", current: "RAC 39" },
      { person: "omk", booked: "WL 9", current: "RAC 40" },
      { person: "sujal", booked: "WL 10", current: "RAC 41" },
    ],
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
    km: 1016,
    depart: "2026-11-03T08:55:00+05:30",
    arrive: "2026-11-04T01:42:00+05:30",
    travelClass: "3A",
    pnr: "2164636496",
    bookedStatus: "CNF",
    passengers: (["heet", "omk", "oms", "sujal"] as const).map((person) => ({ person, booked: "CNF", current: "CNF" })),
    berths: [
      { person: "heet", coach: "G8", berth: 18, type: "Middle" },
      { person: "omk", coach: "G8", berth: 19, type: "Upper" },
      { person: "oms", coach: "G8", berth: 21, type: "Middle" },
      { person: "sujal", coach: "G8", berth: 22, type: "Upper" },
    ],
    fareTotal: 3995.4,
    notes: [
      "Garib Rath usually has no bedding. Carry a bedsheet each.",
      "Arrives Anand at 01:42. Rapido or auto home, stay together.",
    ],
  },
];

/** Money lost on a cancelled earlier booking (paid minus refund). */
export const rebookingLoss = (leg: Leg) => (leg.rebooking ? leg.rebooking.oldPaid - leg.rebooking.refunded : 0);

/** One person's rail cost for a leg: fare plus any cancellation loss, split 4 ways. */
export function legCostPerPerson(id: LegId) {
  const leg = LEGS.find((l) => l.id === id)!;
  return ((leg.fareTotal ?? 0) + rebookingLoss(leg)) / 4;
}

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
// Metro hours: Ahmedabad Phase 1 runs 06:20 to 22:00; Delhi Yellow Line from
// Chandni Chowk starts about 05:57. Confirm in the DMRC / GMRC apps before the trip.

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
      // First Yellow Line train from Chandni Chowk is about 05:57 (aggregators, Oct 2026).
      firstTrain: "06:00",
      lastTrain: "23:30",
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
/** IRCTC's own PNR enquiry page, for checking a static ticket by hand. */
export const IRCTC_PNR_URL = "https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en";

/**
 * If 12506 is fully waitlisted after its chart: other Delhi to Guwahati
 * trains on 29 Oct. Times and seats are fetched live (Plan B card).
 */
export const NE_ALTERNATIVES = {
  date: "2026-10-29",
  trains: [
    { number: "12424", name: "Dibrugarh Rajdhani", from: "NDLS", fromName: "New Delhi", to: "GHY", toName: "Guwahati" },
    { number: "15657", name: "Brahmaputra Express", from: "DLI", fromName: "Delhi Jn", to: "KYQ", toName: "Kamakhya" },
    { number: "15910", name: "Avadh Assam Express", from: "DLI", fromName: "Delhi Jn", to: "GHY", toName: "Guwahati" },
  ],
  classes: ["3A", "SL"],
  flightsUrl: "https://www.google.com/travel/flights?q=Flights%20from%20DEL%20to%20GAU%20on%202026-10-29%20one%20way",
};

/* ------------------------------------------------------------ deadlines */

export const DEADLINES: Deadline[] = [
  {
    id: "ne-tatkal",
    at: "2026-10-28T10:00:00+05:30",
    title: "NE Tatkal decision (only if still WL)",
    condition: "Confirmation chance is under about 70% or GNWL is still above about 15-20.",
    action:
      "Book Tatkal 3A for all 4 for 29 Oct, Anand Vihar to Kamakhya. We'll be in Ahmedabad that morning (Yoga leaves 11:25), so book from there.",
    leg: "L2",
    owner: "oms",
    link: { label: "Open IRCTC", href: IRCTC_BOOK_URL },
  },
  {
    id: "ne-chart",
    at: "2026-10-28T21:00:00+05:30",
    title: "Chart for 12506 North East Exp",
    condition: "All 4 still waitlisted after charting.",
    action:
      "The ticket auto-cancels and refunds. Use the Tatkal ticket, or pick another Delhi to Guwahati option for 29 Oct. If even 1 of us is confirmed or RAC, all 4 can board.",
    leg: "L2",
    owner: "oms",
  },
  {
    id: "bp-late",
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
    id: "gr-chart",
    at: "2026-11-02T21:00:00+05:30",
    title: "Chart for 12215 Garib Rath",
    condition: "We switched to 12918.",
    action: "Cancel 12215 before this time for a refund.",
    leg: "L4",
    owner: "oms",
  },
];

/* --------------------------------------------------------------- blocks */

export const BLOCKS: Block[] = [
  {
    id: "settle",
    kind: "stay",
    title: "Check in at IIT Guwahati, rest",
    start: "2026-10-30T17:45:00+05:30",
    end: "2026-10-31T09:30:00+05:30",
    place: "IITG",
    notes: ["Hostel room and dinner are included in our fee (team Visonaris, WC4U2026-18). Carry the fee receipt."],
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
    notes: ["Kamakhya Temple is about 5 km from the station (15 to 20 min by cab). Guides has leave-by times."],
  },
  {
    id: "pickup",
    kind: "pickup",
    title: "Rapido or auto home from Anand",
    start: "2026-11-04T01:42:00+05:30",
    end: "2026-11-04T02:30:00+05:30",
    place: "ANND",
    notes: ["Book the Rapido from the platform before walking out, or take an auto from the stand. Stay together and share ride details in the group."],
  },
];

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
  "Arrival at Anand is 01:42 on 4 Nov. Rapido or auto home, stay together.",
];

/* --------------------------------------------------------------- report */
// The final travel report for the college (Grant tab).

export const REPORT = {
  /** Used in the file name: WhyCode4U_Travel_Report_<team>.pdf */
  teamName: "Visonaris",
  /** From the WhyCode4U fee receipt. */
  registrationId: "WC4U2026-18",
  college: "Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar",
  department: "Department of Information Technology",
  addressedTo: "The Head of Department, Department of Information Technology, BVM",
  association: "in association with IIT Guwahati",
  eventDates: "31 October to 1 November 2026",
  travelDates: "28 October to 4 November 2026",
  /** Funding requested per student (team total is 4x). */
  requestedPerStudent: 5000,
};

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
    { id: "g-L0", leg: "L0", kind: "train", label: "19310 Shanti Express (SL)", paidPerPerson: legCostPerPerson("L0") },
    { id: "g-L0b", leg: "L0b", kind: "local", label: "Kalupur to Sabarmati (metro)", paidPerPerson: 30 },
    {
      id: "g-L1",
      leg: "L1",
      kind: "train",
      label: "19031 Yoga Express (SL)",
      paidPerPerson: legCostPerPerson("L1"),
      note: "Includes ₹257.70 lost when the first booking was cancelled",
    },
    { id: "g-L1b", leg: "L1b", kind: "local", label: "Delhi Jn to Anand Vihar (metro or cab)", paidPerPerson: 45 },
    {
      id: "g-L2",
      leg: "L2",
      kind: "train",
      label: "12506 North East Express (3A)",
      paidPerPerson: legCostPerPerson("L2"),
      economyPerPerson: 825,
      note: "Booked 3A; claimed at the sleeper fare (₹825)",
    },
    { id: "g-L2b", leg: "L2b", kind: "local", label: "Kamakhya to IIT Guwahati (shared cab)", paidPerPerson: 150, note: "Station to venue, sharing basis" },
    { id: "g-back", kind: "local", label: "IIT Guwahati to Kamakhya (shared cab)", paidPerPerson: 150, note: "Venue to station, sharing basis" },
    {
      id: "g-L3",
      leg: "L3",
      kind: "train",
      label: "15658 Brahmaputra Express (3A)",
      paidPerPerson: legCostPerPerson("L3"),
      economyPerPerson: 825,
      note: "Booked 3A; claimed at the sleeper fare (₹825)",
    },
    { id: "g-L3b", leg: "L3b", kind: "local", label: "Delhi Jn to Sarai Rohilla (shared auto)", paidPerPerson: 37.5 },
    { id: "g-L4", leg: "L4", kind: "train", label: "12215 BDTS Garib Rath (3A)", paidPerPerson: legCostPerPerson("L4"), note: "3A is the only class on Garib Rath" },
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
// Added to the expenses list on first run. Train fares come from LEGS above,
// not from expenses. After that, add receipts in the app (Money tab).

export const INITIAL_EXPENSES = [
  // paid_by is required by the table; who paid is tracked in Splitwise.
  { title: "Hackathon registration fee", amount: 3600, paid_by: "oms", category: "registration", spent_on: "2026-10-07", note: "UPI UTR 628085234718, receipt WC4U2026-18" },
] as const;

/* ----------------------------------------------------------------- prep */
// Before-the-trip checklist. perPerson items need a tick from each of us.
// Seeded once; after that add, tick and edit in the app (Team tab).

export type PrepItem = { label: string; due: string; perPerson?: boolean };

export const PREP: PrepItem[] = [
  { label: "Install IRCTC, UTS and Where is my Train apps", due: "2026-10-20", perPerson: true },
  { label: "Original photo ID: college ID and Aadhaar", due: "2026-10-25", perPerson: true },
  { label: "Download offline maps of Delhi and Guwahati", due: "2026-10-25", perPerson: true },
  { label: "Arrange the 01:42 pickup at Anand on 4 Nov", due: "2026-10-25" },
  { label: "Pack laptop and charger", due: "2026-10-27", perPerson: true },
  { label: "Pack the extension board", due: "2026-10-27" },
  { label: "Carry a bedsheet for the Garib Rath", due: "2026-10-27", perPerson: true },
];

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
