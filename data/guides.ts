/**
 * Station guides and the Guwahati explore list. Written from research before
 * the trip: details marked `verify` are worth a quick check on Google Maps.
 */
import type { PlaceId } from "@/data/trip";

export type StationGuide = {
  id: PlaceId;
  exit: string;
  transport: string;
  food: string;
  facilities: string;
  tip?: string;
  verify?: boolean;
};

export const STATION_GUIDES: StationGuide[] = [
  {
    id: "ANND",
    exit: "Main entrance on the town side. Autos wait outside.",
    transport: "Local train to Ahmedabad on 28 Oct (19310, or 11464 as backup).",
    food: "Tea and snacks stalls on the main platform. Eat at home before an early start.",
    facilities: "Waiting room on platform 1.",
    tip: "Book the UTS ticket before you enter: the app blocks paperless booking near the tracks.",
  },
  {
    id: "ADI",
    exit: "Use the Kalupur (main) side and follow the metro signs.",
    transport: "Ahmedabad Metro from Kalupur Railway Station metro (Blue Line), change at Old High Court to the Red Line for Sabarmati.",
    food: "Food plaza and stalls on platform 1.",
    facilities: "Cloakroom and waiting rooms near platform 1.",
    verify: true,
  },
  {
    id: "SBIB",
    exit: "Sabarmati has separate BG and MG sides: make sure you're at the BG (broad gauge) platforms.",
    transport: "Red Line metro station nearby. Autos outside.",
    food: "Limited. Buy lunch for the train before you arrive or pre-order e-catering.",
    facilities: "Basic waiting area.",
    verify: true,
  },
  {
    id: "DLI",
    exit: "Main exit on the Chandni Chowk side (platform 1).",
    transport: "Chandni Chowk metro (Yellow Line) is right across the road from the main exit. Change at Rajiv Chowk to the Blue Line for Anand Vihar.",
    food: "Stalls on platform 1. Chandni Chowk food lanes open late morning, not at 05:00.",
    facilities: "Cloakroom and waiting rooms near platform 1. Washrooms at the main concourse.",
    tip: "Arriving at 04:50: wait inside the station until the first metro rather than outside.",
  },
  {
    id: "ANVT",
    exit: "Follow signs to the foot overbridge for the metro and ISBT.",
    transport: "Anand Vihar metro (Blue and Pink Lines) connects by foot overbridge.",
    food: "Food court and stalls inside the terminal. Buy breakfast and water before the 07:40 train.",
    facilities: "AC waiting hall and cloakroom in the terminal building.",
  },
  {
    id: "KYQ",
    exit: "Single main exit. Prepaid and app cabs gather outside.",
    transport: "Cab to IIT Guwahati, about 45 to 60 minutes depending on bridge traffic.",
    food: "Small stalls only. Eat near IIT or Maligaon.",
    facilities: "Basic waiting room.",
    tip: "Kamakhya Temple is about 5 km away on Nilachal Hill (15 to 20 minutes by cab), not walkable with bags.",
    verify: true,
  },
  {
    id: "DEE",
    exit: "Main exit towards the road for autos.",
    transport: "Auto or cab from Delhi Jn, about 20 to 30 minutes early morning. Shastri Nagar metro (Red Line) is the nearest.",
    food: "Few options. Pick up breakfast at Delhi Jn before leaving.",
    facilities: "Small waiting area. Garib Rath has no bedding: have your sheet ready.",
    verify: true,
  },
];

export type ExploreSpot = {
  name: string;
  why: string;
  /** Typical time to spend there, minutes. */
  stayMin: number;
  /** Cab time from here to Kamakhya station, minutes. */
  toKyqMin: number;
  mapsQuery: string;
};

/** For the gap between the finals (11:00) and the 16:55 train on 1 Nov. */
export const EXPLORE: ExploreSpot[] = [
  {
    name: "Kamakhya Temple",
    why: "The famous hilltop temple. Queues can take hours: use the general line early or just see the complex.",
    stayMin: 120,
    toKyqMin: 20,
    mapsQuery: "Kamakhya Temple Guwahati",
  },
  {
    name: "Brahmaputra riverfront (Uzan Bazar)",
    why: "Walk along the river, good views and tea stalls.",
    stayMin: 45,
    toKyqMin: 30,
    mapsQuery: "Uzan Bazar riverfront Guwahati",
  },
  {
    name: "Umananda Temple",
    why: "Temple on a river island, reached by ferry from Kachari Ghat.",
    stayMin: 90,
    toKyqMin: 35,
    mapsQuery: "Kachari Ghat Guwahati",
  },
  {
    name: "Fancy Bazar and Pan Bazar",
    why: "Lunch, Assamese tea, gamosas and souvenirs.",
    stayMin: 60,
    toKyqMin: 25,
    mapsQuery: "Fancy Bazar Guwahati",
  },
  {
    name: "Assam State Museum",
    why: "Compact museum near Dighalipukhuri, good if it rains.",
    stayMin: 60,
    toKyqMin: 30,
    mapsQuery: "Assam State Museum Guwahati",
  },
];

/** Be at Kamakhya station this long before the train. */
export const EXPLORE_RETURN_MARGIN_MIN = 40;
