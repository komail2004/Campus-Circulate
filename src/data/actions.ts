// The rules of the marketplace. Each function takes the current data and
// returns an updated copy (it never changes the old one).

import { makeCode, makeId } from "../lib/ids.ts";
import type { Deal, Listing, User } from "../types.ts";
import { campusForEmail, places } from "./places.ts";

export type Data = {
  users: User[];
  listings: Listing[];
  deals: Deal[];
};

export function isEduEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.edu$/i.test(email.trim());
}

// Create an account. Any .edu student can join and buy; `dorm` is only set for students on a Campus Circulate campus.
export function addUser(data: Data, name: string, email: string, dorm?: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim()) throw new Error("Enter your name.");
  if (!isEduEmail(cleanEmail)) throw new Error("Campus Circulate is for students only. Use your .edu email.");
  if (data.users.some((u) => u.email === cleanEmail)) throw new Error("There's already an account with that email. Sign in instead.");

  const user: User = { id: makeId("u"), name: name.trim(), email: cleanEmail, dorm };
  return { data: { ...data, users: [...data.users, user] }, user };
}

export function createListing(
  data: Data,
  sellerId: string,
  input: Pick<Listing, "title" | "priceCents" | "location" | "category" | "description" | "photoUrl">,
) {
  // You can only sell on the campus your .edu email belongs to
  const seller = data.users.find((u) => u.id === sellerId);
  const campus = seller ? campusForEmail(seller.email) : undefined;
  if (!campus) throw new Error("Only students at a Campus Circulate campus can sell.");
  const place = places.find((p) => p.name === input.location);
  if (place?.campusId !== campus.id) throw new Error(`You can only sell on your own campus (${campus.name}).`);

  const listing: Listing = { ...input, id: makeId("l"), sellerId, status: "active" };
  return { data: { ...data, listings: [listing, ...data.listings] }, listing };
}

// Buying reserves the item and holds the payment until the handoff.
export function buyListing(data: Data, listingId: string, buyerId: string) {
  const listing = data.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error("That listing doesn't exist.");
  if (listing.sellerId === buyerId) throw new Error("You can't buy your own listing.");
  if (listing.status !== "active") throw new Error("Someone already reserved this item.");

  const deal: Deal = {
    id: makeId("d"),
    listingId,
    buyerId,
    sellerId: listing.sellerId,
    amountCents: listing.priceCents,
    handoffCode: makeCode(4),
    status: "held",
    messages: [],
  };
  const listings = data.listings.map((l): Listing => (l.id === listingId ? { ...l, status: "reserved" } : l));
  return { data: { ...data, listings, deals: [deal, ...data.deals] }, deal };
}

export function sendMessage(data: Data, dealId: string, senderId: string, text: string): Data {
  const message = { id: makeId("m"), senderId, text: text.trim() };
  const deals = data.deals.map((d): Deal => (d.id === dealId ? { ...d, messages: [...d.messages, message] } : d));
  return { ...data, deals };
}

// The seller types the code the buyer gives them at the meetup.
// If it matches, the payment is released and the item is sold.
export function confirmHandoff(data: Data, dealId: string, sellerId: string, code: string): Data {
  const deal = data.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("That deal doesn't exist.");
  if (deal.sellerId !== sellerId) throw new Error("Only the seller can confirm the handoff.");
  if (code.trim() !== deal.handoffCode) throw new Error("That code doesn't match. Ask the buyer to read it again.");

  const deals = data.deals.map((d): Deal => (d.id === dealId ? { ...d, status: "released" } : d));
  const listings = data.listings.map((l): Listing => (l.id === deal.listingId ? { ...l, status: "sold" } : l));
  return { ...data, deals, listings };
}
