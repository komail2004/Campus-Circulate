// Meetups: after paying, buyer and seller agree on a public spot and a time for the handoff.

import { addDays, isUtcIso } from "../../lib/time.ts";
import type { Data, Deal } from "../../types.ts";
import { meetupSpots } from "../campus.ts";
import type { RuleContext } from "./context.ts";
import { allow, check } from "./errors.ts";
import { addEvent, getDeal, getListing, getUser, isParty, patchDeal } from "./shared.ts";

export const MEETUP_WINDOW_DAYS = 14;
export type MeetupInput = { spot: string; time: string }; // time: ISO-8601 UTC

export function whyNotProposeMeetup(deal: Deal, actorId: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status !== "held") return "You can plan a meetup once the item is paid for.";
  return null;
}

export function proposeMeetup(data: Data, ctx: RuleContext, actorId: string, dealId: string, input: MeetupInput) {
  const deal = getDeal(data, dealId);
  allow(whyNotProposeMeetup(deal, actorId));
  check(meetupSpots(getListing(data, deal.listingId)).includes(input.spot), "Pick one of the suggested meetup spots.");
  const at = Date.parse(input.time);
  const inWindow = at > Date.parse(ctx.now) && at <= Date.parse(addDays(ctx.now, MEETUP_WINDOW_DAYS));
  check(isUtcIso(input.time) && inWindow, `Pick a time in the next ${MEETUP_WINDOW_DAYS} days.`);

  const next = patchDeal(data, ctx, dealId, { meetup: { spot: input.spot, time: input.time, proposedBy: actorId, agreed: false } });
  return { data: addEvent(next, ctx, dealId, `${getUser(data, actorId).name} suggested a meetup.`, actorId) };
}

export function whyNotAcceptMeetup(deal: Deal, actorId: string, now: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status !== "held" || !deal.meetup || deal.meetup.agreed) return "There's no meetup waiting for an answer.";
  if (deal.meetup.proposedBy === actorId) return "Wait for the other person to answer.";
  if (Date.parse(deal.meetup.time) <= Date.parse(now)) return "That time has passed. Suggest a new one.";
  return null;
}

export function acceptMeetup(data: Data, ctx: RuleContext, actorId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  allow(whyNotAcceptMeetup(deal, actorId, ctx.now));
  check(deal.meetup, "There's no meetup waiting for an answer.");

  // meetupEverAgreed never goes back to false: proposing a new meetup must not restore the buyer's
  // right to cancel after they may already have the item.
  const next = patchDeal(data, ctx, dealId, { meetup: { ...deal.meetup, agreed: true }, meetupEverAgreed: true });
  return { data: addEvent(next, ctx, dealId, `${getUser(data, actorId).name} agreed to the meetup.`, actorId) };
}
