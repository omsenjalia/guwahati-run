import { describe, expect, it } from "vitest";
import { forParent } from "@/lib/push-audience";

describe("forParent", () => {
  it("drops team-only alerts", () => {
    expect(forParent({ kind: "pnr", title: "WL 4 to CNF", body: "PNR 1234567890" })).toBeNull();
    expect(forParent({ kind: "settle", title: "Settle up" })).toBeNull();
  });

  it("keeps trip alerts without PNR numbers", () => {
    expect(forParent({ kind: "chart", title: "Chart prepared", body: "PNR 1234567890" })).toEqual({ kind: "chart", title: "Chart prepared", body: undefined });
    expect(forParent({ kind: "wake", title: "Wake up", body: "Guwahati in 30 min" })?.body).toBe("Guwahati in 30 min");
  });
});
