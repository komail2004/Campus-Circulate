import { describe, expect, it } from "vitest";
import { walkLabel } from "./distance.ts";

describe("walkLabel", () => {
  it("says the same hall honestly depending on where we measure from", () => {
    expect(walkLabel(0, true)).toBe("In your hall");
    expect(walkLabel(0, false)).toBe("Same hall");
  });
  it("turns miles into walking minutes, at least 1", () => {
    expect(walkLabel(0.02, true)).toBe("1 min walk");
    expect(walkLabel(0.1, true)).toBe("2 min walk");
    expect(walkLabel(0.55, false)).toBe("11 min walk");
  });
});
