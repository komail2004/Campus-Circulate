import { describe, expect, it } from "vitest";
import { aListing, ctxAt, dealIn, eventsIn, opened, paid, someData } from "../../test/fixtures.ts";
import { payDeal } from "./deals.ts";
import { updateListing } from "./listings.ts";
import { acceptOffer, declineOffer, makeOffer } from "./offers.ts";

describe("makeOffer", () => {
  it("lets either person offer below the asking price", () => {
    const { data, dealId } = opened();
    const next = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    expect(dealIn(next, dealId).offer).toEqual({ amountCents: 1500, byUserId: "will", status: "pending" });
    expect(eventsIn(next, dealId)).toEqual(["Will Baldwin offered $15."]);
    expect(dealIn(makeOffer(next, ctxAt(), "bob", dealId, 1800).data, dealId).offer?.byUserId).toBe("bob");
  });

  it.each([0, 2000, 2500, 12.5, -100])("refuses an offer of %d cents", (cents) => {
    const { data, dealId } = opened();
    expect(() => makeOffer(data, ctxAt(), "will", dealId, cents)).toThrow(/less than the \$20 asking price/);
  });

  it("refuses offers on free, reserved or paid items, and from outsiders", () => {
    const free = opened(someData({ listings: [aListing({ priceCents: 0 })] }));
    expect(() => makeOffer(free.data, ctxAt(), "will", free.dealId, 1)).toThrow(/free/);
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    expect(() => makeOffer(data, ctxAt(), "ann", annDeal.dealId, 1000)).toThrow(/reserved/);
    expect(() => makeOffer(data, ctxAt(), "will", dealId, 1000)).toThrow(/before paying/);
    expect(() => makeOffer(annDeal.data, ctxAt(), "will", annDeal.dealId, 1000)).toThrow(/not part/);
  });
});

describe("answering an offer", () => {
  it("is only for the other person", () => {
    const { data, dealId } = opened();
    const offered = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    expect(() => acceptOffer(offered, ctxAt(), "will", dealId)).toThrow(/Wait for the other person/);

    const accepted = acceptOffer(offered, ctxAt(), "bob", dealId).data;
    expect(dealIn(accepted, dealId).offer?.status).toBe("accepted");
    expect(eventsIn(accepted, dealId)).toContain("Bob Smith accepted the $15 offer.");

    const declined = declineOffer(offered, ctxAt(), "bob", dealId).data;
    expect(dealIn(declined, dealId).offer).toBeNull();
    expect(eventsIn(declined, dealId)).toContain("Bob Smith declined the $15 offer.");
    expect(() => declineOffer(declined, ctxAt(), "bob", dealId)).toThrow(/no offer waiting/);
  });

  it("can't accept once another student reserved the item", () => {
    const annDeal = opened(someData(), "ann");
    const offered = makeOffer(annDeal.data, ctxAt(), "ann", annDeal.dealId, 1500).data;
    const { data } = paid(offered);
    expect(() => acceptOffer(data, ctxAt(), "bob", annDeal.dealId)).toThrow(/reserved/);
  });

  it("sets the price the buyer pays", () => {
    const { data, dealId } = opened();
    const accepted = acceptOffer(makeOffer(data, ctxAt(), "will", dealId, 1500).data, ctxAt(), "bob", dealId).data;
    expect(dealIn(payDeal(accepted, ctxAt(), "will", dealId).data, dealId).paidCents).toBe(1500);
  });
});

describe("price edits", () => {
  const form = { title: "Desk chair", location: "Craig Hall", category: "Furniture" as const, description: "Rolls fine" };

  it("clear offers on open deals and say so", () => {
    const { data, dealId } = opened();
    const offered = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    const next = updateListing(offered, ctxAt(), "bob", "chair", { ...form, priceCents: 1800 }).data;
    expect(dealIn(next, dealId).offer).toBeNull();
    expect(eventsIn(next, dealId)).toContain("The price changed to $18, so the offer was cleared.");
  });

  it("say nothing when the price stays the same", () => {
    const { data, dealId } = opened();
    const next = updateListing(data, ctxAt(), "bob", "chair", { ...form, priceCents: 2000 }).data;
    expect(eventsIn(next, dealId)).toEqual([]);
  });
});
