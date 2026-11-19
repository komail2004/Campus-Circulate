import { describe, expect, it } from "vitest";
import { aListing, bob, ctxAt, dealIn, opened, paid, someData } from "../test/fixtures.ts";
import { places } from "./campus.ts";
import { cancelDeal, markRead, sendMessage, startDeal } from "./rules/index.ts";
import {
  browseListings, dealsForUser, dealStatusLabel, displayName, handoffCodeFor, savedListings,
  thumbsUpPercent, unreadCount, unreadDealCount, type BrowseFilters,
} from "./selectors.ts";

describe("displayName", () => {
  it("shows full names to signed-in students and first name + initial to visitors", () => {
    expect(displayName(bob, true)).toBe("Bob Smith");
    expect(displayName(bob, false)).toBe("Bob S.");
    expect(displayName({ ...bob, name: "Cher" }, false)).toBe("Cher");
    expect(displayName({ ...bob, name: "Mary Ann van der berg" }, false)).toBe("Mary B.");
    expect(displayName(undefined, true)).toBe("Unknown student");
  });
});

describe("browseListings", () => {
  const berry = places[0]; // Berry Hall
  const all: BrowseFilters = { query: "", category: null, campusId: "all", origin: berry, sort: "nearest", freeOnly: false, maxPriceCents: null };
  const listings = [
    aListing({ id: "near", location: "Berry Hall", priceCents: 3000, createdAt: "2026-11-01T00:00:00.000Z" }),
    aListing({ id: "far", location: "McConnel Hall", priceCents: 500, createdAt: "2026-11-05T00:00:00.000Z" }),
    aListing({ id: "free", location: "Craig Hall", priceCents: 0, title: "Free lamp", createdAt: "2026-11-03T00:00:00.000Z" }),
    aListing({ id: "book", location: "Craig Hall", category: "Textbooks", title: "Calculus", courseCode: "MATH 120", createdAt: "2026-11-02T00:00:00.000Z" }),
    aListing({ id: "sold", status: "sold" }),
    aListing({ id: "gone", status: "removed" }),
    aListing({ id: "held", status: "reserved", location: "Berry Hall" }),
  ];
  const ids = (changes: Partial<BrowseFilters>) => browseListings(listings, { ...all, ...changes }).map((r) => r.listing.id);

  it("hides sold and removed listings and sorts nearest first, newest breaking ties", () => {
    expect(ids({})).toEqual(["held", "near", "free", "book", "far"]);
  });

  it("filters by category, price and free", () => {
    expect(ids({ category: "Textbooks" })).toEqual(["book"]);
    expect(ids({ freeOnly: true })).toEqual(["free"]);
    expect(ids({ maxPriceCents: 1000 })).toEqual(["free", "far"]);
  });

  it("searches titles, descriptions and course codes however they're typed", () => {
    expect(ids({ query: "lamp" })).toEqual(["free"]);
    expect(ids({ query: "math120" })).toEqual(["book"]);
    expect(ids({ query: "Math 120" })).toEqual(["book"]);
  });

  it("sorts by newest or price", () => {
    expect(ids({ sort: "newest" })).toEqual(["far", "free", "book", "held", "near"]);
    expect(ids({ sort: "price" })).toEqual(["free", "far", "held", "book", "near"]);
  });

  it("filters by campus", () => {
    expect(ids({ campusId: "cofc" })).toHaveLength(5);
    expect(ids({ campusId: "elsewhere" })).toEqual([]);
  });
});

describe("deal views", () => {
  it("counts unread messages from the other person since the last read", () => {
    const { data, dealId } = opened();
    const withMessage = sendMessage(data, ctxAt("2026-11-17T16:00:00.000Z"), "bob", dealId, "Hi").data;
    expect(unreadCount(withMessage, dealId, "will")).toBe(1);
    expect(unreadCount(withMessage, dealId, "bob")).toBe(0);
    expect(unreadDealCount(withMessage, "will")).toBe(1);
    const read = markRead(withMessage, ctxAt("2026-11-17T16:05:00.000Z"), "will", dealId).data;
    expect(unreadCount(read, dealId, "will")).toBe(0);
  });

  it("lists a student's deals by latest activity", () => {
    const two = someData({ listings: [aListing(), aListing({ id: "lamp" })] });
    const a = startDeal(two, ctxAt("2026-11-17T10:00:00.000Z"), "will", "chair");
    const b = startDeal(a.data, ctxAt("2026-11-17T11:00:00.000Z"), "will", "lamp");
    expect(dealsForUser(b.data, "will").map((d) => d.id)).toEqual([b.deal.id, a.deal.id]);
    const bumped = sendMessage(b.data, ctxAt("2026-11-17T12:00:00.000Z"), "will", a.deal.id, "Still there?").data;
    expect(dealsForUser(bumped, "will").map((d) => d.id)).toEqual([a.deal.id, b.deal.id]);
    expect(dealsForUser(bumped, "ann")).toEqual([]);
  });

  it("shows the handoff code to the buyer only", () => {
    const { data, dealId } = paid();
    expect(handoffCodeFor(data, dealIn(data, dealId), "will")?.code).toBe("123456");
    expect(handoffCodeFor(data, dealIn(data, dealId), "bob")).toBeUndefined();
  });

  it("labels each status", () => {
    const { data, dealId } = opened();
    expect(dealStatusLabel(data, dealIn(data, dealId))).toBe("Chatting");
    expect(dealStatusLabel(data, dealIn(cancelDeal(data, ctxAt(), "bob", dealId).data, dealId))).toBe("Cancelled by Bob Smith");
    const held = paid();
    expect(dealStatusLabel(held.data, dealIn(held.data, held.dealId))).toBe("Payment held");
  });
});

describe("profile views", () => {
  it("works out thumbs-up percent only once someone has rated", () => {
    expect(thumbsUpPercent({ completedHandoffs: 3, thumbsUp: 0, thumbsDown: 0 })).toBeNull();
    expect(thumbsUpPercent({ completedHandoffs: 4, thumbsUp: 3, thumbsDown: 1 })).toBe(75);
  });

  it("lists saved listings newest first, skipping removed ones", () => {
    const data = someData({
      listings: [aListing(), aListing({ id: "lamp" }), aListing({ id: "gone", status: "removed" })],
      saves: [
        { userId: "will", listingId: "chair", savedAt: "2026-11-10T00:00:00.000Z" },
        { userId: "will", listingId: "lamp", savedAt: "2026-11-12T00:00:00.000Z" },
        { userId: "will", listingId: "gone", savedAt: "2026-11-13T00:00:00.000Z" },
        { userId: "ann", listingId: "chair", savedAt: "2026-11-14T00:00:00.000Z" },
      ],
    });
    expect(savedListings(data, "will").map((l) => l.id)).toEqual(["lamp", "chair"]);
  });
});
