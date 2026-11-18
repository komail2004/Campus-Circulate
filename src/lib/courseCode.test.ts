import { describe, expect, it } from "vitest";
import { courseCodeKey, normalizeCourseCode } from "./courseCode.ts";

describe("normalizeCourseCode", () => {
  it.each([
    ["math120", "MATH 120"],
    ["MATH 120", "MATH 120"],
    [" Math-120b ", "MATH 120B"],
    ["csci 220L", "CSCI 220L"],
    ["ch 101", "CH 101"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeCourseCode(input)).toBe(expected);
  });
  it.each(["", "MATH", "120", "MATHEMATICS 120", "MATH 12", "MATH 1200", "MA TH 120", "MATH_120"])("rejects %j", (input) => {
    expect(normalizeCourseCode(input)).toBeNull();
  });
});

describe("courseCodeKey", () => {
  it("ignores case, spaces and dashes", () => {
    expect(courseCodeKey("math 120")).toBe("MATH120");
    expect(courseCodeKey("MATH-120")).toBe("MATH120");
  });
});
