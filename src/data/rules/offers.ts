// Offers: before paying, either person can propose a lower price; the other accepts or declines.
// An accepted offer sets what the buyer pays but doesn't reserve the item; paying does.

import { formatPrice } from "../../lib/format.ts";
import type { Data, Deal } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { allow, check } from "./errors.ts";
import { addEvent, getDeal, getListing, getUser, isParty, patchDeal } from "./shared.ts";

export function whyNotOffer(data: Data, deal: Deal, actorId: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status !== "open") return "Offers can only be made before paying.";
  const listing = getListing(data, deal.listingId);
  if (listing.priceCents === 0) return "This item is free.";
  if (listing.status !== "active") return "Another student reserved this item.";
  return null;
}

export function makeOffer(data: Data, ctx: RuleContext, actorId: string, dealId: string, amountCents: number) {
  const deal = getDeal(data, dealId);
  allow(whyNotOffer(data, deal, actorId));
  const asking = getListing(data, deal.listingId).priceCents;
  check(Number.isSafeInteger(amountCents) && amountCents > 0 && amountCents < asking, `Offer less than the ${formatPrice(asking)} asking price.`);

  const next = patchDeal(data, ctx, dealId, { offer: { amountCents, byUserId: actorId, status: "pending" } });
  return { data: addEvent(next, ctx, dealId, `${getUser(data, actorId).name} offered ${formatPrice(amountCents)}.`, actorId) };
}

export function whyNotAnswerOffer(deal: Deal, actorId: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status !== "open" || deal.offer?.status !== "pending") return "There's no offer waiting for an answer.";
  if (deal.offer.byUserId === actorId) return "Wait for the other person to answer your offer.";
  return null;
}

export function acceptOffer(data: Data, ctx: RuleContext, actorId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  allow(whyNotAnswerOffer(deal, actorId));
  check(deal.offer, "There's no offer waiting for an answer.");
  check(getListing(data, deal.listingId).status === "active", "Another student reserved this item.");

  const next = patchDeal(data, ctx, dealId, { offer: { ...deal.offer, status: "accepted" } });
  return { data: addEvent(next, ctx, dealId, `${getUser(data, actorId).name} accepted the ${formatPrice(deal.offer.amountCents)} offer.`, actorId) };
}

export function declineOffer(data: Data, ctx: RuleContext, actorId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  allow(whyNotAnswerOffer(deal, actorId));
  check(deal.offer, "There's no offer waiting for an answer.");

  const next = patchDeal(data, ctx, dealId, { offer: null });
  return { data: addEvent(next, ctx, dealId, `${getUser(data, actorId).name} declined the ${formatPrice(deal.offer.amountCents)} offer.`, actorId) };
}
