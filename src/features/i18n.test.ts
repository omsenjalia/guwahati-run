import { describe, expect, it } from "vitest";
import { DICT } from "@/i18n/dict";
import { tr } from "@/i18n/translate";

describe("translations", () => {
  it("translates plain English into Hindi and Gujarati", () => {
    expect(tr("Settings", "hi")).toBe("सेटिंग्स");
    expect(tr("Settings", "gu")).toBe("સેટિંગ્સ");
    expect(tr("Money", "hi")).toBe("पैसा");
    expect(tr("Money", "gu")).toBe("પૈસા");
  });

  it("leaves English alone and passes unknown text through", () => {
    expect(tr("Settings", "en")).toBe("Settings");
    expect(tr("KYQ", "hi")).toBe("KYQ");
    expect(tr("Om Senjalia", "gu")).toBe("Om Senjalia");
    expect(tr("", "hi")).toBe("");
  });

  it("keeps the spacing the screen put around the text", () => {
    expect(tr("\n  Settings  \n", "hi")).toBe("\n  सेटिंग्स  \n");
  });

  it("fills values into translated sentences", () => {
    expect(tr("Parent of Om", "hi")).toBe("Om के पैरेंट");
    expect(tr("Parent of Om", "gu")).toBe("Omના વાલી");
    expect(tr("Chart for 15910 Avadh Assam Exp", "hi")).toBe("15910 अवध असम एक्स. का चार्ट");
    expect(tr("Next stop Ghaziabad at 08:28", "hi")).toBe("अगला स्टॉप गाज़ियाबाद, 08:28 बजे");
  });

  it("covers the words that show up on every screen", () => {
    const must = [
      "Home",
      "Train",
      "Ticket",
      "Plan",
      "Location",
      "Money",
      "More",
      "Settings",
      "Back",
      "Save",
      "Cancel",
      "Next train",
      "Chart prepared",
      "On time",
      "Language",
      "Choose your language",
      "I'm on the trip",
      "I'm a parent",
      "Share your location",
      "Allow location",
      "Not now",
      "Try again",
      "Something went wrong",
      "Total spent",
      "Team seats",
      "Show to TTE",
      "Trip plan",
      "Help lines",
      "System status",
      "Delete",
      "Continue",
      "Loading",
      "No alerts",
      "Where they are",
      "Trip complete",
      "Meals on the train",
      "Packing and prep",
      "Final report for the college",
    ];
    for (const key of must) expect(DICT[key], key).toBeDefined();
  });

  it("has a real translation for both languages on every entry", () => {
    for (const [en, [hi, gu]] of Object.entries(DICT)) {
      expect(en.trim(), en).toBe(en);
      expect(hi.length, en).toBeGreaterThan(0);
      expect(gu.length, en).toBeGreaterThan(0);
      // A copy of the English is almost always a missed translation.
      if (/[A-Za-z]{3}/.test(en) && !/^(\{|\d|IRCTC|PNR)/.test(en)) {
        expect(hi, en).not.toBe(en);
        expect(gu, en).not.toBe(en);
      }
    }
  });
});
