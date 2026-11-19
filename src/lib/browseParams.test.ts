import { describe, expect, it } from "vitest";
import { browseSearch, readBrowseParams } from "./browseParams.ts";

const defaults = { campusId: "cofc", from: "Berry Hall" };
const read = (search: string) => readBrowseParams(new URLSearchParams(search), defaults);

describe("readBrowseParams", () => {
  it("reads every filter", () => {
    expect(read("?q=lamp&category=Furniture&free=1&max=20&sort=price&campus=all&from=Craig%20Hall")).toEqual({
      query: "lamp", category: "Furniture", freeOnly: true, maxPriceCents: 2000, sort: "price", campusId: "all", from: "Craig Hall",
    });
  });

  it("falls back to defaults for unknown or hand-edited values", () => {
    expect(read("?category=Cars&max=-5&sort=random&campus=nowhere&from=Main%20Hall")).toEqual({
      query: "", category: null, freeOnly: false, maxPriceCents: null, sort: "nearest", campusId: "cofc", from: "Berry Hall",
    });
  });
});

describe("browseSearch", () => {
  it("writes only what isn't a default", () => {
    expect(browseSearch({ query: "desk", sort: "nearest", freeOnly: false })).toBe("?q=desk");
    expect(browseSearch({ category: "Textbooks", maxPriceCents: 1500, sort: "newest" })).toBe("?category=Textbooks&max=15&sort=newest");
    expect(browseSearch({})).toBe("");
    expect(browseSearch({ campusId: "cofc", from: "Berry Hall" }, defaults)).toBe("");
    expect(browseSearch({ campusId: "all", from: "Craig Hall" }, defaults)).toBe("?campus=all&from=Craig+Hall");
  });
});
