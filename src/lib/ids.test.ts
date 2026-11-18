import { describe, expect, it } from "vitest";
import { newCode, newId } from "./ids.ts";

describe("newId", () => {
  it("prefixes a random UUID", () => {
    expect(newId("d")).toMatch(/^d_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
  it("never repeats", () => {
    expect(new Set(Array.from({ length: 500 }, () => newId("x"))).size).toBe(500);
  });
});

describe("newCode", () => {
  it("returns exactly the requested number of digits", () => {
    for (let i = 0; i < 200; i++) expect(newCode(6)).toMatch(/^\d{6}$/);
  });
  it("uses every digit", () => {
    expect(new Set(Array.from({ length: 100 }, () => newCode(6)).join("")).size).toBe(10);
  });
});
