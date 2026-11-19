// A deal is one buyer's conversation about one listing: chat → (offer) → pay → meetup → handoff.

import { formatPrice } from "../../lib/format.ts";
import type { Data, Deal, Listing, Message } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { allow, check } from "./errors.ts";
import { addEvent, getDeal, getListing, getUser, isParty, notifyOpenDeals, patch, patchDeal } from "./shared.ts";

export const MESSAGE_MAX = 1000;

// What the buyer pays: the accepted offer if there is one, otherwise the asking price.
export function priceFor(deal: Deal, listing: Listing): number {
  return deal.offer?.status === "accepted" ? deal.offer.amountCents : listing.priceCents;
}

// A buyer's current deal on a listing. Closed deals don't count, so a buyer who cancelled can start again.
export function findActiveDeal(data: Data, listingId: string, buyerId: string): Deal | undefined {
  return data.deals.find((d) => d.listingId === listingId && d.buyerId === buyerId && (d.status === "open" || d.status === "held"));
}

export function whyNotStart(listing: Listing, buyerId: string): string | null {
  if (listing.sellerId === buyerId) return "This is your listing.";
  if (listing.status === "sold") return "This item has already sold.";
  if (listing.status === "removed") return "This listing was removed.";
  return null;
}

export function startDeal(data: Data, ctx: RuleContext, buyerId: string, listingId: string) {
  getUser(data, buyerId);
  const listing = getListing(data, listingId);
  allow(whyNotStart(listing, buyerId));
  const existing = findActiveDeal(data, listingId, buyerId);
  if (existing) return { data, deal: existing };

  const deal: Deal = {
    id: ctx.newId("d"), listingId, buyerId, sellerId: listing.sellerId, status: "open", offer: null, paidCents: null,
    meetup: null, meetupEverAgreed: false, ratings: {}, closeReason: null, createdAt: ctx.now, updatedAt: ctx.now,
  };
  return { data: { ...data, deals: [deal, ...data.deals] }, deal };
}

export function sendMessage(data: Data, ctx: RuleContext, senderId: string, dealId: string, text: string) {
  const deal = getDeal(data, dealId);
  check(isParty(deal, senderId), "You're not part of this deal.");
  check(deal.status === "open" || deal.status === "held", "This conversation is closed.");
  const clean = text.trim();
  check(clean.length > 0 && clean.length <= MESSAGE_MAX, "Messages can be 1–1,000 characters.");

  const message: Message = { id: ctx.newId("m"), dealId, senderId, text: clean, sentAt: ctx.now, kind: "text" };
  return { data: patchDeal({ ...data, messages: [...data.messages, message] }, ctx, dealId, {}) };
}

export function whyNotPay(data: Data, deal: Deal, actorId: string): string | null {
  if (deal.buyerId !== actorId) return "Only the buyer can pay.";
  if (deal.status !== "open") return "This deal isn't waiting for payment.";
  if (getListing(data, deal.listingId).status !== "active") return "Another student already reserved this item.";
  return null;
}

// Paying reserves the item and holds the money until the seller confirms the handoff code.
export function payDeal(data: Data, ctx: RuleContext, buyerId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  allow(whyNotPay(data, deal, buyerId));
  const listing = getListing(data, deal.listingId);
  const paidCents = priceFor(deal, listing);

  let next = patchDeal(data, ctx, dealId, { status: "held", paidCents, offer: deal.offer?.status === "accepted" ? deal.offer : null });
  next = {
    ...next,
    listings: patch(next.listings, listing.id, { status: "reserved" }),
    handoffCodes: [...next.handoffCodes.filter((c) => c.dealId !== dealId), { dealId, buyerId, code: ctx.newCode(), wrongTries: 0 }],
  };
  const name = getUser(data, buyerId).name;
  next = addEvent(next, ctx, dealId, paidCents > 0 ? `${name} paid ${formatPrice(paidCents)}. It's held until the handoff.` : `${name} reserved the item.`, buyerId);
  return { data: notifyOpenDeals(next, ctx, listing.id, dealId, "Another student reserved this item.") };
}

// Before paying, either person can walk away. After paying, the seller always can (the buyer is
// refunded), but the buyer only until a meetup has EVER been agreed: otherwise a buyer could take the
// item, keep the code, cancel and get their money back.
export function whyNotCancel(deal: Deal, actorId: string): string | null {
  if (!isParty(deal, actorId)) return "You're not part of this deal.";
  if (deal.status === "open") return null;
  if (deal.status !== "held") return "This deal is already finished.";
  if (deal.buyerId === actorId && deal.meetupEverAgreed) return "You agreed on a meetup, so only the seller can cancel now.";
  return null;
}

export function cancelDeal(data: Data, ctx: RuleContext, actorId: string, dealId: string) {
  const deal = getDeal(data, dealId);
  allow(whyNotCancel(deal, actorId));
  const name = getUser(data, actorId).name;
  const closeReason = deal.buyerId === actorId ? "cancelled_by_buyer" : "cancelled_by_seller";
  let next = patchDeal(data, ctx, dealId, { status: "closed", closeReason, offer: null });
  if (deal.status === "open") return { data: addEvent(next, ctx, dealId, `${name} cancelled.`, actorId) };

  // A paid deal: refund, put the item back on sale, and tell anyone else who asked about it.
  next = {
    ...next,
    listings: patch(next.listings, deal.listingId, { status: "active" }),
    handoffCodes: next.handoffCodes.filter((c) => c.dealId !== dealId),
  };
  const refund = deal.paidCents ? ` The ${formatPrice(deal.paidCents)} payment was refunded.` : "";
  next = addEvent(next, ctx, dealId, `${name} cancelled.${refund}`, actorId);
  return { data: notifyOpenDeals(next, ctx, deal.listingId, dealId, "This item is back on sale.") };
}

export function markRead(data: Data, ctx: RuleContext, userId: string, dealId: string) {
  check(isParty(getDeal(data, dealId), userId), "You're not part of this deal.");
  const others = data.dealReads.filter((r) => !(r.dealId === dealId && r.userId === userId));
  return { data: { ...data, dealReads: [...others, { dealId, userId, lastReadAt: ctx.now }] } };
}
