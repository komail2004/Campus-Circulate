import { describe, expect, it } from "vitest";
import { addDays, fromLocalInput, isUtcIso, localDate, messageWhen, toLocalInput } from "./time.ts";

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

describe("local display", () => {
  // built from local parts so the tests pass in any time zone
  const afternoon = new Date(2026, 10, 19, 15, 0).toISOString();

  it("shows dates as ISO in local time", () => {
    expect(localDate(afternoon)).toBe("2026-11-19");
  });
  it("round-trips the datetime-local input", () => {
    expect(toLocalInput(afternoon)).toBe("2026-11-19T15:00");
    expect(fromLocalInput("2026-11-19T15:00")).toBe(afternoon);
  });
  it("adds the date to message times from other days", () => {
    expect(messageWhen(afternoon, new Date(2026, 10, 19, 20, 0).toISOString())).not.toContain("2026");
    expect(messageWhen(afternoon, new Date(2026, 10, 20, 9, 0).toISOString())).toMatch(/^2026-11-19 /);
  });
});

describe("addDays", () => {
  it("adds whole days across months", () => {
    expect(addDays("2026-11-17T15:00:00.000Z", 14)).toBe("2026-12-01T15:00:00.000Z");
  });
});
