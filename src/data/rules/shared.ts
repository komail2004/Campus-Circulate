// Helpers the rule files share. Pages don't use these.

import type { CloseReason, Data, Deal, Listing, Message, User } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { check } from "./errors.ts";

export function getUser(data: Data, id: string): User {
  const user = data.users.find((u) => u.id === id);
  check(user, "That account doesn't exist.");
  return user;
}

export function getListing(data: Data, id: string): Listing {
  const listing = data.listings.find((l) => l.id === id);
  check(listing, "That listing doesn't exist.");
  return listing;
}

export function getDeal(data: Data, id: string): Deal {
  const deal = data.deals.find((d) => d.id === id);
  check(deal, "That deal doesn't exist.");
  return deal;
}

export function isParty(deal: Deal, userId: string): boolean {
  return deal.buyerId === userId || deal.sellerId === userId;
}

export function otherParty(deal: Deal, userId: string): string {
  return deal.buyerId === userId ? deal.sellerId : deal.buyerId;
}

// A copy of `items` with one item's fields changed.
export function patch<T extends { id: string }>(items: T[], id: string, changes: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

// Change a deal and stamp it as the latest activity.
export function patchDeal(data: Data, ctx: RuleContext, dealId: string, changes: Partial<Deal>): Data {
  return { ...data, deals: patch(data.deals, dealId, { ...changes, updatedAt: ctx.now }) };
}

// A gray line in the chat recording what happened ("Bob Smith accepted the $15 offer.").
export function addEvent(data: Data, ctx: RuleContext, dealId: string, text: string, actorId: string | null = null): Data {
  const event: Message = { id: ctx.newId("m"), dealId, senderId: actorId, text, sentAt: ctx.now, kind: "event" };
  return { ...data, messages: [...data.messages, event] };
}

// Open (not yet paid) deals on a listing, optionally leaving one out.
export function openDealsOn(data: Data, listingId: string, exceptDealId: string | null): Deal[] {
  return data.deals.filter((d) => d.listingId === listingId && d.status === "open" && d.id !== exceptDealId);
}

// Tell every other open deal on a listing what happened (reserved, back on sale).
export function notifyOpenDeals(data: Data, ctx: RuleContext, listingId: string, exceptDealId: string | null, text: string): Data {
  return openDealsOn(data, listingId, exceptDealId).reduce(
    (next, deal) => addEvent(patchDeal(next, ctx, deal.id, {}), ctx, deal.id, text),
    data,
  );
}

// Close every other open deal on a listing (it sold, or the seller removed it).
export function closeOpenDeals(data: Data, ctx: RuleContext, listingId: string, exceptDealId: string | null, reason: CloseReason, text: string): Data {
  return openDealsOn(data, listingId, exceptDealId).reduce(
    (next, deal) => addEvent(patchDeal(next, ctx, deal.id, { status: "closed", closeReason: reason, offer: null }), ctx, deal.id, text),
    data,
  );
}
