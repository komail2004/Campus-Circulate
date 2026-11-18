// Listings: what sellers post. Validation lives here, not in the form, so a backend enforces it too.

import { normalizeCourseCode } from "../../lib/courseCode.ts";
import { formatPrice } from "../../lib/format.ts";
import type { Data, Listing, ListingInput } from "../../types.ts";
import { campusForEmail, placeByName } from "../campus.ts";
import { categories } from "../categories.ts";
import type { RuleContext } from "./context.ts";
import { allow, check } from "./errors.ts";
import { addEvent, closeOpenDeals, getListing, getUser, openDealsOn, patch, patchDeal } from "./shared.ts";

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 1000;
export const MAX_PRICE_CENTS = 1_000_000; // $10,000
export const MAX_PHOTO_CHARS = 200_000;

// Our own sample photos, or a JPEG the Sell form drew on a canvas. Anything else (other sites,
// javascript: URLs, SVGs, which can carry scripts) is refused.
const PHOTO_URL = /^(\/listings\/[a-z0-9-]+\.(webp|png|jpg)|data:image\/jpeg;base64,[A-Za-z0-9+/]+=*)$/;

// Checks the Sell / Edit form and returns it cleaned up (trimmed, course code normalized).
function cleanInput(data: Data, sellerId: string, input: ListingInput): ListingInput {
  const campus = campusForEmail(getUser(data, sellerId).email);
  check(campus, "Only students at a CampusCirculate campus can sell.");
  check(placeByName(input.location)?.campusId === campus.id, `Pick a pickup spot at ${campus.name}.`);

  const title = input.title.trim();
  const description = input.description.trim();
  check(title.length >= 3 && title.length <= TITLE_MAX, `Give your item a title (3–${TITLE_MAX} characters).`);
  check(description.length <= DESCRIPTION_MAX, "Keep the description to 1,000 characters or less.");
  check(Number.isSafeInteger(input.priceCents) && input.priceCents >= 0 && input.priceCents <= MAX_PRICE_CENTS, "Enter a price from $0 to $10,000.");
  check(categories.includes(input.category), "Pick a category.");
  check(!input.photoUrl || (input.photoUrl.length <= MAX_PHOTO_CHARS && PHOTO_URL.test(input.photoUrl)), "That photo can't be used. Choose a different image.");

  const courseCode = input.category === "Textbooks" && input.courseCode?.trim() ? normalizeCourseCode(input.courseCode) : undefined;
  check(courseCode !== null, "Course codes look like MATH 120.");

  return { title, description, priceCents: input.priceCents, location: input.location, category: input.category, photoUrl: input.photoUrl || undefined, courseCode };
}

export function createListing(data: Data, ctx: RuleContext, sellerId: string, input: ListingInput) {
  const listing: Listing = { ...cleanInput(data, sellerId, input), id: ctx.newId("l"), sellerId, status: "active", createdAt: ctx.now };
  return { data: { ...data, listings: [listing, ...data.listings] }, listing };
}

export function whyNotEdit(listing: Listing, actorId: string): string | null {
  if (listing.sellerId !== actorId) return "Only the seller can change this listing.";
  if (listing.status === "reserved") return "Someone has paid for this item. Cancel that deal first.";
  if (listing.status !== "active") return "This listing can't be changed anymore.";
  return null;
}

export function updateListing(data: Data, ctx: RuleContext, actorId: string, listingId: string, input: ListingInput) {
  const listing = getListing(data, listingId);
  allow(whyNotEdit(listing, actorId));
  const clean = cleanInput(data, actorId, input);
  let next: Data = { ...data, listings: patch(data.listings, listingId, clean) };

  if (clean.priceCents !== listing.priceCents) {
    // Offers were made against the old price, so they no longer make sense.
    const price = formatPrice(clean.priceCents);
    for (const deal of openDealsOn(next, listingId, null)) {
      next = patchDeal(next, ctx, deal.id, { offer: null });
      next = addEvent(next, ctx, deal.id, deal.offer ? `The price changed to ${price}, so the offer was cleared.` : `The price changed to ${price}.`);
    }
  }
  return { data: next };
}

export function removeListing(data: Data, ctx: RuleContext, actorId: string, listingId: string) {
  allow(whyNotEdit(getListing(data, listingId), actorId));
  const next: Data = { ...data, listings: patch(data.listings, listingId, { status: "removed" }) };
  return { data: closeOpenDeals(next, ctx, listingId, null, "listing_removed", "The seller removed this listing.") };
}
