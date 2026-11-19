import { describe, expect, it } from "vitest";
import { aListing, ctxAt, dealIn, eventsIn, listingIn, NOW, opened, paid, someData } from "../../test/fixtures.ts";
import { cancelDeal, markRead, payDeal, sendMessage, startDeal } from "./deals.ts";
import { removeListing } from "./listings.ts";

describe("startDeal", () => {
  it("opens a deal between the buyer and the seller", () => {
    const { data, dealId } = opened();
    expect(dealIn(data, dealId)).toMatchObject({
      listingId: "chair", buyerId: "will", sellerId: "bob", status: "open", offer: null,
      paidCents: null, meetupEverAgreed: false, closeReason: null, createdAt: NOW,
    });
  });

  it("reuses the buyer's active deal", () => {
    const { data, dealId } = opened();
    expect(startDeal(data, ctxAt(), "will", "chair").deal.id).toBe(dealId);
  });

  it("lets a buyer start over after cancelling", () => {
    const { data, dealId } = opened();
    const cancelled = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(startDeal(cancelled, ctxAt(), "will", "chair").deal.id).not.toBe(dealId);
  });

  it("is allowed on reserved items but not sold or removed ones", () => {
    expect(() => startDeal(paid().data, ctxAt(), "ann", "chair")).not.toThrow();
    expect(() => startDeal(someData({ listings: [aListing({ status: "sold" })] }), ctxAt(), "will", "chair")).toThrow(/already sold/);
    expect(() => startDeal(someData({ listings: [aListing({ status: "removed" })] }), ctxAt(), "will", "chair")).toThrow(/removed/);
  });

  it("won't let sellers buy their own listing", () => {
    expect(() => startDeal(someData(), ctxAt(), "bob", "chair")).toThrow(/your listing/);
  });
});

describe("sendMessage", () => {
  it("adds a trimmed message and bumps the deal's activity time", () => {
    const { data, dealId } = opened();
    const later = "2026-11-17T16:00:00.000Z";
    const next = sendMessage(data, ctxAt(later), "bob", dealId, "  Still available ").data;
    expect(next.messages.at(-1)).toMatchObject({ dealId, senderId: "bob", text: "Still available", kind: "text", sentAt: later });
    expect(dealIn(next, dealId).updatedAt).toBe(later);
  });

  it("refuses outsiders, empty or long messages, and closed deals", () => {
    const { data, dealId } = opened();
    expect(() => sendMessage(data, ctxAt(), "ann", dealId, "hi")).toThrow(/not part/);
    expect(() => sendMessage(data, ctxAt(), "will", dealId, "   ")).toThrow(/1–1,000/);
    expect(() => sendMessage(data, ctxAt(), "will", dealId, "x".repeat(1001))).toThrow(/1–1,000/);
    const closed = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(() => sendMessage(closed, ctxAt(), "will", dealId, "hi")).toThrow(/closed/);
  });
});

describe("payDeal", () => {
  it("holds the asking price, reserves the item and makes a buyer-only code", () => {
    const { data, dealId } = paid();
    expect(dealIn(data, dealId)).toMatchObject({ status: "held", paidCents: 2000 });
    expect(listingIn(data).status).toBe("reserved");
    expect(data.handoffCodes).toEqual([{ dealId, buyerId: "will", code: "123456", wrongTries: 0 }]);
    expect(eventsIn(data, dealId)).toEqual(["Will Baldwin paid $20. It's held until the handoff."]);
  });

  it("tells other buyers the item is reserved and stops them paying", () => {
    const annDeal = opened(someData(), "ann");
    const { data } = paid(annDeal.data);
    expect(eventsIn(data, annDeal.dealId)).toEqual(["Another student reserved this item."]);
    expect(() => payDeal(data, ctxAt(), "ann", annDeal.dealId)).toThrow(/already reserved/);
  });

  it("reserves free items without a payment", () => {
    const { data, dealId } = paid(someData({ listings: [aListing({ priceCents: 0 })] }));
    expect(dealIn(data, dealId).paidCents).toBe(0);
    expect(eventsIn(data, dealId)).toEqual(["Will Baldwin reserved the item."]);
  });

  it("only lets the buyer pay, once", () => {
    const { data, dealId } = opened();
    expect(() => payDeal(data, ctxAt(), "bob", dealId)).toThrow(/Only the buyer/);
    const held = payDeal(data, ctxAt(), "will", dealId).data;
    expect(() => payDeal(held, ctxAt(), "will", dealId)).toThrow(/isn't waiting for payment/);
  });
});

describe("cancelDeal", () => {
  it("lets either person cancel before paying", () => {
    const { data, dealId } = opened();
    expect(dealIn(cancelDeal(data, ctxAt(), "bob", dealId).data, dealId)).toMatchObject({ status: "closed", closeReason: "cancelled_by_seller" });
    expect(dealIn(cancelDeal(data, ctxAt(), "will", dealId).data, dealId).closeReason).toBe("cancelled_by_buyer");
  });

  it("refunds a paid deal, frees the item and tells other buyers", () => {
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    const next = cancelDeal(data, ctxAt(), "bob", dealId).data;
    expect(listingIn(next).status).toBe("active");
    expect(next.handoffCodes).toEqual([]);
    expect(eventsIn(next, dealId)).toContain("Bob Smith cancelled. The $20 payment was refunded.");
    expect(eventsIn(next, annDeal.dealId)).toContain("This item is back on sale.");
  });

  it("lets the buyer cancel a paid deal before any meetup is agreed", () => {
    const { data, dealId } = paid();
    expect(dealIn(cancelDeal(data, ctxAt(), "will", dealId).data, dealId).closeReason).toBe("cancelled_by_buyer");
  });

  it("refuses outsiders and finished deals", () => {
    const { data, dealId } = opened();
    expect(() => cancelDeal(data, ctxAt(), "ann", dealId)).toThrow(/not part/);
    const closed = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(() => cancelDeal(closed, ctxAt(), "will", dealId)).toThrow(/already finished/);
  });
});

describe("removing a listing", () => {
  it("closes its open deals", () => {
    const { data, dealId } = opened();
    const next = removeListing(data, ctxAt(), "bob", "chair").data;
    expect(dealIn(next, dealId)).toMatchObject({ status: "closed", closeReason: "listing_removed" });
    expect(eventsIn(next, dealId)).toContain("The seller removed this listing.");
  });
});

describe("markRead", () => {
  it("records when each person last read the deal", () => {
    const { data, dealId } = opened();
    const once = markRead(data, ctxAt("2026-11-17T16:00:00.000Z"), "will", dealId).data;
    const twice = markRead(once, ctxAt("2026-11-17T17:00:00.000Z"), "will", dealId).data;
    expect(twice.dealReads).toEqual([{ dealId, userId: "will", lastReadAt: "2026-11-17T17:00:00.000Z" }]);
    expect(() => markRead(data, ctxAt(), "ann", dealId)).toThrow(/not part/);
  });
});
