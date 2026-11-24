// Read-only views of the data for pages. Nothing here changes anything.

import { courseCodeKey } from "../lib/courseCode.ts";
import { milesBetween } from "../lib/distance.ts";
import type { Category, Data, Deal, HandoffCode, Listing, Message, Place, User, UserStats } from "../types.ts";
import { placeByName } from "./campus.ts";

const time = (iso: string) => Date.parse(iso);

// Signed-out visitors see "Bob S.", so a full name and a pickup hall are never public together.
export function displayName(user: User | undefined, viewerSignedIn: boolean): string {
  if (!user) return "Unknown student";
  if (viewerSignedIn) return user.name;
  const [first, ...rest] = user.name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function nameOf(data: Data, userId: string): string {
  return data.users.find((u) => u.id === userId)?.name ?? "Unknown student";
}

export function findUserByEmail(data: Data, email: string): User | undefined {
  const clean = email.trim().toLowerCase();
  return data.users.find((u) => u.email === clean);
}

// ---- Browse ----

export type SortOrder = "nearest" | "newest" | "price";
export type BrowseFilters = {
  query: string;
  category: Category | null;
  campusId: string; // "all" or a campus id
  origin: Place; // distances are measured from here
  sort: SortOrder;
  freeOnly: boolean;
  maxPriceCents: number | null;
};
export type BrowseResult = { listing: Listing; miles: number };

const newestFirst = (a: BrowseResult, b: BrowseResult) => time(b.listing.createdAt) - time(a.listing.createdAt);
const sorters: Record<SortOrder, (a: BrowseResult, b: BrowseResult) => number> = {
  nearest: (a, b) => a.miles - b.miles || newestFirst(a, b),
  newest: newestFirst,
  price: (a, b) => a.listing.priceCents - b.listing.priceCents || a.miles - b.miles,
};

export function browseListings(listings: Listing[], f: BrowseFilters): BrowseResult[] {
  const words = f.query.trim().toLowerCase();
  const code = courseCodeKey(f.query);
  const matchesQuery = (l: Listing) =>
    !words ||
    l.title.toLowerCase().includes(words) ||
    l.description.toLowerCase().includes(words) ||
    (!!l.courseCode && courseCodeKey(l.courseCode).includes(code));

  return listings
    .filter((l) => l.status === "active" || l.status === "reserved")
    .filter((l) => f.campusId === "all" || placeByName(l.location)?.campusId === f.campusId)
    .filter((l) => !f.category || l.category === f.category)
    .filter((l) => !f.freeOnly || l.priceCents === 0)
    .filter((l) => f.maxPriceCents === null || l.priceCents <= f.maxPriceCents)
    .filter(matchesQuery)
    .map((listing) => {
      const place = placeByName(listing.location);
      return { listing, miles: place ? milesBetween(f.origin, place) : Infinity };
    })
    .sort(sorters[f.sort]);
}

// ---- Deals ----

// A student's deals, most recent activity first.
export function dealsForUser(data: Data, userId: string): Deal[] {
  return data.deals.filter((d) => d.buyerId === userId || d.sellerId === userId).sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
}

export function messagesForDeal(data: Data, dealId: string): Message[] {
  return data.messages.filter((m) => m.dealId === dealId);
}

// Messages and events from anyone else since this student last opened the deal.
export function unreadCount(data: Data, dealId: string, userId: string): number {
  const lastRead = data.dealReads.find((r) => r.dealId === dealId && r.userId === userId)?.lastReadAt;
  const since = lastRead ? time(lastRead) : -Infinity;
  return messagesForDeal(data, dealId).filter((m) => m.senderId !== userId && time(m.sentAt) > since).length;
}

export function unreadDealCount(data: Data, userId: string): number {
  return dealsForUser(data, userId).filter((d) => unreadCount(data, d.id, userId) > 0).length;
}

// Only the buyer may ever see the handoff code.
export function handoffCodeFor(data: Data, deal: Deal, viewerId: string): HandoffCode | undefined {
  return deal.buyerId === viewerId ? data.handoffCodes.find((c) => c.dealId === deal.id) : undefined;
}

export function dealStatusLabel(data: Data, deal: Deal): string {
  switch (deal.status) {
    case "open":
      return "Chatting";
    case "held":
      return deal.paidCents ? "Purchase reserved" : "Reserved";
    case "completed":
      return "Completed";
    case "closed":
      if (deal.closeReason === "cancelled_by_buyer") return `Cancelled by ${nameOf(data, deal.buyerId)}`;
      if (deal.closeReason === "cancelled_by_seller") return `Cancelled by ${nameOf(data, deal.sellerId)}`;
      if (deal.closeReason === "sold_elsewhere") return "Sold to another student";
      return "Listing removed";
  }
}

// ---- Profiles and saved items ----

export function isSaved(data: Data, userId: string, listingId: string): boolean {
  return data.saves.some((s) => s.userId === userId && s.listingId === listingId);
}

export function savedListings(data: Data, userId: string): Listing[] {
  return data.saves
    .filter((s) => s.userId === userId)
    .sort((a, b) => time(b.savedAt) - time(a.savedAt))
    .map((s) => data.listings.find((l) => l.id === s.listingId))
    .filter((l): l is Listing => !!l && l.status !== "removed");
}

// What a seller has up right now, for their public profile.
export function activeListingsBy(data: Data, sellerId: string): Listing[] {
  return data.listings.filter((l) => l.sellerId === sellerId && (l.status === "active" || l.status === "reserved"));
}

export function thumbsUpPercent(stats: UserStats): number | null {
  const total = stats.thumbsUp + stats.thumbsDown;
  return total === 0 ? null : Math.round((stats.thumbsUp / total) * 100);
}
