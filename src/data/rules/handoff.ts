// The handoff: the buyer shows a secret code at the meetup, the seller types it in, and that releases
// the payment. Code records are buyer-only; on a backend only the server may read them.

import type { Data, Deal, Rating, UserStats } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { allow, check } from "./errors.ts";
import { addEvent, closeOpenDeals, getDeal, getUser, isParty, otherParty, patch, patchDeal } from "./shared.ts";

export const HANDOFF_CODE_DIGITS = 6;
// 10 tries against a million codes; then the buyer has to make a new code.
export const MAX_WRONG_TRIES = 10;

export type HandoffResult = { data: Data; matched: true } | { data: Data; matched: false; triesLeft: number };

function bumpStat(data: Data, userId: string, stat: keyof UserStats): Data {
  const stats = { ...getUser(data, userId).stats };
  stats[stat] += 1;
  return { ...data, users: patch(data.users, userId, { stats }) };
}

export function whyNotConfirm(deal: Deal, actorId: string): string | null {
  if (deal.sellerId !== actorId) return "Only the seller can confirm the handoff.";
  if (deal.status !== "held") return "This deal isn't waiting for a handoff.";
  return null;
}

export function confirmHandoff(data: Data, ctx: RuleContext, sellerId: string, dealId: string, code: string): HandoffResult {
  const deal = getDeal(data, dealId);
  allow(whyNotConfirm(deal, sellerId));
  const secret = data.handoffCodes.find((c) => c.dealId === dealId);
  check(secret, "This deal has no handoff code. Ask the buyer to make one.");
  check(secret.wrongTries < MAX_WRONG_TRIES, "Too many wrong codes. Ask the buyer to make a new one.");

  if (code.trim() !== secret.code) {
    // Returned, not thrown: the failed try has to be saved or the limit would mean nothing.
    const wrongTries = secret.wrongTries + 1;
    const handoffCodes = data.handoffCodes.map((c) => (c.dealId === dealId ? { ...c, wrongTries } : c));
    return { data: { ...data, handoffCodes }, matched: false, triesLeft: MAX_WRONG_TRIES - wrongTries };
  }

  let next: Data = {
    ...patchDeal(data, ctx, dealId, { status: "completed" }),
    listings: patch(data.listings, deal.listingId, { status: "sold" }),
    handoffCodes: data.handoffCodes.filter((c) => c.dealId !== dealId),
  };
  next = bumpStat(bumpStat(next, deal.buyerId, "completedHandoffs"), deal.sellerId, "completedHandoffs");
  next = addEvent(next, ctx, dealId, "Handoff complete. The item is sold.");
  return { data: closeOpenDeals(next, ctx, deal.listingId, dealId, "sold_elsewhere", "This item was sold to another student."), matched: true };
}

export function newHandoffCode(data: Data, ctx: RuleContext, buyerId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  check(deal.buyerId === buyerId, "Only the buyer can make a new code.");
  check(deal.status === "held", "This deal isn't waiting for a handoff.");

  const handoffCodes = [...data.handoffCodes.filter((c) => c.dealId !== dealId), { dealId, buyerId, code: ctx.newCode(), wrongTries: 0 }];
  const next = patchDeal({ ...data, handoffCodes }, ctx, dealId, {});
  return { data: addEvent(next, ctx, dealId, `${getUser(data, buyerId).name} made a new handoff code.`, buyerId) };
}

export function whyNotRate(deal: Deal, actorId: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status !== "completed") return "You can rate once the handoff is done.";
  const mine = deal.buyerId === actorId ? deal.ratings.byBuyer : deal.ratings.bySeller;
  return mine ? "You already rated this deal." : null;
}

// Each person rates the other once. Only this rule changes thumbs counts.
export function rateDeal(data: Data, ctx: RuleContext, actorId: string, dealId: string, rating: Rating) {
  const deal = getDeal(data, dealId);
  allow(whyNotRate(deal, actorId));
  check(rating === "up" || rating === "down", "Pick thumbs up or thumbs down.");

  const ratings = deal.buyerId === actorId ? { ...deal.ratings, byBuyer: rating } : { ...deal.ratings, bySeller: rating };
  const next = patchDeal(data, ctx, dealId, { ratings });
  return { data: bumpStat(next, otherParty(deal, actorId), rating === "up" ? "thumbsUp" : "thumbsDown") };
}
