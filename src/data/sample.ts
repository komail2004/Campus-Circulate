// Sample accounts and listings, loaded only in local mode (see config.ts).
// Bob sells all twelve; William buys. Photos live in public/listings/.

import type { Category, Data, Listing, User } from "../types.ts";

function sampleUser(id: string, name: string, email: string, dorm: string, joinedAt: string): User {
  return { id, name, email, dorm, joinedAt, stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } };
}

export const sampleUsers: User[] = [
  sampleUser("u1", "William Baldwin", "baldwinwt@g.cofc.edu", "Rutledge Rivers Hall", "2026-08-18T14:00:00.000Z"),
  sampleUser("u2", "Bob Smith", "bobsmith@g.cofc.edu", "Berry Hall", "2026-08-20T16:30:00.000Z"),
];

function sampleListing(id: string, title: string, priceCents: number, location: string, category: Category, photo: string, description: string): Listing {
  // Spread over the first days of November so "Newest" has something to sort.
  const createdAt = `2026-11-${id.padStart(2, "0")}T15:00:00.000Z`;
  return { id, sellerId: "u2", title, priceCents, location, category, description, photoUrl: `/listings/${photo}`, status: "active", createdAt };
}

export const sampleListings: Listing[] = [
  sampleListing("1", "Mini fridge", 4500, "Berry Hall", "Appliances", "mini-fridge.webp", "Mini fridge is basically new, just downsizing and need it gone"),
  sampleListing("2", "Calculus textbook", 2000, "Rutledge Rivers Hall", "Textbooks", "calculus-textbook.webp", "Used only one year, don't need it anymore"),
  sampleListing("3", "Coffee Table", 1000, "McAlister Hall", "Furniture", "coffee-table.webp", "Banged up but is sturdy still"),
  sampleListing("4", "Harbinger Speaker", 3000, "Buist Rivers", "Electronics", "speaker.webp", "Harbinger Speaker product number 5xfH6s3KKoF, plays music just fine and all outlets work."),
  sampleListing("5", "Leather sofa", 0, "Buist Rivers", "Furniture", "leather-sofa.webp", "Rough Condition, just need it gone, first come first serve"),
  sampleListing("6", "IKEA Lamp + desk", 500, "Berry Hall", "Furniture", "lamp-desk.webp", "Used only a semester, don't need it anymore, but still looks new"),
  sampleListing("7", "Graphing calculator", 4000, "Craig Hall", "Electronics", "calculator.webp", "TI-84 Plus CE, works perfectly"),
  sampleListing("8", "Twin XL mattress topper", 1500, "Rutledge Rivers Hall", "Other", "mattress-topper.webp", "Quilted pillow-top topper, fits the dorm beds, always used with a water-proof cover so very good condition"),
  sampleListing("9", "Microwave", 2500, "McAlister Hall", "Appliances", "microwave.webp", "Fits on a dorm shelf, cleaned and ready to go"),
  sampleListing("10", "Winter coat (men's M)", 0, "Craig Hall", "Clothing", "winter-coat.webp", "Warm brown jacket, free to whoever needs it"),
  sampleListing("11", "Desk chair", 2000, "Liberty Hall", "Furniture", "desk-chair.webp", "Rolling chair, adjustable height"),
  sampleListing("12", "Bike lock", 800, "Buist Rivers", "Other", "bike-lock.webp", "Heavy cable lock with two keys"),
];

export function emptyData(): Data {
  return { users: [], listings: [], deals: [], messages: [], dealReads: [], handoffCodes: [], saves: [] };
}

export function sampleData(): Data {
  return { ...emptyData(), users: sampleUsers, listings: sampleListings };
}

// Changes whenever the samples change, so edited samples replace an old saved copy.
export const SAMPLE_VERSION = hash(JSON.stringify([sampleUsers, sampleListings]));

function hash(text: string): string {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}
