import { describe, expect, it } from "vitest";
import { addDays, isUtcIso } from "./time.ts";

describe("isUtcIso", () => {
  it.each(["2026-11-17T15:00:00.000Z", "2026-11-17T15:00:00Z"])("accepts %s", (value) => {
    expect(isUtcIso(value)).toBe(true);
  });
  it.each(["2026-11-17", "2026-11-17 15:00", "2026-11-17T15:00:00+02:00", "2026-13-01T00:00:00Z", "soon"])(
    "rejects %s",
    (value) => {
      expect(isUtcIso(value)).toBe(false);
    },
  );
});

describe("addDays", () => {
  it("adds whole days across months", () => {
    expect(addDays("2026-11-17T15:00:00.000Z", 14)).toBe("2026-12-01T15:00:00.000Z");
  });
});
