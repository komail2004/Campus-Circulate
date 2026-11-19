import { describe, expect, it } from "vitest";
import { ctxAt, dealIn, eventsIn, opened, paid } from "../../test/fixtures.ts";
import { cancelDeal } from "./deals.ts";
import { acceptMeetup, proposeMeetup } from "./meetups.ts";

const SOON = "2026-11-18T15:00:00.000Z";
const spot = "Craig Hall lobby";

describe("proposeMeetup", () => {
  it("records a proposal once the item is paid for", () => {
    const { data, dealId } = paid();
    const next = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(dealIn(next, dealId).meetup).toEqual({ spot, time: SOON, proposedBy: "bob", agreed: false });
    expect(eventsIn(next, dealId)).toContain("Bob Smith suggested a meetup.");
  });

  it("needs a paid deal", () => {
    const { data, dealId } = opened();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot, time: SOON })).toThrow(/once the item is paid/);
  });

  it("only allows the suggested spots", () => {
    const { data, dealId } = paid();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot: "My apartment", time: SOON })).toThrow(/suggested meetup spots/);
  });

  it.each(["2026-11-17T14:00:00.000Z", "2026-12-01T15:00:01.000Z", "2026-11-18 15:00", "tomorrow"])("refuses the time %s", (time) => {
    const { data, dealId } = paid();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot, time })).toThrow(/next 14 days/);
  });
});

describe("acceptMeetup", () => {
  it("is agreed by the other person and remembered for good", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(() => acceptMeetup(proposed, ctxAt(), "bob", dealId)).toThrow(/Wait for the other person/);

    const agreed = acceptMeetup(proposed, ctxAt(), "will", dealId).data;
    expect(dealIn(agreed, dealId)).toMatchObject({ meetup: { agreed: true }, meetupEverAgreed: true });
    expect(eventsIn(agreed, dealId)).toContain("Will Baldwin agreed to the meetup.");

    const changed = proposeMeetup(agreed, ctxAt(), "will", dealId, { spot: "Cistern Yard", time: SOON }).data;
    expect(dealIn(changed, dealId)).toMatchObject({ meetup: { agreed: false }, meetupEverAgreed: true });
  });

  it("refuses a time that has already passed", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(() => acceptMeetup(proposed, ctxAt("2026-11-18T16:00:00.000Z"), "will", dealId)).toThrow(/has passed/);
  });
});

describe("cancelling after a meetup", () => {
  it("is seller-only once a meetup was ever agreed, even if a new one is proposed", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    const agreed = acceptMeetup(proposed, ctxAt(), "will", dealId).data;
    expect(() => cancelDeal(agreed, ctxAt(), "will", dealId)).toThrow(/only the seller/);

    const reproposed = proposeMeetup(agreed, ctxAt(), "will", dealId, { spot: "Cistern Yard", time: SOON }).data;
    expect(() => cancelDeal(reproposed, ctxAt(), "will", dealId)).toThrow(/only the seller/);
    expect(() => cancelDeal(reproposed, ctxAt(), "bob", dealId)).not.toThrow();
  });
});
