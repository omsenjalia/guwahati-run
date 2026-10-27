/**
 * What food costs on the train, from IRCTC's own menu and rates.
 *
 * Source: https://menurates.irctc.co.in — the standard menu (as shown on the
 * pantry car's rate list) and the a-la-carte PDF "Revised Menu and Tariff for
 * A-la-Carte items as per CC-25/2022 (w.e.f 25.11.2025)".
 *
 * Every price already includes GST. A pantry car may charge the in-train price
 * and must show this list; anything above it is overcharging (report on 139).
 */

export type FoodItem = {
  name: string;
  /** Green dot (veg) or red dot (non-veg), as on the IRCTC menu. */
  veg: boolean;
  /** In-train price, ₹, GST included. */
  train: number;
  /** Price at a station stall, when IRCTC lists a separate one. */
  station?: number;
  /** What you get, in the menu's own words. */
  portion?: string;
};

export type FoodSection = {
  id: string;
  title: string;
  /** Shown under the section title. */
  note?: string;
  items: FoodItem[];
};

export const FOOD_SOURCE = {
  name: "IRCTC menu and rates",
  authority: "Indian Railway Catering and Tourism Corporation",
  /** The page every rate below comes from, and the a-la-carte PDF it links to. */
  url: "https://menurates.irctc.co.in/",
  pdf: "https://menurates.irctc.co.in/PDFFiles/MenuandTariffforA-la-Carteitems.pdf",
  /** Effective date printed on the official a-la-carte PDF. */
  updated: "25 Nov 2025",
  /** When the numbers on this phone were last checked against IRCTC. */
  checked: "27 Oct 2026",
  complaint: "139",
} as const;

export const FOOD: FoodSection[] = [
  {
    id: "drinks",
    title: "Tea, coffee and water",
    note: "Rail Neer is the only water Railways allows in the pantry car.",
    items: [
      { name: "Standard tea (150 ml)", veg: true, train: 5, station: 5 },
      { name: "Tea with a tea bag (150 ml)", veg: true, train: 10, station: 10 },
      { name: "Coffee, instant (150 ml)", veg: true, train: 10, station: 10 },
      { name: "Rail Neer water, 1 litre", veg: true, train: 14, station: 14, portion: "Chilled, sealed bottle" },
      { name: "Rail Neer water, 500 ml", veg: true, train: 9, station: 9 },
    ],
  },
  {
    id: "breakfast",
    title: "Breakfast",
    items: [
      {
        name: "Veg breakfast: cutlet",
        veg: true,
        train: 40,
        station: 35,
        portion: "2 bread slices, 2 veg cutlets, butter, ketchup",
      },
      {
        name: "Veg breakfast: idli and vada",
        veg: true,
        train: 40,
        station: 35,
        portion: "2 idli (100 g), 2 vada, chutney",
      },
      {
        name: "Veg breakfast: upma and vada",
        veg: true,
        train: 40,
        station: 35,
        portion: "Upma 100 g, 2 vada, chutney",
      },
      {
        name: "Veg breakfast: pongal and vada",
        veg: true,
        train: 40,
        station: 35,
        portion: "Pongal 100 g, 2 vada, chutney",
      },
      {
        name: "Non-veg breakfast: egg omelette",
        veg: false,
        train: 50,
        station: 45,
        portion: "2 eggs, 2 bread slices, butter, ketchup, salt and pepper",
      },
    ],
  },
  {
    id: "meals",
    title: "Lunch and dinner",
    note: "Casserole meals: rice, 2 parathas or 4 chapatis, dal, curd and pickle.",
    items: [
      {
        name: "Veg meal",
        veg: true,
        train: 80,
        station: 70,
        portion: "Rice 150 g, 2 parathas/4 chapatis, dal 150 g, mix veg 100 g, curd, pickle",
      },
      {
        name: "Egg curry meal",
        veg: false,
        train: 90,
        station: 80,
        portion: "Same as the veg meal, with 2 egg curry 150 g",
      },
      {
        name: "Chicken curry meal",
        veg: false,
        train: 130,
        station: 120,
        portion: "Same as the veg meal, with 60 g boneless chicken and gravy",
      },
      {
        name: "Janta meal",
        veg: true,
        train: 20,
        station: 15,
        portion: "7 pooris 175 g, aloo curry 150 g, pickle",
      },
    ],
  },
  {
    id: "biryani",
    title: "Biryani",
    note: "350 g, with curd, pickle, tissue and a spoon.",
    items: [
      { name: "Veg biryani", veg: true, train: 80, station: 70, portion: "270 g biryani with 70 g vegetables" },
      { name: "Egg biryani", veg: false, train: 90, station: 80, portion: "270 g biryani with 2 eggs" },
      { name: "Chicken biryani", veg: false, train: 110, station: 100, portion: "270 g biryani with 70 g boneless chicken" },
    ],
  },
  {
    id: "snacks",
    title: "Pantry car snacks",
    note: "A-la-carte, price fixed by IRCTC. Ask for the printed rate list if it is not on the board.",
    items: [
      { name: "Chapati (2)", veg: true, train: 20, portion: "2 chapatis of 30 g" },
      { name: "Kachori (2)", veg: true, train: 20, portion: "2 kachoris of 40 g with sauce" },
      { name: "Samosa (2)", veg: true, train: 20, portion: "2 samosas of 50 g with sauce" },
      { name: "Idli with chutney (2)", veg: true, train: 20, portion: "2 idli with sambhar or chutney" },
      { name: "Bread butter", veg: true, train: 20, portion: "2 slices with butter" },
      { name: "Aloo bonda (2)", veg: true, train: 20, portion: "2 pieces of 50 g with sauce" },
      { name: "Maddur vada (2)", veg: true, train: 20, portion: "2 vadas with coconut chutney" },
      { name: "Hot or cold milk", veg: true, train: 20, portion: "250 ml branded milk" },
      { name: "Masala vada (2)", veg: true, train: 30, portion: "2 vadas with chutney" },
      { name: "Upma", veg: true, train: 30, portion: "150 g with chutney" },
      { name: "Uttapam", veg: true, train: 30, portion: "110 g with chutney" },
      { name: "Dahi vada", veg: true, train: 30, portion: "2 vadas with 100 g dahi" },
      { name: "Bread pakora", veg: true, train: 30, portion: "80 g with sauce or chutney" },
      { name: "Pakora plate", veg: true, train: 30, portion: "100 g onion, potato or mixed" },
      { name: "Dhokla", veg: true, train: 30, portion: "100 g" },
      { name: "Poha", veg: true, train: 30, portion: "150 g with namkeen" },
      { name: "Soup", veg: true, train: 30, portion: "150 ml, tomato or veg" },
      { name: "Gatta sabji", veg: true, train: 30, portion: "250 g" },
      { name: "Boiled egg (2)", veg: false, train: 30 },
      { name: "Vada pav", veg: true, train: 30, portion: "2 vada, 2 pav, chutney, green chilli" },
      { name: "Bhel puri", veg: true, train: 30, portion: "100 g" },
      { name: "Ragi ladoo (2)", veg: true, train: 30 },
      { name: "Pastry", veg: true, train: 40, portion: "100 g" },
      { name: "Veg momo (8)", veg: true, train: 50, portion: "8 momos with chutney" },
      { name: "Masala dosa", veg: true, train: 50, portion: "Dosa, potato masala, chutney, sambhar" },
      { name: "Pav bhaji", veg: true, train: 50, portion: "2 pav, 200 g bhaji" },
      { name: "Rajma or chole chawal", veg: true, train: 50, portion: "150 g rajma or chole with 200 g rice" },
      { name: "Khichdi", veg: true, train: 50, portion: "350 g with chutney and pickle" },
      { name: "Litti chokha", veg: true, train: 50, portion: "4 litti with chokha" },
      { name: "Veg noodles", veg: true, train: 50, portion: "300 g" },
      { name: "Cheese sandwich", veg: true, train: 50, portion: "2 pieces of 60 g" },
      { name: "Veg burger", veg: true, train: 50 },
    ],
  },
  {
    id: "plates",
    title: "Bigger plates",
    items: [
      { name: "Chicken sandwich", veg: false, train: 50, portion: "2 pieces of 60 g" },
      { name: "Egg fried rice or noodles", veg: false, train: 90, portion: "350 g" },
      { name: "Dal bati churma", veg: true, train: 100, portion: "250 g with garlic chutney" },
      { name: "Chhole with kulcha or bhature", veg: true, train: 100, portion: "2 kulche, 150 g chhole" },
      { name: "Matar paneer bhurji with poori", veg: true, train: 100, portion: "4 poori or 2 parathas, paneer bhurji" },
      { name: "Veg club sandwich", veg: true, train: 100, portion: "With cheese, vegetables and fries" },
      { name: "Veg mini pizza", veg: true, train: 100, portion: "6 inch, capsicum, tomato, onion" },
      { name: "Veg jumbo burger", veg: true, train: 100, portion: "With cheese, vegetables and fries" },
      { name: "Paneer croquettes combo", veg: true, train: 100, portion: "Bread, paneer croquettes, fries" },
      { name: "Fish cutlet (2)", veg: false, train: 100, portion: "2 cutlets with fries" },
      { name: "Fish curry", veg: false, train: 100, portion: "2 pieces, 100 g gravy" },
      { name: "Chicken fried rice or noodles", veg: false, train: 100, portion: "350 g" },
      { name: "Chicken cutlet combo", veg: false, train: 100, portion: "Bread, 2 chicken cutlets, fries" },
      { name: "Chicken club sandwich", veg: false, train: 100, portion: "With cheese, chicken and fries" },
      { name: "Non-veg mini pizza", veg: false, train: 100, portion: "6 inch, 60 g chicken" },
      { name: "Chicken momo (8)", veg: false, train: 80, portion: "8 momos with chutney" },
      { name: "Spring roll (2)", veg: true, train: 80, portion: "2 rolls of 60 g with sauce" },
      { name: "Veg chinese combo", veg: true, train: 150, portion: "Fried rice or noodles with manchurian" },
      { name: "Non-veg chinese combo", veg: false, train: 150, portion: "Fried rice or noodles with chilli chicken" },
    ],
  },
  {
    id: "sweets",
    title: "Sweets",
    items: [
      { name: "Jalebi", veg: true, train: 20, portion: "60 g" },
      { name: "Gulab jamun", veg: true, train: 20, portion: "30 g" },
      { name: "Kesari bhat", veg: true, train: 20, portion: "100 g" },
    ],
  },
];

/** Everything on the list, for search on the Food tab. */
export const FOOD_ITEMS = FOOD.flatMap((s) => s.items.map((i) => ({ ...i, section: s.id, sectionTitle: s.title })));

/**
 * The vegetarian list. The tab shows this, because the four of us eat veg on
 * the train; the non-veg rows stay in FOOD so nothing is lost if that changes.
 */
export const FOOD_VEG: FoodSection[] = FOOD.map((s) => ({
  ...s,
  items: s.items.filter((i) => i.veg),
})).filter((s) => s.items.length > 0);
