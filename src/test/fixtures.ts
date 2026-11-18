// Shared test data. Bob sells a desk chair from Craig Hall; Will and Ann are buyers on the same
// campus; Sam's school isn't on CampusCirculate. Rules get a fixed clock and predictable ids.

import type { RuleContext } from "../data/rules/index.ts";
import type { Data, Deal, Listing, User } from "../types.ts";

export const NOW = "2026-11-17T15:00:00.000Z";
let counter = 0;

export function ctxAt(now = NOW, code = "123456"): RuleContext {
  return { now, newId: (prefix) => `${prefix}_${++counter}`, newCode: () => code };
}

function student(id: string, name: string, email: string, dorm?: string): User {
  return { id, name, email, dorm, joinedAt: "2026-08-20T12:00:00.000Z", stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } };
}

export const will = student("will", "Will Baldwin", "will@g.cofc.edu", "Berry Hall");
export const bob = student("bob", "Bob Smith", "bob@g.cofc.edu", "Craig Hall");
export const ann = student("ann", "Ann Lee", "ann@g.cofc.edu", "Liberty Hall");
export const sam = student("sam", "Sam Park", "sam@clemson.edu");

export function aListing(changes: Partial<Listing> = {}): Listing {
  return {
    id: "chair", sellerId: "bob", title: "Desk chair", priceCents: 2000, location: "Craig Hall", category: "Furniture",
    description: "Rolls fine", status: "active", createdAt: "2026-11-01T12:00:00.000Z", ...changes,
  };
}

export function someData(changes: Partial<Data> = {}): Data {
  return { users: [will, bob, ann, sam], listings: [aListing()], deals: [], messages: [], dealReads: [], handoffCodes: [], saves: [], ...changes };
}

function find<T>(items: T[], match: (item: T) => boolean, what: string): T {
  const item = items.find(match);
  if (!item) throw new Error(`test data has no ${what}`);
  return item;
}

export const dealIn = (data: Data, id: string): Deal => find(data.deals, (d) => d.id === id, `deal ${id}`);
export const listingIn = (data: Data, id = "chair"): Listing => find(data.listings, (l) => l.id === id, `listing ${id}`);
export const userIn = (data: Data, id: string): User => find(data.users, (u) => u.id === id, `user ${id}`);
export const eventsIn = (data: Data, dealId: string): string[] =>
  data.messages.filter((m) => m.dealId === dealId && m.kind === "event").map((m) => m.text);
