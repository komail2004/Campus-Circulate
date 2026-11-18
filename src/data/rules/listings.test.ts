import { describe, expect, it } from "vitest";
import { aListing, ctxAt, listingIn, NOW, someData } from "../../test/fixtures.ts";
import type { ListingInput } from "../../types.ts";
import { createListing, removeListing, updateListing } from "./listings.ts";

const form: ListingInput = { title: "Lamp", priceCents: 500, location: "Berry Hall", category: "Furniture", description: "Works" };

describe("createListing", () => {
  it("adds an active listing at the top", () => {
    const { data, listing } = createListing(someData(), ctxAt(), "bob", form);
    expect(listing).toMatchObject({ ...form, sellerId: "bob", status: "active", createdAt: NOW });
    expect(data.listings[0]).toEqual(listing);
  });

  it("normalizes course codes on textbooks and drops them elsewhere", () => {
    expect(createListing(someData(), ctxAt(), "bob", { ...form, category: "Textbooks", courseCode: "math120" }).listing.courseCode).toBe("MATH 120");
    expect(createListing(someData(), ctxAt(), "bob", { ...form, courseCode: "MATH 120" }).listing.courseCode).toBeUndefined();
  });

  it("accepts our own photos and canvas JPEGs", () => {
    for (const photoUrl of ["/listings/desk-chair.webp", "data:image/jpeg;base64,/9j/4AAQSkZJRg=="]) {
      expect(createListing(someData(), ctxAt(), "bob", { ...form, photoUrl }).listing.photoUrl).toBe(photoUrl);
    }
  });

  it.each([
    [{ title: "ab" }, /title/],
    [{ title: "x".repeat(81) }, /title/],
    [{ description: "x".repeat(1001) }, /description/],
    [{ priceCents: -1 }, /price/],
    [{ priceCents: 1.5 }, /price/],
    [{ priceCents: 1_000_001 }, /price/],
    [{ location: "Main Hall" }, /pickup spot/],
    [{ category: "Cars" as ListingInput["category"] }, /category/],
    [{ photoUrl: "https://example.com/x.png" }, /photo/],
    [{ photoUrl: "javascript:alert(1)" }, /photo/],
    [{ photoUrl: "data:image/svg+xml;base64,PHN2Zz4=" }, /photo/],
    [{ category: "Textbooks" as const, courseCode: "calculus" }, /Course codes/],
  ])("refuses %j", (changes, message) => {
    expect(() => createListing(someData(), ctxAt(), "bob", { ...form, ...changes })).toThrow(message);
  });

  it("only lets students on a supported campus sell", () => {
    expect(() => createListing(someData(), ctxAt(), "sam", form)).toThrow(/CampusCirculate campus/);
  });
});

describe("updateListing", () => {
  it("lets the seller edit an active listing", () => {
    const { data } = updateListing(someData(), ctxAt(), "bob", "chair", { ...form, title: "Office chair" });
    expect(listingIn(data).title).toBe("Office chair");
  });

  it("refuses anyone but the seller, and listings that aren't active", () => {
    expect(() => updateListing(someData(), ctxAt(), "will", "chair", form)).toThrow(/Only the seller/);
    const reserved = someData({ listings: [aListing({ status: "reserved" })] });
    expect(() => updateListing(reserved, ctxAt(), "bob", "chair", form)).toThrow(/Cancel that deal first/);
    const sold = someData({ listings: [aListing({ status: "sold" })] });
    expect(() => updateListing(sold, ctxAt(), "bob", "chair", form)).toThrow(/can't be changed/);
  });
});

describe("removeListing", () => {
  it("marks it removed", () => {
    expect(listingIn(removeListing(someData(), ctxAt(), "bob", "chair").data).status).toBe("removed");
  });

  it("refuses while someone has paid", () => {
    const reserved = someData({ listings: [aListing({ status: "reserved" })] });
    expect(() => removeListing(reserved, ctxAt(), "bob", "chair")).toThrow(/Cancel that deal first/);
  });
});
