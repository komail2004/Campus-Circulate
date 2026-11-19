import { describe, expect, it } from "vitest";
import { ctxAt, dealIn, eventsIn, listingIn, opened, paid, someData, userIn } from "../../test/fixtures.ts";
import type { Data } from "../../types.ts";
import { confirmHandoff, MAX_WRONG_TRIES, newHandoffCode, rateDeal } from "./handoff.ts";

function handedOff() {
  const { data, dealId } = paid();
  return { data: confirmHandoff(data, ctxAt(), "bob", dealId, "123456").data, dealId };
}

describe("confirmHandoff", () => {
  it("completes the deal and sells the item when the code matches", () => {
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    const result = confirmHandoff(data, ctxAt(), "bob", dealId, " 123456 ");
    expect(result.matched).toBe(true);
    expect(dealIn(result.data, dealId).status).toBe("completed");
    expect(listingIn(result.data).status).toBe("sold");
    expect(result.data.handoffCodes).toEqual([]);
    expect(userIn(result.data, "bob").stats.completedHandoffs).toBe(1);
    expect(userIn(result.data, "will").stats.completedHandoffs).toBe(1);
    expect(dealIn(result.data, annDeal.dealId)).toMatchObject({ status: "closed", closeReason: "sold_elsewhere" });
    expect(eventsIn(result.data, annDeal.dealId)).toContain("This item was sold to another student.");
  });

  it("counts wrong codes without completing", () => {
    const { data, dealId } = paid();
    const result = confirmHandoff(data, ctxAt(), "bob", dealId, "000000");
    expect(result).toMatchObject({ matched: false, triesLeft: MAX_WRONG_TRIES - 1 });
    expect(dealIn(result.data, dealId).status).toBe("held");
    expect(result.data.handoffCodes[0].wrongTries).toBe(1);
  });

  it("locks the code after too many wrong tries until the buyer makes a new one", () => {
    const start = paid();
    let data: Data = start.data;
    for (let i = 0; i < MAX_WRONG_TRIES; i++) data = confirmHandoff(data, ctxAt(), "bob", start.dealId, "000000").data;
    expect(() => confirmHandoff(data, ctxAt(), "bob", start.dealId, "123456")).toThrow(/Too many wrong codes/);

    const fresh = newHandoffCode(data, ctxAt(undefined, "654321"), "will", start.dealId).data;
    expect(fresh.handoffCodes).toEqual([{ dealId: start.dealId, buyerId: "will", code: "654321", wrongTries: 0 }]);
    expect(eventsIn(fresh, start.dealId)).toContain("Will Baldwin made a new handoff code.");
    expect(confirmHandoff(fresh, ctxAt(), "bob", start.dealId, "654321").matched).toBe(true);
  });

  it("only lets the seller confirm a paid deal", () => {
    const { data, dealId } = paid();
    expect(() => confirmHandoff(data, ctxAt(), "will", dealId, "123456")).toThrow(/Only the seller/);
    const open = opened();
    expect(() => confirmHandoff(open.data, ctxAt(), "bob", open.dealId, "123456")).toThrow(/isn't waiting/);
  });
});

describe("newHandoffCode", () => {
  it("is only for the buyer of a paid deal", () => {
    const { data, dealId } = paid();
    expect(() => newHandoffCode(data, ctxAt(), "bob", dealId)).toThrow(/Only the buyer/);
    const open = opened();
    expect(() => newHandoffCode(open.data, ctxAt(), "will", open.dealId)).toThrow(/isn't waiting/);
  });
});

describe("rateDeal", () => {
  it("lets each person rate the other once after the handoff", () => {
    const { data, dealId } = handedOff();
    const rated = rateDeal(data, ctxAt(), "will", dealId, "up").data;
    expect(userIn(rated, "bob").stats.thumbsUp).toBe(1);
    expect(dealIn(rated, dealId).ratings).toEqual({ byBuyer: "up" });
    expect(() => rateDeal(rated, ctxAt(), "will", dealId, "down")).toThrow(/already rated/);

    const both = rateDeal(rated, ctxAt(), "bob", dealId, "down").data;
    expect(userIn(both, "will").stats.thumbsDown).toBe(1);
  });

  it("waits for the handoff and refuses outsiders", () => {
    const { data, dealId } = paid();
    expect(() => rateDeal(data, ctxAt(), "will", dealId, "up")).toThrow(/once the handoff/);
    const done = handedOff();
    expect(() => rateDeal(done.data, ctxAt(), "ann", done.dealId, "up")).toThrow(/not part/);
  });
});
