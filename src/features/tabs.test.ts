import { describe, expect, it } from "vitest";
import { TRIP_SPAN } from "@/data/trip";
import { DAY, VISIBLE, onTripAt, shownTabs } from "@/core/tabs";
import { ms } from "@/lib/time";

/**
 * The Food tab was invisible on the evening before departure because the trip
 * window opened at the first train's departure instead of the day before. These
 * are the cases that broke, pinned.
 */

describe("the trip window that shows the Food tab", () => {
  it("is on the evening before the first train, 12 hours out", () => {
    const eveningBefore = ms(TRIP_SPAN.start) - 12 * 60 * 60 * 1000;
    expect(onTripAt(eveningBefore)).toBe(true);
    expect(shownTabs("team", eveningBefore)).toContain("food");
  });

  it("is on from exactly 24 hours before departure", () => {
    expect(onTripAt(ms(TRIP_SPAN.start) - DAY)).toBe(true);
    expect(onTripAt(ms(TRIP_SPAN.start) - DAY - 1)).toBe(false);
  });

  it("stays on through the whole journey and stops when we are home", () => {
    expect(onTripAt(ms(TRIP_SPAN.start))).toBe(true);
    expect(onTripAt(ms(TRIP_SPAN.end) - 1)).toBe(true);
    expect(onTripAt(ms(TRIP_SPAN.end))).toBe(false);
  });

  it("never shows food before the window opens, or to a parent", () => {
    expect(shownTabs("team", ms(TRIP_SPAN.start) - DAY - 1)).not.toContain("food");
    const midTrip = ms(TRIP_SPAN.start) + DAY;
    expect(shownTabs("parent", midTrip)).not.toContain("food");
    expect(shownTabs("team", midTrip)).toContain("food");
  });

  it("keeps the order of the team tabs", () => {
    const midTrip = ms(TRIP_SPAN.start) + DAY;
    expect(shownTabs("team", midTrip)).toEqual(["index", "train", "ticket", "food", "plan", "money", "more"]);
    expect(VISIBLE.parent).not.toContain("ticket");
  });
});
