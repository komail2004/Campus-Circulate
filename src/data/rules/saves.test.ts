import { describe, expect, it } from "vitest";
import { aListing, ctxAt, NOW, someData } from "../../test/fixtures.ts";
import { toggleSave } from "./saves.ts";

describe("toggleSave", () => {
  it("saves and unsaves", () => {
    const saved = toggleSave(someData(), ctxAt(), "will", "chair");
    expect(saved.saved).toBe(true);
    expect(saved.data.saves).toEqual([{ userId: "will", listingId: "chair", savedAt: NOW }]);
    expect(toggleSave(saved.data, ctxAt(), "will", "chair")).toMatchObject({ saved: false, data: { saves: [] } });
  });

  it("won't save a removed listing but lets you unsave it", () => {
    const removed = someData({ listings: [aListing({ status: "removed" })] });
    expect(() => toggleSave(removed, ctxAt(), "will", "chair")).toThrow(/removed/);
    const withSave = { ...removed, saves: [{ userId: "will", listingId: "chair", savedAt: NOW }] };
    expect(toggleSave(withSave, ctxAt(), "will", "chair").saved).toBe(false);
  });
});
