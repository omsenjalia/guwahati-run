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
  /** e.g. "Ticket booker", "Chart checker", "Navigator". */
  role: string;
  /** Spelling differences between real name and a ticket, keyed by leg id. */
  ticketNameNotes?: Partial<Record<LegId, string>>;
};

export type PlaceId =
  | "ANND"
  | "ADI"
  | "SBIB"
  | "DLI"
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
  /** Friendly title for a step that isn't a journey (e.g. waiting at a station). */
  title?: string;
  depart: string;
  arrive: string;
  /**
   * Departure the reservation chart is prepared at, when that isn't our
   * boarding station (the chart is made where the train starts).
   */
  chartDepart?: string;
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
  /** True for tickets the app still polls (the Avadh Assam Express). */
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

export type DeadlineId = "aa-chart" | "bp-late" | "gr-chart";

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
    role: "Ticket booker",
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

/** Has an Aadhaar-verified IRCTC account. Books and cancels our tickets. */
export const BOOKING_OWNER: PersonId = "oms";

/* -------------------------------------------------------------- places */
// Coordinates are station entrances (approx.) used for weather, maps and cab links.

export const PLACES: Record<PlaceId, Place> = {
  ANND: { id: "ANND", name: "Anand Junction", short: "Anand", city: "Anand", code: "ANND", lat: 22.5546, lon: 72.9664 },
  ADI: { id: "ADI", name: "Ahmedabad Junction (Kalupur)", short: "Ahmedabad", city: "Ahmedabad", code: "ADI", lat: 23.0264, lon: 72.6009 },
  SBIB: { id: "SBIB", name: "Sabarmati BG", short: "Sabarmati", city: "Ahmedabad", code: "SBIB", lat: 23.0784, lon: 72.5895 },
  DLI: { id: "DLI", name: "Delhi Junction (Old Delhi)", short: "Delhi Jn", city: "Delhi", code: "DLI", lat: 28.6616, lon: 77.2275 },
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
  // From the shortlist email (6 Oct): reporting/start 31 Oct 9:00 sharp, end 1 Nov 10:00 sharp.
  start: "2026-10-31T09:00:00+05:30",
  end: "2026-11-01T10:00:00+05:30",
  /** Hackathon mode (nav swap, schedule) is on during this window. */
  // From our arrival at IIT (the 15910 reaches Kamakhya 00:35 on 31 Oct and we are at IIT by ~01:50).
  modeStart: "2026-10-31T01:50:00+05:30",
  modeEnd: "2026-11-01T10:00:00+05:30",
};

/**
 * Hackathon schedule. Times marked tbc are guesses: update them from the
 * official schedule when it arrives (everything else adjusts automatically).
 */
export const EVENT_SCHEDULE: { at: string; title: string; tbc?: boolean }[] = [
  { at: "2026-10-31T09:00:00+05:30", title: "Reporting and start (9:00 sharp)" },
  { at: "2026-10-31T13:00:00+05:30", title: "Lunch", tbc: true },
  { at: "2026-10-31T20:00:00+05:30", title: "Dinner", tbc: true },
  { at: "2026-11-01T08:00:00+05:30", title: "Breakfast", tbc: true },
  { at: "2026-11-01T09:00:00+05:30", title: "Submission deadline", tbc: true },
  { at: "2026-11-01T09:30:00+05:30", title: "Judging and demos", tbc: true },
  { at: "2026-11-01T10:00:00+05:30", title: "Event ends (10:00 sharp)" },
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
// The 15910 tracker matches live statuses to people by this order.

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
    to: "DLI",
    // 15910 leaves from Delhi Jn itself, where the Yoga Express arrives: no change of station.
    title: "Wait at Delhi Jn",
    modeHint: "No change of station: breakfast and wait at Delhi Jn, then platform 16 for 15910",
    depart: "2026-10-29T05:15:00+05:30",
    arrive: "2026-10-29T07:00:00+05:30",
    approx: true,
  },
  {
    id: "L2",
    kind: "train",
    from: "DLI",
    to: "KYQ",
    // Avadh Assam Express, Lalgarh Jn to Dibrugarh. It reaches Delhi Jn on day 2
    // of its run (07:07, departs 07:22) and Kamakhya on day 4 (00:35).
    train: { number: "15910", name: "Avadh Assam Express" },
    km: 1938,
    depart: "2026-10-29T07:22:00+05:30",
    arrive: "2026-10-31T00:35:00+05:30",
    // The ticket is booked from Pili Bangan (PGK), where 15910 starts its run
    // at 22:50 on 28 Oct: that is where the chart is prepared.
    chartDepart: "2026-10-28T22:50:00+05:30",
    travelClass: "3A",
    pnr: "2960910157",
    bookedStatus: "GNWL 55-58",
    // Ticket order. Booked waitlisted, now RAC for all four (no berth numbers
    // until the chart); the tracker replaces both with live data.
    passengers: [
      { person: "heet", booked: "GNWL 55", current: "RAC" },
      { person: "omk", booked: "GNWL 57", current: "RAC" },
      { person: "sujal", booked: "GNWL 58", current: "RAC" },
      { person: "oms", booked: "GNWL 56", current: "RAC" },
    ],
    fareTotal: 9095.4,
    tracked: true,
    notes: [
      "Leaves from Delhi Jn itself (platform 16), so no cross-city transfer.",
      "Reaches Kamakhya 00:35 on 31 Oct, in time for 9:00 reporting.",
    ],
  },
  {
    id: "L2b",
    kind: "transfer",
    from: "KYQ",
    to: "IITG",
    modeHint: "Cab from Kamakhya to IIT Guwahati",
    depart: "2026-10-31T01:00:00+05:30",
    arrive: "2026-10-31T01:50:00+05:30",
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

/**
 * Leg ids that used to exist, mapped to the leg that replaced them. Uploaded
 * documents and saved rows still carry the old id (the 15910 ticket was
 * uploaded as the backup "B1" before it became our main train), so anything
 * that looks a leg up in saved data goes through this.
 */
export const LEGACY_LEG_IDS: Record<string, LegId> = { B1: "L2" };

/** Every saved id that belongs to this leg, current and old. */
export const legIdAliases = (id: LegId): string[] => [id, ...Object.keys(LEGACY_LEG_IDS).filter((old) => LEGACY_LEG_IDS[old] === id)];

/** The leg a saved id belongs to now (an old backup id maps to its replacement). */
export const currentLegId = (saved: string): string => LEGACY_LEG_IDS[saved] ?? saved;

/* ---------------------------------------------------------- connections */

export const CONNECTIONS: Connection[] = [
  {
    id: "C1",
    label: "29 Oct, Delhi",
    inbound: "L1",
    transfer: "L1b",
    outbound: "L2",
    plannedBufferMin: 152,
    note: "Same station: Delhi Jn 04:50, 15910 leaves Delhi Jn 07:22.",
    planB: {
      text: "You are already at Delhi Jn. If 15910 is missed, book the next Delhi to Guwahati train on IRCTC.",
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
      text: "Book 12918 Gujarat Sampark Kranti (Nizamuddin 13:25 to Anand 01:58) and cancel the Garib Rath before its chart.",
      owner: "oms",
      link: { label: "Open IRCTC", href: "https://www.irctc.co.in/nget/train-search" },
    },
  },
];

/* ------------------------------------------------------------ transfers */
// Used by the transfer planner to pick metro or cab from the live arrival time.
// Metro hours: Ahmedabad Phase 1 runs 06:20 to 22:00. Confirm in the GMRC app
// before the trip. There is no Delhi transfer any more: 15910 leaves from
// Delhi Jn, where the Yoga Express arrives.

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
  L2b: { cab: { minutes: 50, fareTotal: 600, label: "Cab" }, walkMin: 10 },
  L3b: { cab: { minutes: 25, fareTotal: 150, label: "Auto or cab" }, walkMin: 10 },
};

/* ------------------------------------------------------ fallback trains */

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
 * If 15910 is fully waitlisted after its chart: other Delhi to Guwahati
 * trains on 29 Oct. Times and seats are fetched live (Plan B card).
 */
export const ALTERNATE_TRAINS = {
  date: "2026-10-29",
  trains: [
    { number: "12424", name: "Dibrugarh Rajdhani", from: "NDLS", fromName: "New Delhi", to: "GHY", toName: "Guwahati" },
    { number: "15657", name: "Brahmaputra Express", from: "DLI", fromName: "Delhi Jn", to: "KYQ", toName: "Kamakhya" },
  ],
  classes: ["3A", "SL"],
  flightsUrl: "https://www.google.com/travel/flights?q=Flights%20from%20DEL%20to%20GAU%20on%202026-10-29%20one%20way",
};

/* ------------------------------------------------------------ deadlines */

export const DEADLINES: Deadline[] = [
  {
    id: "aa-chart",
    // 10 hours before 15910 leaves Pili Bangan (22:50 on 28 Oct), where the chart is made.
    at: "2026-10-28T12:50:00+05:30",
    title: "Chart for 15910 Avadh Assam Exp",
    condition: "The chart is out: our coach and berths are final.",
    action: "Open the Ticket tab and note the coach and berth. Nothing else to do.",
    leg: "L2",
    owner: "oms",
  },
  {
    id: "bp-late",
    at: "2026-11-02T10:00:00+05:30",
    title: "Decide: is 15658 Brahmaputra 3h+ late?",
    condition: "Live running status shows 3 hours or more delay.",
    action:
      "Book 12918 Gujarat Sampark Kranti (Nizamuddin 13:25 to Anand 01:58) and cancel the Garib Rath before its chart.",
    leg: "L3",
    owner: "oms",
    link: { label: "Open IRCTC", href: IRCTC_BOOK_URL },
  },
  {
    id: "gr-chart",
    // 20:00 the previous day for a 08:55 departure.
    at: "2026-11-02T20:00:00+05:30",
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
    title: "Reach IIT Guwahati, freshen up and rest",
    start: "2026-10-31T01:50:00+05:30",
    end: "2026-10-31T09:30:00+05:30",
    place: "IITG",
    notes: [
      "We reach IIT from Kamakhya around 01:50, so the hostel night and dinner on 30 Oct are spent on the train. Hostel and meals are included in our fee (team Visonaris, WC4U2026-18): carry the fee receipt and ask at the desk for a room.",
    ],
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
    start: "2026-11-01T10:00:00+05:30",
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
  "Om Senjalia: name is SENJALIYA on the Avadh Assam Exp ticket. Carry an original photo ID.",
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

export const GRANT = {
  policy: "BVM SSIP 2.0: Student Innovation Event Participation Expenses Reimbursement",
  /** Outside Gujarat. Within Gujarat it is 2,000. */
  capPerStudent: 5000,
  /** Larger events may get more, case by case, up to this per event. */
  maxPerEventCaseByCase: 50000,
  /**
   * Every train leg is a 3A ticket, but the policy pays the most economical
   * class, so each is claimed at the sleeper fare per person. Garib Rath has
   * no sleeper class at all, so it is claimed at the Mail/Express sleeper fare
   * on the same Anand-Delhi run (Rs. 490 over 1,016 km): the rate of fares we
   * actually hold, Rs. 900 over 1,938 km and Rs. 825 over 2,028 km, sits either
   * side of that once distance is taken into account.
   */
  sleeperFarePerPerson: { L2: 900, L3: 825, L4: 490 } as Partial<Record<LegId, number>>,
  /**
   * Things for the claim that aren't uploads (the HOD approval is a hard
   * copy). Everything else on the college's list (invitation, tickets,
   * bills, certificate) is ticked automatically from the uploaded documents.
   */
  documents: [
    "HOD approval (hard copy): attach to the printed report",
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

/**
 * The trip's own window, read off LEGS instead of typed in: it opens with the
 * first departure and closes when the last leg arrives home. Anything that
 * should only exist while we are away (the pantry car price list) keys off this,
 * so adding a train or changing a time moves the window with it.
 */
export const TRIP_SPAN = {
  start: LEGS.reduce((a, l) => (new Date(l.depart).getTime() < new Date(a).getTime() ? l.depart : a), LEGS[0].depart),
  end: LEGS.reduce((a, l) => (new Date(l.arrive).getTime() > new Date(a).getTime() ? l.arrive : a), LEGS[0].arrive),
};
