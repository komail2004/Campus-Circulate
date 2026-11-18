# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the data layer with the backend-ready model from the spec (one collection per record kind, pure tested rules, async store seam) and port the existing pages to it with the same UI.

**Architecture:** Pure rule functions `(data, ctx, actorId, input) => { data, ...extras }` in `src/data/rules/`, read-only `selectors.ts`, versioned `storage.ts`, and `StoreProvider.tsx` as the only file a backend replaces. Store methods are async and the store exposes `ready`.

**Tech Stack:** React 19, React Router 8, Vite 8, TypeScript 6 (strict), Tailwind v4, Vitest 5.1 (node environment).

Spec: `docs/specs/2026-11-17-deal-threads-design.md`. Branch: `phase-0-foundation` (off `main`). Commit after every task; do not push.

**Commands** (Git Bash): `cd /c/Users/willi/Campus-Circulate` first. `npx vitest run <path>` runs one file; `npm test` runs all.

## File map

| File | Status | Responsibility |
|---|---|---|
| `tsconfig.app.json`, `tsconfig.node.json` | modify | turn on `strict` |
| `vite.config.ts`, `package.json` | modify | Vitest config + `npm test` |
| `src/lib/ids.ts` | rewrite | crypto ids and codes |
| `src/lib/time.ts` | create | UTC ISO checks, day math |
| `src/lib/courseCode.ts` | create | normalize/search course codes |
| `src/lib/format.ts` | modify | drop `dealStatus` (moves to selectors) |
| `src/types.ts` | rewrite | data model |
| `src/config.ts` | create | `localMode` |
| `src/data/campus.ts` | create (replaces `places.ts`) | campuses, halls, meetup spots |
| `src/data/sample.ts` | create (replaces `fakeUsers.ts`, `fakeListings.ts`) | sample data, empty data |
| `src/data/rules/context.ts`, `errors.ts`, `shared.ts` | create | rule plumbing |
| `src/data/rules/users.ts`, `listings.ts`, `deals.ts`, `offers.ts`, `meetups.ts`, `handoff.ts`, `saves.ts` | create | the rules |
| `src/data/rules/index.ts` | create | barrel |
| `src/data/selectors.ts` | create | read-only views |
| `src/data/storage.ts` | create | local/session storage |
| `src/data/storeContext.ts`, `StoreProvider.tsx` | rewrite | async store seam |
| `src/data/actions.ts` | delete | replaced by rules |
| `src/test/fixtures.ts` | create | shared test data |
| pages + `Layout`, `SignInModal`, `DealChat` | modify | port to new store |
| `docs/backend-handoff.md`, `README.md` | create/rewrite | contract + project readme |
| `DEMO_GUIDE.md` | delete | class demo is over |

---

### Task 1: Strict TypeScript + Vitest

**Files:** Modify `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `package.json`

- [ ] **Step 1: Install Vitest**

Run: `npm install --save-dev vitest@5.1.0`
Expected: `added … packages`, no peer-dependency errors.

- [ ] **Step 2: Add the test script** — in `package.json` `"scripts"`, after `"preview"`:

```json
    "preview": "vite preview",
    "test": "vitest run"
```

- [ ] **Step 3: Configure Vitest** — replace `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // rules and selectors are plain functions, so tests need no browser
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Turn on strict mode** — in both `tsconfig.app.json` and `tsconfig.node.json`, add under `/* Linting */`:

```json
    "strict": true,
```

- [ ] **Step 5: Confirm the runner works**

Run: `npx vitest run`
Expected: `No test files found` (exit 1 is fine — there are no tests yet).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json tsconfig.node.json
git commit -m "chore: add Vitest and turn on strict TypeScript"
```

(`npm run build` will fail until Task 14 ports the pages; that's expected mid-phase.)

---

### Task 2: lib helpers — ids, time, course codes

**Files:** Rewrite `src/lib/ids.ts`; create `src/lib/time.ts`, `src/lib/courseCode.ts`; tests next to each.

- [ ] **Step 1: Write the failing tests**

`src/lib/ids.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { newCode, newId } from "./ids.ts";

describe("newId", () => {
  it("prefixes a random UUID", () => {
    expect(newId("d")).toMatch(/^d_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
  it("never repeats", () => {
    expect(new Set(Array.from({ length: 500 }, () => newId("x"))).size).toBe(500);
  });
});

describe("newCode", () => {
  it("returns exactly the requested number of digits", () => {
    for (let i = 0; i < 200; i++) expect(newCode(6)).toMatch(/^\d{6}$/);
  });
  it("uses every digit", () => {
    expect(new Set(Array.from({ length: 100 }, () => newCode(6)).join("")).size).toBe(10);
  });
});
```

`src/lib/time.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { addDays, isUtcIso } from "./time.ts";

describe("isUtcIso", () => {
  it.each(["2026-11-17T15:00:00.000Z", "2026-11-17T15:00:00Z"])("accepts %s", (value) => {
    expect(isUtcIso(value)).toBe(true);
  });
  it.each(["2026-11-17", "2026-11-17 15:00", "2026-11-17T15:00:00+02:00", "2026-13-01T00:00:00Z", "soon"])(
    "rejects %s",
    (value) => {
      expect(isUtcIso(value)).toBe(false);
    },
  );
});

describe("addDays", () => {
  it("adds whole days across months", () => {
    expect(addDays("2026-11-17T15:00:00.000Z", 14)).toBe("2026-12-01T15:00:00.000Z");
  });
});
```

`src/lib/courseCode.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { courseCodeKey, normalizeCourseCode } from "./courseCode.ts";

describe("normalizeCourseCode", () => {
  it.each([
    ["math120", "MATH 120"],
    ["MATH 120", "MATH 120"],
    [" Math-120b ", "MATH 120B"],
    ["csci 220L", "CSCI 220L"],
    ["ch 101", "CH 101"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeCourseCode(input)).toBe(expected);
  });
  it.each(["", "MATH", "120", "MATHEMATICS 120", "MATH 12", "MATH 1200", "MA TH 120", "MATH_120"])("rejects %j", (input) => {
    expect(normalizeCourseCode(input)).toBeNull();
  });
});

describe("courseCodeKey", () => {
  it("ignores case, spaces and dashes", () => {
    expect(courseCodeKey("math 120")).toBe("MATH120");
    expect(courseCodeKey("MATH-120")).toBe("MATH120");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/lib`
Expected: FAIL — `newId`/`newCode` not exported from `./ids.ts`; `./time.ts` and `./courseCode.ts` not found.

- [ ] **Step 3: Implement**

`src/lib/ids.ts` (replace):
```ts
// Unique ids and secret number codes from the browser's cryptographic random source.
// Never Math.random: a handoff code is all that stands between a buyer's money and the seller.

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// `digits` random digits, e.g. "048213". Bytes of 250 and up are skipped so every digit is equally likely.
export function newCode(digits: number): string {
  const byte = new Uint8Array(1);
  let code = "";
  while (code.length < digits) {
    crypto.getRandomValues(byte);
    if (byte[0] < 250) code += byte[0] % 10;
  }
  return code;
}
```

`src/lib/time.ts`:
```ts
// Stored times are ISO-8601 UTC strings like "2026-11-17T15:00:00.000Z" (what Date#toISOString makes).

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isUtcIso(value: string): boolean {
  return UTC_ISO.test(value) && !Number.isNaN(Date.parse(value));
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}
```

`src/lib/courseCode.ts`:
```ts
// Course codes like "MATH 120" or "CSCI 220L". Sellers type them any way; we store one form.

const COURSE_CODE = /^([A-Z]{2,4})[\s-]?(\d{3}[A-Z]?)$/;

export function normalizeCourseCode(input: string): string | null {
  const match = input.trim().toUpperCase().match(COURSE_CODE);
  return match ? `${match[1]} ${match[2]}` : null;
}

// For search: "math 120", "MATH-120" and "math120" all compare equal.
export function courseCodeKey(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, "");
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib`
Expected: PASS (3 files).

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat(lib): crypto ids and codes, UTC time helpers, course codes"
```

---

### Task 3: Types, config, campus and sample data

**Files:** Rewrite `src/types.ts`; create `src/config.ts`, `src/data/campus.ts`, `src/data/sample.ts`. (Old `places.ts`, `fakeUsers.ts`, `fakeListings.ts` are deleted in Task 14 once nothing imports them.)

- [ ] **Step 1: Write `src/types.ts`** (replace):

```ts
// The shapes of everything the app stores. Each list in `Data` is one collection: the same
// collections a backend will have. Times are ISO-8601 UTC strings; money is whole cents.

export type Campus = { id: string; name: string; domain: string };

// A residence hall. Coordinates let us measure distance between halls.
export type Place = { name: string; campusId: string; lat: number; lng: number };

export type Category = "Furniture" | "Electronics" | "Textbooks" | "Appliances" | "Clothing" | "Other";

export type UserStats = { completedHandoffs: number; thumbsUp: number; thumbsDown: number };

export type User = {
  id: string;
  name: string;
  email: string; // private: never shown on public pages
  dorm?: string; // private; only for students on a CampusCirculate campus
  joinedAt: string;
  stats: UserStats; // public; only the handoff and rating rules change it
};

export type ListingStatus = "active" | "reserved" | "sold" | "removed";

export type Listing = {
  id: string;
  sellerId: string;
  title: string;
  priceCents: number; // 0 = free
  location: string; // the pickup hall (a Place name)
  category: Category;
  description: string;
  photoUrl?: string;
  courseCode?: string; // Textbooks only, stored like "MATH 120"
  status: ListingStatus;
  createdAt: string;
};

// What the Sell / Edit form sends.
export type ListingInput = Pick<Listing, "title" | "priceCents" | "location" | "category" | "description" | "photoUrl" | "courseCode">;

export type Offer = { amountCents: number; byUserId: string; status: "pending" | "accepted" };
export type Meetup = { spot: string; time: string; proposedBy: string; agreed: boolean };
export type Rating = "up" | "down";
export type DealStatus = "open" | "held" | "completed" | "closed";
export type CloseReason = "cancelled_by_buyer" | "cancelled_by_seller" | "sold_elsewhere" | "listing_removed";

// One buyer's conversation with the seller about one listing, from first message to handoff.
export type Deal = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: DealStatus;
  offer: Offer | null;
  paidCents: number | null; // set when the buyer pays (0 for free items)
  meetup: Meetup | null;
  meetupEverAgreed: boolean; // once true, only the seller can cancel a paid deal
  ratings: { byBuyer?: Rating; bySeller?: Rating };
  closeReason: CloseReason | null;
  createdAt: string;
  updatedAt: string; // last activity; the deals list is sorted by it
};

// senderId is null for system events ("This item was sold to another student.").
export type Message = { id: string; dealId: string; senderId: string | null; text: string; sentAt: string; kind: "text" | "event" };

export type DealRead = { dealId: string; userId: string; lastReadAt: string };

// Secret. Only the buyer may see it; on a backend only the server reads it.
export type HandoffCode = { dealId: string; buyerId: string; code: string; wrongTries: number };

export type Save = { userId: string; listingId: string; savedAt: string };

export type Data = {
  users: User[];
  listings: Listing[];
  deals: Deal[];
  messages: Message[];
  dealReads: DealRead[];
  handoffCodes: HandoffCode[];
  saves: Save[];
};
```

- [ ] **Step 2: Write `src/config.ts`:**

```ts
// Local mode: there's no backend yet. Data is saved in this browser, sample accounts and listings
// are loaded, and testing tools are shown. The backend turns this off.
export const localMode = true;
```

- [ ] **Step 3: Write `src/data/campus.ts`:**

```ts
// Campuses, their residence halls, and public meetup spots. A student's campus comes from their
// .edu email: baldwinwt@g.cofc.edu belongs to College of Charleston.
// Hall coordinates are the buildings' real locations, from OpenStreetMap (© OpenStreetMap contributors).

import type { Campus, Listing, Place } from "../types.ts";

export const campuses: Campus[] = [{ id: "cofc", name: "College of Charleston", domain: "cofc.edu" }];

export const places: Place[] = [
  { name: "Berry Hall", campusId: "cofc", lat: 32.78594, lng: -79.93779 },
  { name: "Craig Hall", campusId: "cofc", lat: 32.78305, lng: -79.93666 },
  { name: "Rutledge Rivers Hall", campusId: "cofc", lat: 32.78457, lng: -79.93854 },
  { name: "Buist Rivers", campusId: "cofc", lat: 32.7843, lng: -79.93848 },
  { name: "Liberty Hall", campusId: "cofc", lat: 32.78302, lng: -79.93569 },
  { name: "McAlister Hall", campusId: "cofc", lat: 32.78668, lng: -79.93814 },
  { name: "McConnel Hall", campusId: "cofc", lat: 32.78096, lng: -79.93696 },
];

// Busy public places suggested for handoffs, besides the listing's own hall lobby.
// Names to confirm with the team before launch.
const publicSpots: Record<string, string[]> = {
  cofc: ["Addlestone Library entrance", "Stern Student Center lobby", "Cistern Yard"],
};

export function placeByName(name: string): Place | undefined {
  return places.find((place) => place.name === name);
}

export function getCampus(id: string): Campus | undefined {
  return campuses.find((campus) => campus.id === id);
}

export function placesOnCampus(campusId: string): Place[] {
  return places.filter((place) => place.campusId === campusId);
}

// The campus an email belongs to, or undefined if that school isn't on CampusCirculate yet.
// Subdomains count too: "g.cofc.edu" belongs to "cofc.edu".
export function campusForEmail(email: string): Campus | undefined {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return campuses.find((campus) => domain === campus.domain || domain.endsWith(`.${campus.domain}`));
}

// Where buyer and seller may agree to meet: the pickup hall's lobby or a public spot on that campus.
export function meetupSpots(listing: Listing): string[] {
  const campusId = placeByName(listing.location)?.campusId;
  return [`${listing.location} lobby`, ...(campusId ? (publicSpots[campusId] ?? []) : [])];
}
```

- [ ] **Step 4: Write `src/data/sample.ts`:**

```ts
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
  sampleListing("1", "Mini fridge", 4500, "Berry Hall", "Appliances", "mini-fridge.png", "Mini fridge is basically new, just downsizing and need it gone"),
  sampleListing("2", "Calculus textbook", 2000, "Rutledge Rivers Hall", "Textbooks", "calculus-textbook.png", "Used only one year, don't need it anymore"),
  sampleListing("3", "Coffee Table", 1000, "McAlister Hall", "Furniture", "coffee-table.webp", "Banged up but is sturdy still"),
  sampleListing("4", "Harbinger Speaker", 3000, "Buist Rivers", "Electronics", "speaker.png", "Harbinger Speaker product number 5xfH6s3KKoF, plays music just fine and all outlets work."),
  sampleListing("5", "Leather sofa", 0, "Buist Rivers", "Furniture", "leather-sofa.webp", "Rough Condition, just need it gone, first come first serve"),
  sampleListing("6", "IKEA Lamp + desk", 500, "Berry Hall", "Furniture", "lamp-desk.webp", "Used only a semester, don't need it anymore, but still looks new"),
  sampleListing("7", "Graphing calculator", 4000, "Craig Hall", "Electronics", "calculator.png", "TI-84 Plus CE, works perfectly"),
  sampleListing("8", "Twin XL mattress topper", 1500, "Rutledge Rivers Hall", "Other", "mattress-topper.png", "Quilted pillow-top topper, fits the dorm beds, always used with a water-proof cover so very good condition"),
  sampleListing("9", "Microwave", 2500, "McAlister Hall", "Appliances", "microwave.webp", "Fits on a dorm shelf, cleaned and ready to go"),
  sampleListing("10", "Winter coat (men's M)", 0, "Craig Hall", "Clothing", "winter-coat.png", "Warm brown jacket, free to whoever needs it"),
  sampleListing("11", "Desk chair", 2000, "Liberty Hall", "Furniture", "desk-chair.png", "Rolling chair, adjustable height"),
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
```

- [ ] **Step 5: Commit** (the old pages still import the old types; the build is fixed in Task 14)

```bash
git add src/types.ts src/config.ts src/data/campus.ts src/data/sample.ts
git commit -m "feat(data): backend-ready data model, campus data, sample data, localMode"
```

---

### Task 4: Rule plumbing, shared test fixtures, users

**Files:** Create `src/data/rules/context.ts`, `errors.ts`, `shared.ts`, `users.ts`, `index.ts`, `users.test.ts`; `src/test/fixtures.ts`.

- [ ] **Step 1: Write the plumbing**

`src/data/rules/context.ts`:
```ts
// What a rule needs from the outside world, passed in so rules stay pure: tests pass fixed values,
// the browser passes real ones, and a backend passes server time and server randomness.
export type RuleContext = {
  now: string; // ISO-8601 UTC
  newId: (prefix: string) => string;
  newCode: () => string; // a fresh handoff code
};
```

`src/data/rules/errors.ts`:
```ts
// A rule refusing an action. Its message is shown to the student as-is, so keep it plain and kind.
export class RuleError extends Error {
  name = "RuleError";
}

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}

// Refuse when a `whyNot…` helper gave a reason. Pages call the same helpers to hide buttons,
// so the screen and the rules can't disagree.
export function allow(reason: string | null): void {
  if (reason) throw new RuleError(reason);
}

// What to tell the student when an action fails. Unexpected errors get a generic message (and go to
// the console for us) so internals never reach the screen.
export function friendlyError(error: unknown): string {
  if (error instanceof RuleError) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}
```

`src/data/rules/shared.ts`:
```ts
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
```

- [ ] **Step 2: Write the fixtures** — `src/test/fixtures.ts`:

```ts
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
```

- [ ] **Step 3: Write the failing test** — `src/data/rules/users.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ctxAt, NOW, someData } from "../../test/fixtures.ts";
import { signUp } from "./users.ts";

describe("signUp", () => {
  it("creates a student with a dorm on their own campus", () => {
    const { data, user } = signUp(someData(), ctxAt(), { name: "  Kim Cho ", email: "Kim@G.CofC.edu", dorm: "Berry Hall" });
    expect(user).toMatchObject({ name: "Kim Cho", email: "kim@g.cofc.edu", dorm: "Berry Hall", joinedAt: NOW, stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } });
    expect(data.users).toContainEqual(user);
  });

  it("drops a dorm that isn't on the student's campus", () => {
    expect(signUp(someData(), ctxAt(), { name: "Kim", email: "kim@clemson.edu", dorm: "Berry Hall" }).user.dorm).toBeUndefined();
    expect(signUp(someData(), ctxAt(), { name: "Kim", email: "kim@cofc.edu", dorm: "Made Up Hall" }).user.dorm).toBeUndefined();
  });

  it.each([
    [{ name: "", email: "kim@cofc.edu" }, /Enter your name/],
    [{ name: "x".repeat(61), email: "kim@cofc.edu" }, /Enter your name/],
    [{ name: "Kim", email: "kim@gmail.com" }, /students only/],
    [{ name: "Kim", email: "BOB@g.cofc.edu" }, /already an account/],
  ])("refuses %j", (input, message) => {
    expect(() => signUp(someData(), ctxAt(), input)).toThrow(message);
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npx vitest run src/data/rules/users.test.ts`
Expected: FAIL — cannot find `./users.ts` (and `../data/rules/index.ts`).

- [ ] **Step 5: Implement users and the barrel**

`src/data/rules/users.ts`:
```ts
// Accounts. In local mode this is the whole sign-up; a backend adds real email verification.

import type { Data, User } from "../../types.ts";
import { campusForEmail, placesOnCampus } from "../campus.ts";
import type { RuleContext } from "./context.ts";
import { check } from "./errors.ts";

export const NAME_MAX = 60;
export type SignUpInput = { name: string; email: string; dorm?: string };

export function isEduEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.edu$/i.test(email.trim());
}

export function signUp(data: Data, ctx: RuleContext, input: SignUpInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  check(name.length > 0 && name.length <= NAME_MAX, `Enter your name (up to ${NAME_MAX} characters).`);
  check(isEduEmail(email), "CampusCirculate is for students only. Use your .edu email.");
  check(!data.users.some((u) => u.email === email), "There's already an account with that email. Sign in instead.");

  // Only a hall on the student's own campus counts; students at other schools have no dorm here.
  const campus = campusForEmail(email);
  const dorm = campus && placesOnCampus(campus.id).some((p) => p.name === input.dorm) ? input.dorm : undefined;
  const user: User = { id: ctx.newId("u"), name, email, dorm, joinedAt: ctx.now, stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } };
  return { data: { ...data, users: [...data.users, user] }, user };
}
```

`src/data/rules/index.ts`:
```ts
// Every rule of the marketplace. A backend implements each of these as a server function;
// docs/backend-handoff.md maps them to the store.
export * from "./context.ts";
export * from "./errors.ts";
export * from "./users.ts";
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run src/data/rules/users.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/rules src/test
git commit -m "feat(rules): rule plumbing, test fixtures, sign-up rule"
```

---

### Task 5: Listing rules

**Files:** Create `src/data/rules/listings.ts`, `listings.test.ts`; modify `src/data/rules/index.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/rules/listings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aListing, ctxAt, listingIn, NOW, someData } from "../../test/fixtures.ts";
import type { ListingInput } from "../../types.ts";
import { createListing, removeListing, updateListing } from "./listings.ts";

const form: ListingInput = { title: "Lamp", priceCents: 500, location: "Berry Hall", category: "Furniture", description: "Works" };

describe("createListing", () => {
  it("adds an active listing at the top", () => {
    const { data, listing } = createListing(someData(), ctxAt(), "bob", form);
    expect(listing).toMatchObject({ ...form, sellerId: "bob", status: "active", createdAt: NOW });
    expect(data.listings[0]).toEqual(listing);
  });

  it("normalizes course codes on textbooks and drops them elsewhere", () => {
    expect(createListing(someData(), ctxAt(), "bob", { ...form, category: "Textbooks", courseCode: "math120" }).listing.courseCode).toBe("MATH 120");
    expect(createListing(someData(), ctxAt(), "bob", { ...form, courseCode: "MATH 120" }).listing.courseCode).toBeUndefined();
  });

  it("accepts our own photos and canvas JPEGs", () => {
    for (const photoUrl of ["/listings/desk-chair.webp", "data:image/jpeg;base64,/9j/4AAQSkZJRg=="]) {
      expect(createListing(someData(), ctxAt(), "bob", { ...form, photoUrl }).listing.photoUrl).toBe(photoUrl);
    }
  });

  it.each([
    [{ title: "ab" }, /title/],
    [{ title: "x".repeat(81) }, /title/],
    [{ description: "x".repeat(1001) }, /description/],
    [{ priceCents: -1 }, /price/],
    [{ priceCents: 1.5 }, /price/],
    [{ priceCents: 1_000_001 }, /price/],
    [{ location: "Main Hall" }, /pickup spot/],
    [{ category: "Cars" as ListingInput["category"] }, /category/],
    [{ photoUrl: "https://example.com/x.png" }, /photo/],
    [{ photoUrl: "javascript:alert(1)" }, /photo/],
    [{ photoUrl: "data:image/svg+xml;base64,PHN2Zz4=" }, /photo/],
    [{ category: "Textbooks" as const, courseCode: "calculus" }, /Course codes/],
  ])("refuses %j", (changes, message) => {
    expect(() => createListing(someData(), ctxAt(), "bob", { ...form, ...changes })).toThrow(message);
  });

  it("only lets students on a supported campus sell", () => {
    expect(() => createListing(someData(), ctxAt(), "sam", form)).toThrow(/CampusCirculate campus/);
  });
});

describe("updateListing", () => {
  it("lets the seller edit an active listing", () => {
    const { data } = updateListing(someData(), ctxAt(), "bob", "chair", { ...form, title: "Office chair" });
    expect(listingIn(data).title).toBe("Office chair");
  });

  it("refuses anyone but the seller, and listings that aren't active", () => {
    expect(() => updateListing(someData(), ctxAt(), "will", "chair", form)).toThrow(/Only the seller/);
    const reserved = someData({ listings: [aListing({ status: "reserved" })] });
    expect(() => updateListing(reserved, ctxAt(), "bob", "chair", form)).toThrow(/Cancel that deal first/);
    const sold = someData({ listings: [aListing({ status: "sold" })] });
    expect(() => updateListing(sold, ctxAt(), "bob", "chair", form)).toThrow(/can't be changed/);
  });
});

describe("removeListing", () => {
  it("marks it removed", () => {
    expect(listingIn(removeListing(someData(), ctxAt(), "bob", "chair").data).status).toBe("removed");
  });

  it("refuses while someone has paid", () => {
    const reserved = someData({ listings: [aListing({ status: "reserved" })] });
    expect(() => removeListing(reserved, ctxAt(), "bob", "chair")).toThrow(/Cancel that deal first/);
  });
});
```

(Effects on open deals — price changes clearing offers, removal closing deals — are tested in Tasks 6 and 7 once deals exist.)

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/rules/listings.test.ts`
Expected: FAIL — cannot find `./listings.ts`.

- [ ] **Step 3: Implement** — `src/data/rules/listings.ts`:

```ts
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
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./listings.ts";
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/data/rules/listings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rules
git commit -m "feat(rules): create, edit and remove listings with full validation"
```

---

### Task 6: Deal rules — start, message, pay, cancel, read

**Files:** Create `src/data/rules/deals.ts`, `deals.test.ts`; modify `index.ts`, `src/test/fixtures.ts`.

- [ ] **Step 1: Add deal helpers to the fixtures** — append to `src/test/fixtures.ts`:

```ts
// `buyerId` opens a deal on the chair.
export function opened(data = someData(), buyerId = "will") {
  const { data: next, deal } = startDeal(data, ctxAt(), buyerId, "chair");
  return { data: next, dealId: deal.id };
}

// ...and pays for it.
export function paid(data = someData(), buyerId = "will") {
  const { data: next, dealId } = opened(data, buyerId);
  return { data: payDeal(next, ctxAt(), buyerId, dealId).data, dealId };
}
```

and change its first import to:
```ts
import { payDeal, startDeal, type RuleContext } from "../data/rules/index.ts";
```

- [ ] **Step 2: Write the failing test** — `src/data/rules/deals.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aListing, ctxAt, dealIn, eventsIn, listingIn, NOW, opened, paid, someData } from "../../test/fixtures.ts";
import { cancelDeal, markRead, payDeal, sendMessage, startDeal } from "./deals.ts";
import { removeListing } from "./listings.ts";

describe("startDeal", () => {
  it("opens a deal between the buyer and the seller", () => {
    const { data, dealId } = opened();
    expect(dealIn(data, dealId)).toMatchObject({
      listingId: "chair", buyerId: "will", sellerId: "bob", status: "open", offer: null,
      paidCents: null, meetupEverAgreed: false, closeReason: null, createdAt: NOW,
    });
  });

  it("reuses the buyer's active deal", () => {
    const { data, dealId } = opened();
    expect(startDeal(data, ctxAt(), "will", "chair").deal.id).toBe(dealId);
  });

  it("lets a buyer start over after cancelling", () => {
    const { data, dealId } = opened();
    const cancelled = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(startDeal(cancelled, ctxAt(), "will", "chair").deal.id).not.toBe(dealId);
  });

  it("is allowed on reserved items but not sold or removed ones", () => {
    expect(() => startDeal(paid().data, ctxAt(), "ann", "chair")).not.toThrow();
    expect(() => startDeal(someData({ listings: [aListing({ status: "sold" })] }), ctxAt(), "will", "chair")).toThrow(/already sold/);
    expect(() => startDeal(someData({ listings: [aListing({ status: "removed" })] }), ctxAt(), "will", "chair")).toThrow(/removed/);
  });

  it("won't let sellers buy their own listing", () => {
    expect(() => startDeal(someData(), ctxAt(), "bob", "chair")).toThrow(/your listing/);
  });
});

describe("sendMessage", () => {
  it("adds a trimmed message and bumps the deal's activity time", () => {
    const { data, dealId } = opened();
    const later = "2026-11-17T16:00:00.000Z";
    const next = sendMessage(data, ctxAt(later), "bob", dealId, "  Still available ").data;
    expect(next.messages.at(-1)).toMatchObject({ dealId, senderId: "bob", text: "Still available", kind: "text", sentAt: later });
    expect(dealIn(next, dealId).updatedAt).toBe(later);
  });

  it("refuses outsiders, empty or long messages, and closed deals", () => {
    const { data, dealId } = opened();
    expect(() => sendMessage(data, ctxAt(), "ann", dealId, "hi")).toThrow(/not part/);
    expect(() => sendMessage(data, ctxAt(), "will", dealId, "   ")).toThrow(/1–1,000/);
    expect(() => sendMessage(data, ctxAt(), "will", dealId, "x".repeat(1001))).toThrow(/1–1,000/);
    const closed = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(() => sendMessage(closed, ctxAt(), "will", dealId, "hi")).toThrow(/closed/);
  });
});

describe("payDeal", () => {
  it("holds the asking price, reserves the item and makes a buyer-only code", () => {
    const { data, dealId } = paid();
    expect(dealIn(data, dealId)).toMatchObject({ status: "held", paidCents: 2000 });
    expect(listingIn(data).status).toBe("reserved");
    expect(data.handoffCodes).toEqual([{ dealId, buyerId: "will", code: "123456", wrongTries: 0 }]);
    expect(eventsIn(data, dealId)).toEqual(["Will Baldwin paid $20. It's held until the handoff."]);
  });

  it("tells other buyers the item is reserved and stops them paying", () => {
    const annDeal = opened(someData(), "ann");
    const { data } = paid(annDeal.data);
    expect(eventsIn(data, annDeal.dealId)).toEqual(["Another student reserved this item."]);
    expect(() => payDeal(data, ctxAt(), "ann", annDeal.dealId)).toThrow(/already reserved/);
  });

  it("reserves free items without a payment", () => {
    const { data, dealId } = paid(someData({ listings: [aListing({ priceCents: 0 })] }));
    expect(dealIn(data, dealId).paidCents).toBe(0);
    expect(eventsIn(data, dealId)).toEqual(["Will Baldwin reserved the item."]);
  });

  it("only lets the buyer pay, once", () => {
    const { data, dealId } = opened();
    expect(() => payDeal(data, ctxAt(), "bob", dealId)).toThrow(/Only the buyer/);
    const held = payDeal(data, ctxAt(), "will", dealId).data;
    expect(() => payDeal(held, ctxAt(), "will", dealId)).toThrow(/isn't waiting for payment/);
  });
});

describe("cancelDeal", () => {
  it("lets either person cancel before paying", () => {
    const { data, dealId } = opened();
    expect(dealIn(cancelDeal(data, ctxAt(), "bob", dealId).data, dealId)).toMatchObject({ status: "closed", closeReason: "cancelled_by_seller" });
    expect(dealIn(cancelDeal(data, ctxAt(), "will", dealId).data, dealId).closeReason).toBe("cancelled_by_buyer");
  });

  it("refunds a paid deal, frees the item and tells other buyers", () => {
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    const next = cancelDeal(data, ctxAt(), "bob", dealId).data;
    expect(listingIn(next).status).toBe("active");
    expect(next.handoffCodes).toEqual([]);
    expect(eventsIn(next, dealId)).toContain("Bob Smith cancelled. The $20 payment was refunded.");
    expect(eventsIn(next, annDeal.dealId)).toContain("This item is back on sale.");
  });

  it("lets the buyer cancel a paid deal before any meetup is agreed", () => {
    const { data, dealId } = paid();
    expect(dealIn(cancelDeal(data, ctxAt(), "will", dealId).data, dealId).closeReason).toBe("cancelled_by_buyer");
  });

  it("refuses outsiders and finished deals", () => {
    const { data, dealId } = opened();
    expect(() => cancelDeal(data, ctxAt(), "ann", dealId)).toThrow(/not part/);
    const closed = cancelDeal(data, ctxAt(), "will", dealId).data;
    expect(() => cancelDeal(closed, ctxAt(), "will", dealId)).toThrow(/already finished/);
  });
});

describe("removing a listing", () => {
  it("closes its open deals", () => {
    const { data, dealId } = opened();
    const next = removeListing(data, ctxAt(), "bob", "chair").data;
    expect(dealIn(next, dealId)).toMatchObject({ status: "closed", closeReason: "listing_removed" });
    expect(eventsIn(next, dealId)).toContain("The seller removed this listing.");
  });
});

describe("markRead", () => {
  it("records when each person last read the deal", () => {
    const { data, dealId } = opened();
    const once = markRead(data, ctxAt("2026-11-17T16:00:00.000Z"), "will", dealId).data;
    const twice = markRead(once, ctxAt("2026-11-17T17:00:00.000Z"), "will", dealId).data;
    expect(twice.dealReads).toEqual([{ dealId, userId: "will", lastReadAt: "2026-11-17T17:00:00.000Z" }]);
    expect(() => markRead(data, ctxAt(), "ann", dealId)).toThrow(/not part/);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/data/rules/deals.test.ts`
Expected: FAIL — `startDeal` is not exported from the rules barrel / cannot find `./deals.ts`.

- [ ] **Step 4: Implement** — `src/data/rules/deals.ts`:

```ts
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
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./deals.ts";
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/data/rules`
Expected: PASS (users, listings, deals).

- [ ] **Step 6: Commit**

```bash
git add src/data/rules src/test
git commit -m "feat(rules): deal threads — start, message, pay, cancel, mark read"
```

---

### Task 7: Offer rules

**Files:** Create `src/data/rules/offers.ts`, `offers.test.ts`; modify `index.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/rules/offers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aListing, ctxAt, dealIn, eventsIn, opened, paid, someData } from "../../test/fixtures.ts";
import { payDeal } from "./deals.ts";
import { updateListing } from "./listings.ts";
import { acceptOffer, declineOffer, makeOffer } from "./offers.ts";

describe("makeOffer", () => {
  it("lets either person offer below the asking price", () => {
    const { data, dealId } = opened();
    const next = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    expect(dealIn(next, dealId).offer).toEqual({ amountCents: 1500, byUserId: "will", status: "pending" });
    expect(eventsIn(next, dealId)).toEqual(["Will Baldwin offered $15."]);
    expect(dealIn(makeOffer(next, ctxAt(), "bob", dealId, 1800).data, dealId).offer?.byUserId).toBe("bob");
  });

  it.each([0, 2000, 2500, 12.5, -100])("refuses an offer of %d cents", (cents) => {
    const { data, dealId } = opened();
    expect(() => makeOffer(data, ctxAt(), "will", dealId, cents)).toThrow(/less than the \$20 asking price/);
  });

  it("refuses offers on free, reserved or paid items, and from outsiders", () => {
    const free = opened(someData({ listings: [aListing({ priceCents: 0 })] }));
    expect(() => makeOffer(free.data, ctxAt(), "will", free.dealId, 1)).toThrow(/free/);
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    expect(() => makeOffer(data, ctxAt(), "ann", annDeal.dealId, 1000)).toThrow(/reserved/);
    expect(() => makeOffer(data, ctxAt(), "will", dealId, 1000)).toThrow(/before paying/);
    expect(() => makeOffer(annDeal.data, ctxAt(), "will", annDeal.dealId, 1000)).toThrow(/not part/);
  });
});

describe("answering an offer", () => {
  it("is only for the other person", () => {
    const { data, dealId } = opened();
    const offered = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    expect(() => acceptOffer(offered, ctxAt(), "will", dealId)).toThrow(/Wait for the other person/);

    const accepted = acceptOffer(offered, ctxAt(), "bob", dealId).data;
    expect(dealIn(accepted, dealId).offer?.status).toBe("accepted");
    expect(eventsIn(accepted, dealId)).toContain("Bob Smith accepted the $15 offer.");

    const declined = declineOffer(offered, ctxAt(), "bob", dealId).data;
    expect(dealIn(declined, dealId).offer).toBeNull();
    expect(eventsIn(declined, dealId)).toContain("Bob Smith declined the $15 offer.");
    expect(() => declineOffer(declined, ctxAt(), "bob", dealId)).toThrow(/no offer waiting/);
  });

  it("can't accept once another student reserved the item", () => {
    const annDeal = opened(someData(), "ann");
    const offered = makeOffer(annDeal.data, ctxAt(), "ann", annDeal.dealId, 1500).data;
    const { data } = paid(offered);
    expect(() => acceptOffer(data, ctxAt(), "bob", annDeal.dealId)).toThrow(/reserved/);
  });

  it("sets the price the buyer pays", () => {
    const { data, dealId } = opened();
    const accepted = acceptOffer(makeOffer(data, ctxAt(), "will", dealId, 1500).data, ctxAt(), "bob", dealId).data;
    expect(dealIn(payDeal(accepted, ctxAt(), "will", dealId).data, dealId).paidCents).toBe(1500);
  });
});

describe("price edits", () => {
  const form = { title: "Desk chair", location: "Craig Hall", category: "Furniture" as const, description: "Rolls fine" };

  it("clear offers on open deals and say so", () => {
    const { data, dealId } = opened();
    const offered = makeOffer(data, ctxAt(), "will", dealId, 1500).data;
    const next = updateListing(offered, ctxAt(), "bob", "chair", { ...form, priceCents: 1800 }).data;
    expect(dealIn(next, dealId).offer).toBeNull();
    expect(eventsIn(next, dealId)).toContain("The price changed to $18, so the offer was cleared.");
  });

  it("say nothing when the price stays the same", () => {
    const { data, dealId } = opened();
    const next = updateListing(data, ctxAt(), "bob", "chair", { ...form, priceCents: 2000 }).data;
    expect(eventsIn(next, dealId)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/rules/offers.test.ts`
Expected: FAIL — cannot find `./offers.ts`.

- [ ] **Step 3: Implement** — `src/data/rules/offers.ts`:

```ts
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
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./offers.ts";
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/data/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rules
git commit -m "feat(rules): offers — make, accept, decline; price edits clear them"
```

---

### Task 8: Meetup rules

**Files:** Create `src/data/rules/meetups.ts`, `meetups.test.ts`; modify `index.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/rules/meetups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ctxAt, dealIn, eventsIn, opened, paid } from "../../test/fixtures.ts";
import { cancelDeal } from "./deals.ts";
import { acceptMeetup, proposeMeetup } from "./meetups.ts";

const SOON = "2026-11-18T15:00:00.000Z";
const spot = "Craig Hall lobby";

describe("proposeMeetup", () => {
  it("records a proposal once the item is paid for", () => {
    const { data, dealId } = paid();
    const next = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(dealIn(next, dealId).meetup).toEqual({ spot, time: SOON, proposedBy: "bob", agreed: false });
    expect(eventsIn(next, dealId)).toContain("Bob Smith suggested a meetup.");
  });

  it("needs a paid deal", () => {
    const { data, dealId } = opened();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot, time: SOON })).toThrow(/once the item is paid/);
  });

  it("only allows the suggested spots", () => {
    const { data, dealId } = paid();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot: "My apartment", time: SOON })).toThrow(/suggested meetup spots/);
  });

  it.each(["2026-11-17T14:00:00.000Z", "2026-12-01T15:00:01.000Z", "2026-11-18 15:00", "tomorrow"])("refuses the time %s", (time) => {
    const { data, dealId } = paid();
    expect(() => proposeMeetup(data, ctxAt(), "will", dealId, { spot, time })).toThrow(/next 14 days/);
  });
});

describe("acceptMeetup", () => {
  it("is agreed by the other person and remembered for good", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(() => acceptMeetup(proposed, ctxAt(), "bob", dealId)).toThrow(/Wait for the other person/);

    const agreed = acceptMeetup(proposed, ctxAt(), "will", dealId).data;
    expect(dealIn(agreed, dealId)).toMatchObject({ meetup: { agreed: true }, meetupEverAgreed: true });
    expect(eventsIn(agreed, dealId)).toContain("Will Baldwin agreed to the meetup.");

    const changed = proposeMeetup(agreed, ctxAt(), "will", dealId, { spot: "Cistern Yard", time: SOON }).data;
    expect(dealIn(changed, dealId)).toMatchObject({ meetup: { agreed: false }, meetupEverAgreed: true });
  });

  it("refuses a time that has already passed", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    expect(() => acceptMeetup(proposed, ctxAt("2026-11-18T16:00:00.000Z"), "will", dealId)).toThrow(/has passed/);
  });
});

describe("cancelling after a meetup", () => {
  it("is seller-only once a meetup was ever agreed, even if a new one is proposed", () => {
    const { data, dealId } = paid();
    const proposed = proposeMeetup(data, ctxAt(), "bob", dealId, { spot, time: SOON }).data;
    const agreed = acceptMeetup(proposed, ctxAt(), "will", dealId).data;
    expect(() => cancelDeal(agreed, ctxAt(), "will", dealId)).toThrow(/only the seller/);

    const reproposed = proposeMeetup(agreed, ctxAt(), "will", dealId, { spot: "Cistern Yard", time: SOON }).data;
    expect(() => cancelDeal(reproposed, ctxAt(), "will", dealId)).toThrow(/only the seller/);
    expect(() => cancelDeal(reproposed, ctxAt(), "bob", dealId)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/rules/meetups.test.ts`
Expected: FAIL — cannot find `./meetups.ts`.

- [ ] **Step 3: Implement** — `src/data/rules/meetups.ts`:

```ts
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
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./meetups.ts";
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/data/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rules
git commit -m "feat(rules): meetup proposals; buyer can't cancel after a meetup was agreed"
```

---

### Task 9: Handoff and rating rules

**Files:** Create `src/data/rules/handoff.ts`, `handoff.test.ts`; modify `index.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/rules/handoff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ctxAt, dealIn, eventsIn, listingIn, opened, paid, someData, userIn } from "../../test/fixtures.ts";
import type { Data } from "../../types.ts";
import { confirmHandoff, MAX_WRONG_TRIES, newHandoffCode, rateDeal } from "./handoff.ts";

function handedOff() {
  const { data, dealId } = paid();
  return { data: confirmHandoff(data, ctxAt(), "bob", dealId, "123456").data, dealId };
}

describe("confirmHandoff", () => {
  it("completes the deal and sells the item when the code matches", () => {
    const annDeal = opened(someData(), "ann");
    const { data, dealId } = paid(annDeal.data);
    const result = confirmHandoff(data, ctxAt(), "bob", dealId, " 123456 ");
    expect(result.matched).toBe(true);
    expect(dealIn(result.data, dealId).status).toBe("completed");
    expect(listingIn(result.data).status).toBe("sold");
    expect(result.data.handoffCodes).toEqual([]);
    expect(userIn(result.data, "bob").stats.completedHandoffs).toBe(1);
    expect(userIn(result.data, "will").stats.completedHandoffs).toBe(1);
    expect(dealIn(result.data, annDeal.dealId)).toMatchObject({ status: "closed", closeReason: "sold_elsewhere" });
    expect(eventsIn(result.data, annDeal.dealId)).toContain("This item was sold to another student.");
  });

  it("counts wrong codes without completing", () => {
    const { data, dealId } = paid();
    const result = confirmHandoff(data, ctxAt(), "bob", dealId, "000000");
    expect(result).toMatchObject({ matched: false, triesLeft: MAX_WRONG_TRIES - 1 });
    expect(dealIn(result.data, dealId).status).toBe("held");
    expect(result.data.handoffCodes[0].wrongTries).toBe(1);
  });

  it("locks the code after too many wrong tries until the buyer makes a new one", () => {
    const start = paid();
    let data: Data = start.data;
    for (let i = 0; i < MAX_WRONG_TRIES; i++) data = confirmHandoff(data, ctxAt(), "bob", start.dealId, "000000").data;
    expect(() => confirmHandoff(data, ctxAt(), "bob", start.dealId, "123456")).toThrow(/Too many wrong codes/);

    const fresh = newHandoffCode(data, ctxAt(undefined, "654321"), "will", start.dealId).data;
    expect(fresh.handoffCodes).toEqual([{ dealId: start.dealId, buyerId: "will", code: "654321", wrongTries: 0 }]);
    expect(eventsIn(fresh, start.dealId)).toContain("Will Baldwin made a new handoff code.");
    expect(confirmHandoff(fresh, ctxAt(), "bob", start.dealId, "654321").matched).toBe(true);
  });

  it("only lets the seller confirm a paid deal", () => {
    const { data, dealId } = paid();
    expect(() => confirmHandoff(data, ctxAt(), "will", dealId, "123456")).toThrow(/Only the seller/);
    const open = opened();
    expect(() => confirmHandoff(open.data, ctxAt(), "bob", open.dealId, "123456")).toThrow(/isn't waiting/);
  });
});

describe("newHandoffCode", () => {
  it("is only for the buyer of a paid deal", () => {
    const { data, dealId } = paid();
    expect(() => newHandoffCode(data, ctxAt(), "bob", dealId)).toThrow(/Only the buyer/);
    const open = opened();
    expect(() => newHandoffCode(open.data, ctxAt(), "will", open.dealId)).toThrow(/isn't waiting/);
  });
});

describe("rateDeal", () => {
  it("lets each person rate the other once after the handoff", () => {
    const { data, dealId } = handedOff();
    const rated = rateDeal(data, ctxAt(), "will", dealId, "up").data;
    expect(userIn(rated, "bob").stats.thumbsUp).toBe(1);
    expect(dealIn(rated, dealId).ratings).toEqual({ byBuyer: "up" });
    expect(() => rateDeal(rated, ctxAt(), "will", dealId, "down")).toThrow(/already rated/);

    const both = rateDeal(rated, ctxAt(), "bob", dealId, "down").data;
    expect(userIn(both, "will").stats.thumbsDown).toBe(1);
  });

  it("waits for the handoff and refuses outsiders", () => {
    const { data, dealId } = paid();
    expect(() => rateDeal(data, ctxAt(), "will", dealId, "up")).toThrow(/once the handoff/);
    const done = handedOff();
    expect(() => rateDeal(done.data, ctxAt(), "ann", done.dealId, "up")).toThrow(/not part/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/rules/handoff.test.ts`
Expected: FAIL — cannot find `./handoff.ts`.

- [ ] **Step 3: Implement** — `src/data/rules/handoff.ts`:

```ts
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
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./handoff.ts";
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/data/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rules
git commit -m "feat(rules): 6-digit handoff with a 10-try cap, new codes, ratings"
```

---

### Task 10: Saved items rule

**Files:** Create `src/data/rules/saves.ts`, `saves.test.ts`; modify `index.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/rules/saves.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aListing, ctxAt, NOW, someData } from "../../test/fixtures.ts";
import { toggleSave } from "./saves.ts";

describe("toggleSave", () => {
  it("saves and unsaves", () => {
    const saved = toggleSave(someData(), ctxAt(), "will", "chair");
    expect(saved.saved).toBe(true);
    expect(saved.data.saves).toEqual([{ userId: "will", listingId: "chair", savedAt: NOW }]);
    expect(toggleSave(saved.data, ctxAt(), "will", "chair")).toMatchObject({ saved: false, data: { saves: [] } });
  });

  it("won't save a removed listing but lets you unsave it", () => {
    const removed = someData({ listings: [aListing({ status: "removed" })] });
    expect(() => toggleSave(removed, ctxAt(), "will", "chair")).toThrow(/removed/);
    const withSave = { ...removed, saves: [{ userId: "will", listingId: "chair", savedAt: NOW }] };
    expect(toggleSave(withSave, ctxAt(), "will", "chair").saved).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/rules/saves.test.ts`
Expected: FAIL — cannot find `./saves.ts`.

- [ ] **Step 3: Implement** — `src/data/rules/saves.ts`:

```ts
// Saved items: a student's private shortlist.

import type { Data, Save } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { check } from "./errors.ts";
import { getListing, getUser } from "./shared.ts";

export function toggleSave(data: Data, ctx: RuleContext, userId: string, listingId: string) {
  getUser(data, userId);
  const listing = getListing(data, listingId);
  const isThis = (s: Save) => s.userId === userId && s.listingId === listingId;
  if (data.saves.some(isThis)) return { data: { ...data, saves: data.saves.filter((s) => !isThis(s)) }, saved: false };

  check(listing.status !== "removed", "This listing was removed.");
  return { data: { ...data, saves: [...data.saves, { userId, listingId, savedAt: ctx.now }] }, saved: true };
}
```

Append to `src/data/rules/index.ts`:
```ts
export * from "./saves.ts";
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/data/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rules
git commit -m "feat(rules): save and unsave listings"
```

---

### Task 11: Selectors

**Files:** Create `src/data/selectors.ts`, `selectors.test.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/selectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aListing, bob, ctxAt, dealIn, opened, paid, someData } from "../test/fixtures.ts";
import { places } from "./campus.ts";
import { cancelDeal, markRead, sendMessage, startDeal } from "./rules/index.ts";
import {
  browseListings, dealsForUser, dealStatusLabel, displayName, handoffCodeFor, savedListings,
  thumbsUpPercent, unreadCount, unreadDealCount, type BrowseFilters,
} from "./selectors.ts";

describe("displayName", () => {
  it("shows full names to signed-in students and first name + initial to visitors", () => {
    expect(displayName(bob, true)).toBe("Bob Smith");
    expect(displayName(bob, false)).toBe("Bob S.");
    expect(displayName({ ...bob, name: "Cher" }, false)).toBe("Cher");
    expect(displayName({ ...bob, name: "Mary Ann van der berg" }, false)).toBe("Mary B.");
    expect(displayName(undefined, true)).toBe("Unknown student");
  });
});

describe("browseListings", () => {
  const berry = places[0]; // Berry Hall
  const all: BrowseFilters = { query: "", category: null, campusId: "all", origin: berry, sort: "nearest", freeOnly: false, maxPriceCents: null };
  const listings = [
    aListing({ id: "near", location: "Berry Hall", priceCents: 3000, createdAt: "2026-11-01T00:00:00.000Z" }),
    aListing({ id: "far", location: "McConnel Hall", priceCents: 500, createdAt: "2026-11-05T00:00:00.000Z" }),
    aListing({ id: "free", location: "Craig Hall", priceCents: 0, title: "Free lamp", createdAt: "2026-11-03T00:00:00.000Z" }),
    aListing({ id: "book", location: "Craig Hall", category: "Textbooks", title: "Calculus", courseCode: "MATH 120", createdAt: "2026-11-02T00:00:00.000Z" }),
    aListing({ id: "sold", status: "sold" }),
    aListing({ id: "gone", status: "removed" }),
    aListing({ id: "held", status: "reserved", location: "Berry Hall" }),
  ];
  const ids = (changes: Partial<BrowseFilters>) => browseListings(listings, { ...all, ...changes }).map((r) => r.listing.id);

  it("hides sold and removed listings and sorts nearest first, newest breaking ties", () => {
    expect(ids({})).toEqual(["held", "near", "free", "book", "far"]);
  });

  it("filters by category, price and free", () => {
    expect(ids({ category: "Textbooks" })).toEqual(["book"]);
    expect(ids({ freeOnly: true })).toEqual(["free"]);
    expect(ids({ maxPriceCents: 1000 })).toEqual(["free", "far"]);
  });

  it("searches titles, descriptions and course codes however they're typed", () => {
    expect(ids({ query: "lamp" })).toEqual(["free"]);
    expect(ids({ query: "math120" })).toEqual(["book"]);
    expect(ids({ query: "Math 120" })).toEqual(["book"]);
  });

  it("sorts by newest or price", () => {
    expect(ids({ sort: "newest" })).toEqual(["far", "free", "book", "held", "near"]);
    expect(ids({ sort: "price" })).toEqual(["free", "far", "held", "book", "near"]);
  });

  it("filters by campus", () => {
    expect(ids({ campusId: "cofc" })).toHaveLength(5);
    expect(ids({ campusId: "elsewhere" })).toEqual([]);
  });
});

describe("deal views", () => {
  it("counts unread messages from the other person since the last read", () => {
    const { data, dealId } = opened();
    const withMessage = sendMessage(data, ctxAt("2026-11-17T16:00:00.000Z"), "bob", dealId, "Hi").data;
    expect(unreadCount(withMessage, dealId, "will")).toBe(1);
    expect(unreadCount(withMessage, dealId, "bob")).toBe(0);
    expect(unreadDealCount(withMessage, "will")).toBe(1);
    const read = markRead(withMessage, ctxAt("2026-11-17T16:05:00.000Z"), "will", dealId).data;
    expect(unreadCount(read, dealId, "will")).toBe(0);
  });

  it("lists a student's deals by latest activity", () => {
    const two = someData({ listings: [aListing(), aListing({ id: "lamp" })] });
    const a = startDeal(two, ctxAt("2026-11-17T10:00:00.000Z"), "will", "chair");
    const b = startDeal(a.data, ctxAt("2026-11-17T11:00:00.000Z"), "will", "lamp");
    expect(dealsForUser(b.data, "will").map((d) => d.id)).toEqual([b.deal.id, a.deal.id]);
    const bumped = sendMessage(b.data, ctxAt("2026-11-17T12:00:00.000Z"), "will", a.deal.id, "Still there?").data;
    expect(dealsForUser(bumped, "will").map((d) => d.id)).toEqual([a.deal.id, b.deal.id]);
    expect(dealsForUser(bumped, "ann")).toEqual([]);
  });

  it("shows the handoff code to the buyer only", () => {
    const { data, dealId } = paid();
    expect(handoffCodeFor(data, dealIn(data, dealId), "will")?.code).toBe("123456");
    expect(handoffCodeFor(data, dealIn(data, dealId), "bob")).toBeUndefined();
  });

  it("labels each status", () => {
    const { data, dealId } = opened();
    expect(dealStatusLabel(data, dealIn(data, dealId))).toBe("Chatting");
    expect(dealStatusLabel(data, dealIn(cancelDeal(data, ctxAt(), "bob", dealId).data, dealId))).toBe("Cancelled by Bob Smith");
    const held = paid();
    expect(dealStatusLabel(held.data, dealIn(held.data, held.dealId))).toBe("Payment held");
  });
});

describe("profile views", () => {
  it("works out thumbs-up percent only once someone has rated", () => {
    expect(thumbsUpPercent({ completedHandoffs: 3, thumbsUp: 0, thumbsDown: 0 })).toBeNull();
    expect(thumbsUpPercent({ completedHandoffs: 4, thumbsUp: 3, thumbsDown: 1 })).toBe(75);
  });

  it("lists saved listings newest first, skipping removed ones", () => {
    const data = someData({
      listings: [aListing(), aListing({ id: "lamp" }), aListing({ id: "gone", status: "removed" })],
      saves: [
        { userId: "will", listingId: "chair", savedAt: "2026-11-10T00:00:00.000Z" },
        { userId: "will", listingId: "lamp", savedAt: "2026-11-12T00:00:00.000Z" },
        { userId: "will", listingId: "gone", savedAt: "2026-11-13T00:00:00.000Z" },
        { userId: "ann", listingId: "chair", savedAt: "2026-11-14T00:00:00.000Z" },
      ],
    });
    expect(savedListings(data, "will").map((l) => l.id)).toEqual(["lamp", "chair"]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/selectors.test.ts`
Expected: FAIL — cannot find `./selectors.ts`.

- [ ] **Step 3: Implement** — `src/data/selectors.ts`:

```ts
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
      return deal.paidCents ? "Payment held" : "Reserved";
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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/data`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/selectors.ts src/data/selectors.test.ts
git commit -m "feat(data): selectors for browse, deals, unread, profiles, saved items"
```

---

### Task 12: Storage

**Files:** Create `src/data/storage.ts`, `storage.test.ts`.

- [ ] **Step 1: Write the failing test** — `src/data/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { someData } from "../test/fixtures.ts";
import type { Data } from "../types.ts";
import { dataKey, loadData, loadSession, memoryStorage, saveData, saveSession } from "./storage.ts";

const KEY = dataKey("abc");
const empty = (): Data => ({ users: [], listings: [], deals: [], messages: [], dealReads: [], handoffCodes: [], saves: [] });

describe("storage", () => {
  it("round-trips saved data", () => {
    const storage = memoryStorage();
    expect(saveData(storage, KEY, someData())).toBe(true);
    expect(loadData(storage, KEY, empty)).toEqual(someData());
  });

  it("starts fresh when nothing is saved, the save is corrupt, or it's an old shape", () => {
    const storage = memoryStorage();
    expect(loadData(storage, KEY, empty)).toEqual(empty());
    storage.setItem(KEY, "{not json");
    expect(loadData(storage, KEY, empty)).toEqual(empty());
    storage.setItem(KEY, JSON.stringify({ users: [], listings: [], deals: [] }));
    expect(loadData(storage, KEY, empty)).toEqual(empty());
  });

  it("reports when the browser refuses to save", () => {
    const full = memoryStorage();
    full.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(saveData(full, KEY, someData())).toBe(false);
  });

  it("clears out old save slots to free space, and nothing else", () => {
    const storage = memoryStorage();
    storage.setItem("campus-circulate-demo-123", "old");
    storage.setItem(dataKey("older"), "old");
    storage.setItem("campus-circulate-theme", "dark");
    loadData(storage, KEY, empty);
    expect(storage.getItem("campus-circulate-demo-123")).toBeNull();
    expect(storage.getItem(dataKey("older"))).toBeNull();
    expect(storage.getItem("campus-circulate-theme")).toBe("dark");
  });

  it("remembers who is signed in", () => {
    const session = memoryStorage();
    saveSession(session, "u1");
    expect(loadSession(session)).toBe("u1");
    saveSession(session, null);
    expect(loadSession(session)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/data/storage.test.ts`
Expected: FAIL — cannot find `./storage.ts`.

- [ ] **Step 3: Implement** — `src/data/storage.ts`:

```ts
// Where local mode keeps things. Shared data (listings, deals, …) goes in localStorage so every tab
// sees it; who is signed in goes in sessionStorage so each tab can be a different student.
// A backend replaces this file entirely.

import type { Data } from "../types.ts";

const DATA_PREFIX = "campus-circulate:v2:";
const OLD_PREFIX = "campus-circulate-demo-"; // the class demo's save slots
const SESSION_KEY = "campus-circulate:session";
const COLLECTIONS = ["users", "listings", "deals", "messages", "dealReads", "handoffCodes", "saves"] as const;

export function dataKey(version: string): string {
  return DATA_PREFIX + version;
}

// An in-memory stand-in for when the browser blocks storage, and for tests.
export function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key) {
      return items.get(key) ?? null;
    },
    key(index) {
      return [...items.keys()][index] ?? null;
    },
    removeItem(key) {
      items.delete(key);
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
  };
}

// The browser's storage, or the in-memory stand-in when it's blocked (some privacy modes throw on access).
export function browserStorage(kind: "localStorage" | "sessionStorage"): Storage {
  try {
    return window[kind];
  } catch {
    return memoryStorage();
  }
}

function isData(value: unknown): value is Data {
  return typeof value === "object" && value !== null && COLLECTIONS.every((key) => Array.isArray((value as Record<string, unknown>)[key]));
}

// Older versions' save slots only take up room; storage is small (about 5 MB).
function removeStaleSlots(storage: Storage, keepKey: string) {
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key !== keepKey && (key.startsWith(DATA_PREFIX) || key.startsWith(OLD_PREFIX))) stale.push(key);
  }
  stale.forEach((key) => storage.removeItem(key));
}

export function loadData(storage: Storage, key: string, fresh: () => Data): Data {
  try {
    removeStaleSlots(storage, key);
    const text = storage.getItem(key);
    const saved: unknown = text ? JSON.parse(text) : null;
    if (isData(saved)) return saved;
  } catch {
    // unreadable or corrupt: start fresh
  }
  return fresh();
}

// false means the browser refused (usually storage full), so the app can warn instead of losing work silently.
export function saveData(storage: Storage, key: string, data: Data): boolean {
  try {
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSession(storage: Storage): string | null {
  try {
    return storage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSession(storage: Storage, userId: string | null): void {
  try {
    if (userId) storage.setItem(SESSION_KEY, userId);
    else storage.removeItem(SESSION_KEY);
  } catch {
    // blocked: the student stays signed in until the tab closes
  }
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS (all rule, selector, storage and lib files).

- [ ] **Step 5: Commit**

```bash
git add src/data/storage.ts src/data/storage.test.ts
git commit -m "feat(data): versioned local storage that reports failed saves; per-tab sessions"
```

---

### Task 13: The store seam (async, ready, latest-data ref, tab sync)

**Files:** Rewrite `src/data/storeContext.ts`, `src/data/StoreProvider.tsx`; modify `src/lib/format.ts`.

- [ ] **Step 1: Rewrite `src/data/storeContext.ts`:**

```ts
// The app's data and actions, available to any component through useStore(). Pages read the
// collections and call these methods; they never change data themselves. StoreProvider.tsx
// implements it, and it's the only file a backend replaces.

import { createContext, useContext } from "react";
import type { Data, Deal, Listing, ListingInput, Rating, User } from "../types.ts";
import type { MeetupInput, SignUpInput } from "./rules/index.ts";

export type HandoffAttempt = { matched: true } | { matched: false; triesLeft: number };

// Every action is async: instant in local mode, a network call with a backend.
export type Store = Data & {
  ready: boolean; // false while data is loading
  currentUser: User | null;
  saveFailed: boolean; // the browser refused to save (usually storage full)

  signIn: (email: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsSample: (userId: string) => Promise<void>; // local mode only
  resetLocalData: () => Promise<void>; // local mode only

  createListing: (input: ListingInput) => Promise<Listing>;
  updateListing: (listingId: string, input: ListingInput) => Promise<void>;
  removeListing: (listingId: string) => Promise<void>;
  toggleSave: (listingId: string) => Promise<boolean>;

  startDeal: (listingId: string) => Promise<Deal>;
  buyNow: (listingId: string) => Promise<Deal>; // start (or reuse) the deal and pay, all or nothing
  sendMessage: (dealId: string, text: string) => Promise<void>;
  payDeal: (dealId: string) => Promise<void>;
  cancelDeal: (dealId: string) => Promise<void>;
  makeOffer: (dealId: string, amountCents: number) => Promise<void>;
  acceptOffer: (dealId: string) => Promise<void>;
  declineOffer: (dealId: string) => Promise<void>;
  proposeMeetup: (dealId: string, input: MeetupInput) => Promise<void>;
  acceptMeetup: (dealId: string) => Promise<void>;
  confirmHandoff: (dealId: string, code: string) => Promise<HandoffAttempt>;
  newHandoffCode: (dealId: string) => Promise<void>;
  rateDeal: (dealId: string, rating: Rating) => Promise<void>;
  markRead: (dealId: string) => Promise<void>;
};

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore() has to be used inside <StoreProvider>");
  return store;
}

// For pages behind the sign-in wall, where there's always a signed-in student.
export function useMe(): User {
  const { currentUser } = useStore();
  if (!currentUser) throw new Error("useMe() needs a signed-in student");
  return currentUser;
}
```

- [ ] **Step 2: Rewrite `src/data/StoreProvider.tsx`:**

```tsx
// Local-mode implementation of the store: each method runs one rule from ./rules against the newest
// data and saves the result in this browser. THIS is the backend seam: replace each method body with
// a server call (see docs/backend-handoff.md) and the pages don't change.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { localMode } from "../config.ts";
import { newCode, newId } from "../lib/ids.ts";
import type { Data } from "../types.ts";
import * as rules from "./rules/index.ts";
import { emptyData, SAMPLE_VERSION, sampleData, sampleUsers } from "./sample.ts";
import { findUserByEmail } from "./selectors.ts";
import { browserStorage, dataKey, loadData, loadSession, saveData, saveSession } from "./storage.ts";
import { StoreContext, type Store } from "./storeContext.ts";

const shared = browserStorage("localStorage");
const tab = browserStorage("sessionStorage");
const KEY = dataKey(SAMPLE_VERSION);
const fresh = () => (localMode ? sampleData() : emptyData());

function liveContext(): rules.RuleContext {
  return { now: new Date().toISOString(), newId, newCode: () => newCode(rules.HANDOFF_CODE_DIGITS) };
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => loadData(shared, KEY, fresh));
  const [userId, setUserId] = useState(() => loadSession(tab));
  const [saveFailed, setSaveFailed] = useState(false);
  // The newest values, readable before React re-renders. Rules always start from these, so two
  // actions in a row (send a message, then mark it read) build on each other instead of the
  // second one undoing the first.
  const latest = useRef({ data, userId });

  // Another tab saved: show its changes here too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== KEY) return;
      const next = loadData(shared, KEY, fresh);
      latest.current.data = next;
      setData(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function commit(next: Data) {
    latest.current.data = next;
    setData(next);
    setSaveFailed(!saveData(shared, KEY, next));
  }

  function setSession(id: string | null) {
    latest.current.userId = id;
    setUserId(id);
    saveSession(tab, id);
  }

  function me(): string {
    const id = latest.current.userId;
    if (!id) throw new rules.RuleError("Please sign in first.");
    return id;
  }

  // Run one rule against the newest data, save what it returns, and hand back its extras.
  function run<T extends { data: Data }>(rule: (data: Data, ctx: rules.RuleContext, actorId: string) => T): T {
    const result = rule(latest.current.data, liveContext(), me());
    commit(result.data);
    return result;
  }

  const store: Store = {
    ...data,
    ready: true, // local data is available immediately
    currentUser: data.users.find((u) => u.id === userId) ?? null,
    saveFailed,

    async signIn(email) {
      const user = findUserByEmail(latest.current.data, email);
      if (!user) throw new rules.RuleError("No student account found for that email.");
      setSession(user.id);
    },
    async signUp(input) {
      const { data: next, user } = rules.signUp(latest.current.data, liveContext(), input);
      commit(next);
      setSession(user.id);
    },
    async signOut() {
      setSession(null);
    },
    async signInAsSample(id) {
      // Testing only: never a way into a real account.
      if (!localMode || !sampleUsers.some((u) => u.id === id)) throw new rules.RuleError("Not a sample account.");
      setSession(id);
    },
    async resetLocalData() {
      if (!localMode) return;
      commit(fresh());
      setSession(null);
    },

    createListing: async (input) => run((d, ctx, actor) => rules.createListing(d, ctx, actor, input)).listing,
    updateListing: async (listingId, input) => {
      run((d, ctx, actor) => rules.updateListing(d, ctx, actor, listingId, input));
    },
    removeListing: async (listingId) => {
      run((d, ctx, actor) => rules.removeListing(d, ctx, actor, listingId));
    },
    toggleSave: async (listingId) => run((d, ctx, actor) => rules.toggleSave(d, ctx, actor, listingId)).saved,

    startDeal: async (listingId) => run((d, ctx, actor) => rules.startDeal(d, ctx, actor, listingId)).deal,
    buyNow: async (listingId) =>
      run((d, ctx, actor) => {
        const started = rules.startDeal(d, ctx, actor, listingId);
        return { ...rules.payDeal(started.data, ctx, actor, started.deal.id), deal: started.deal };
      }).deal,
    sendMessage: async (dealId, text) => {
      run((d, ctx, actor) => rules.sendMessage(d, ctx, actor, dealId, text));
    },
    payDeal: async (dealId) => {
      run((d, ctx, actor) => rules.payDeal(d, ctx, actor, dealId));
    },
    cancelDeal: async (dealId) => {
      run((d, ctx, actor) => rules.cancelDeal(d, ctx, actor, dealId));
    },
    makeOffer: async (dealId, amountCents) => {
      run((d, ctx, actor) => rules.makeOffer(d, ctx, actor, dealId, amountCents));
    },
    acceptOffer: async (dealId) => {
      run((d, ctx, actor) => rules.acceptOffer(d, ctx, actor, dealId));
    },
    declineOffer: async (dealId) => {
      run((d, ctx, actor) => rules.declineOffer(d, ctx, actor, dealId));
    },
    proposeMeetup: async (dealId, input) => {
      run((d, ctx, actor) => rules.proposeMeetup(d, ctx, actor, dealId, input));
    },
    acceptMeetup: async (dealId) => {
      run((d, ctx, actor) => rules.acceptMeetup(d, ctx, actor, dealId));
    },
    confirmHandoff: async (dealId, code) => {
      const result = run((d, ctx, actor) => rules.confirmHandoff(d, ctx, actor, dealId, code));
      return result.matched ? { matched: true } : { matched: false, triesLeft: result.triesLeft };
    },
    newHandoffCode: async (dealId) => {
      run((d, ctx, actor) => rules.newHandoffCode(d, ctx, actor, dealId));
    },
    rateDeal: async (dealId, rating) => {
      run((d, ctx, actor) => rules.rateDeal(d, ctx, actor, dealId, rating));
    },
    markRead: async (dealId) => {
      run((d, ctx, actor) => rules.markRead(d, ctx, actor, dealId));
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
```

- [ ] **Step 3: Drop `dealStatus` from `src/lib/format.ts`** (it moved to `dealStatusLabel` in selectors). The file becomes:

```ts
// Turns a price in cents into text people read: 4500 -> "$45", 4550 -> "$45.50", 0 -> "Free".
export function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
```

- [ ] **Step 4: Tests still pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/storeContext.ts src/data/StoreProvider.tsx src/lib/format.ts
git commit -m "feat(data): async store seam with latest-data ref, tab sync and save-failure flag"
```

---

### Task 14: Port pages and components; delete the old data layer

**Files:** Modify `src/components/Layout.tsx`, `SignInModal.tsx`, `DealChat.tsx`; `src/pages/BrowsePage.tsx`, `ListingPage.tsx`, `DealsPage.tsx`, `DealPage.tsx`, `AccountPage.tsx`, `CreateListingPage.tsx`. Delete `src/data/actions.ts`, `places.ts`, `fakeUsers.ts`, `fakeListings.ts`.

Same UI as today. Only behavior differences: 6-digit handoff codes, role-aware "handoff complete" copy (spec fix 3), events shown as gray lines, photos compressed to 600px.

- [ ] **Step 1: `Layout.tsx`** — four edits:

```tsx
// line 14
  const { currentUser, ready, signOut: endSession, resetLocalData, signInAsSample } = useStore();
```
```tsx
  async function signOut() {
    await endSession();
    navigate("/");
  }

  // clears accounts, listings, and deals made while testing
  async function reset() {
    if (!window.confirm("Reset local data? Accounts, listings, and deals made in this browser will be removed.")) return;
    await resetLocalData();
    navigate("/");
  }
```
In the "Act as" `<select>`, replace the `onChange`:
```tsx
onChange={async (e) => { if (e.target.value) { await signInAsSample(e.target.value); navigate("/"); } }}
```
Replace `<Outlet context={context} />` with:
```tsx
        {ready ? <Outlet context={context} /> : <p className="text-gray-600">Loading…</p>}
```

- [ ] **Step 2: `SignInModal.tsx`** — imports, store, code, verify, sample buttons:

```tsx
import { useEffect, useState } from "react";
import { campusForEmail, campuses, placesOnCampus } from "../data/campus.ts";
import { friendlyError, isEduEmail } from "../data/rules/index.ts";
import { useStore } from "../data/storeContext.ts";
import { newCode } from "../lib/ids.ts";
```
```tsx
  const { users, signIn, signUp, signInAsSample } = useStore();
```
In `sendCode()`: `setSentCode(newCode(6));`

Replace `verify()`:
```tsx
  async function verify() {
    if (code !== sentCode) {
      setError("That code doesn't match.");
      return;
    }
    try {
      if (mode === "signUp") await signUp({ name, email, dorm: chosenDorm });
      else await signIn(email);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }
```
The verify form's `onSubmit` body becomes `event.preventDefault(); void verify();`.
Sample buttons: `onClick={async () => { await signInAsSample("u1"); onClose(); }}` and the same with `"u2"`.

- [ ] **Step 3: `BrowsePage.tsx`** — replace imports and everything above `let heading` with:

```tsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import ListingCard from "../components/ListingCard.tsx";
import { useLayout } from "../components/layoutContext.ts";
import SignInGate from "../components/SignInGate.tsx";
import { campusForEmail, campuses, placeByName, places, placesOnCampus } from "../data/campus.ts";
import { categories } from "../data/categories.ts";
import { browseListings } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";

// The home page. Anyone can look; clicking anything while signed out opens the sign-in window.
export default function BrowsePage() {
  const { listings, currentUser } = useStore();
  const { openSignIn } = useLayout();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  // only real categories count, so a hand-edited URL can't break the page
  const category = categories.find((c) => c === params.get("category")) ?? null;

  // filters: which campus, and which hall to measure distance from
  const myCampus = currentUser ? campusForEmail(currentUser.email) : undefined;
  const [campusId, setCampusId] = useState(myCampus?.id ?? "all");
  const [from, setFrom] = useState(currentUser?.dorm ?? places[0].name);
  const hallOptions = campusId === "all" ? places : placesOnCampus(campusId);
  const fromHall = hallOptions.some((p) => p.name === from) ? from : hallOptions[0].name;
  const origin = placeByName(fromHall) ?? places[0];
  const results = browseListings(listings, { query, category, campusId, origin, sort: "nearest", freeOnly: false, maxPriceCents: null });
```
(JSX below is unchanged.)

- [ ] **Step 4: `ListingPage.tsx`** — replace the file:

```tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ListingPhoto from "../components/ListingPhoto.tsx";
import { useLayout } from "../components/layoutContext.ts";
import { getCampus, placeByName } from "../data/campus.ts";
import { friendlyError } from "../data/rules/index.ts";
import { useStore } from "../data/storeContext.ts";
import { formatDistance, milesBetween } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";

export default function ListingPage() {
  const { listingId = "" } = useParams();
  const { listings, users, deals, currentUser, buyNow } = useStore();
  const { openSignIn } = useLayout();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false); // the card pop-up

  const listing = listings.find((l) => l.id === listingId && l.status !== "removed");
  if (!listing) {
    return (
      <p>
        Listing not found.{" "}
        <Link to="/" className="text-blue-700 hover:underline">
          Back to listings
        </Link>
      </p>
    );
  }

  const seller = users.find((u) => u.id === listing.sellerId);
  // the signed-in buyer's current deal on this item (sellers manage theirs from Deals)
  const myDeal = currentUser ? deals.find((d) => d.listingId === listing.id && d.buyerId === currentUser.id && d.status !== "closed") : undefined;
  const pickup = placeByName(listing.location);
  const myHall = currentUser?.dorm ? placeByName(currentUser.dorm) : undefined;

  const price = formatPrice(listing.priceCents);
  const paid = listing.priceCents > 0;

  function buy() {
    // signed-out visitors have to sign in first
    if (!currentUser) {
      openSignIn();
      return;
    }
    // paid items go through the card pop-up first; free items reserve right away
    if (paid) setPayOpen(true);
    else void completePurchase();
  }

  async function completePurchase() {
    try {
      const deal = await buyNow(listingId);
      navigate(`/deals/${deal.id}`);
    } catch (err) {
      setPayOpen(false);
      setError(friendlyError(err));
    }
  }

  let action;
  if (myDeal) {
    action = (
      <Link to={`/deals/${myDeal.id}`} className="btn btn-cardinal">
        View deal
      </Link>
    );
  } else if (listing.sellerId === currentUser?.id) {
    action = <p className="text-gray-600">This is your listing.</p>;
  } else if (listing.status === "active") {
    action = (
      <>
        <button type="button" onClick={buy} className="btn btn-primary">
          {paid ? `Buy for ${price}` : "Reserve it (free)"}
        </button>
        <p className="mt-2 text-sm text-gray-600">
          {paid ? "Your payment is held" : "It's held for you"} until you meet {seller?.name} and give them
          your handoff code.
        </p>
      </>
    );
  } else {
    action = <p className="text-gray-600">{listing.status === "sold" ? "Sold." : "Reserved by another student."}</p>;
  }

  return (
    <div>
      <Link to="/" className="text-sm text-blue-700 hover:underline">
        ← Back to listings
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <ListingPhoto src={listing.photoUrl} alt={listing.title} className="aspect-square w-full rounded border border-gray-200 bg-surface object-contain" />
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="listing-price mt-1 text-xl font-semibold">{price}</p>
          <p className="mt-2 text-sm text-gray-600">
            {listing.location}
            {pickup && `, ${getCampus(pickup.campusId)?.name}`}
            {myHall && pickup && ` · ${formatDistance(milesBetween(myHall, pickup))} from your dorm`}
          </p>
          <p className="text-sm text-gray-600">
            {listing.category} · Seller: {seller?.name} (verified student)
          </p>
          <p className="mt-4">{listing.description}</p>
          <div className="mt-6">
            {action}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>

      {/* Card pop-up: nothing is charged; any card details work. Replaced in Phase 1. */}
      {payOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPayOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-title"
            onSubmit={(event) => {
              event.preventDefault();
              void completePurchase();
            }}
            className="card relative w-full max-w-sm space-y-4 p-6 shadow-lg"
          >
            <button type="button" onClick={() => setPayOpen(false)} aria-label="Close" className="absolute top-3 right-3 px-2 text-xl text-gray-500 hover:text-gray-900">
              ×
            </button>
            <div>
              <h2 id="pay-title" className="text-xl font-bold">
                Pay {price}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {listing.title} from {seller?.name}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="card">
                Card number
              </label>
              <input id="card" required autoComplete="off" inputMode="numeric" placeholder="4242 4242 4242 4242" className="field font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="expiry">
                  Expires
                </label>
                <input id="expiry" required autoComplete="off" placeholder="MM / YY" className="field font-mono" />
              </div>
              <div>
                <label className="label" htmlFor="cvc">
                  CVC
                </label>
                <input id="cvc" required autoComplete="off" inputMode="numeric" placeholder="123" className="field font-mono" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="cardName">
                Name on card
              </label>
              <input id="cardName" required autoComplete="off" className="field" />
            </div>
            <p className="rounded bg-gray-100 p-3 text-sm">
              DEMO: No real charges. Your {price} is held, not paid to {seller?.name}, until you give them your
              handoff code at the meetup.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Pay {price}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `DealsPage.tsx`** — replace the file:

```tsx
import { Link } from "react-router";
import { priceFor } from "../data/rules/index.ts";
import { dealsForUser, dealStatusLabel, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { formatPrice } from "../lib/format.ts";
import type { DealStatus } from "../types.ts";

const statusColor: Record<DealStatus, string> = {
  open: "text-gray-600",
  held: "text-amber-700",
  completed: "text-green-700",
  closed: "text-gray-500",
};

export default function DealsPage() {
  const store = useStore();
  const me = useMe();
  const myDeals = dealsForUser(store, me.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">My deals</h1>
      {myDeals.length === 0 && <p className="mt-3 text-gray-600">No deals yet. Buy something from Browse to start one.</p>}

      <div className="mt-4 space-y-2">
        {myDeals.map((deal) => {
          const listing = store.listings.find((l) => l.id === deal.listingId);
          const iAmBuyer = deal.buyerId === me.id;
          const other = nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId);
          const amount = deal.paidCents ?? (listing ? priceFor(deal, listing) : 0);
          return (
            <Link key={deal.id} to={`/deals/${deal.id}`} className="card result-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{listing?.title}</p>
                <p className="text-sm text-gray-600">
                  {iAmBuyer ? `Buying from ${other}` : `Selling to ${other}`} · <span className="listing-price">{formatPrice(amount)}</span>
                </p>
              </div>
              <span className={`text-sm font-medium ${statusColor[deal.status]}`}>{dealStatusLabel(store, deal)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `DealPage.tsx`** — replace the file:

```tsx
import { useState } from "react";
import { Link, useParams } from "react-router";
import DealChat from "../components/DealChat.tsx";
import { friendlyError, HANDOFF_CODE_DIGITS } from "../data/rules/index.ts";
import { dealStatusLabel, handoffCodeFor, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { formatPrice } from "../lib/format.ts";

export default function DealPage() {
  const { dealId = "" } = useParams();
  const store = useStore();
  const me = useMe();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const deal = store.deals.find((d) => d.id === dealId);
  // only the buyer and the seller can see a deal
  if (!deal || (deal.buyerId !== me.id && deal.sellerId !== me.id)) {
    return (
      <p>
        Deal not found.{" "}
        <Link to="/deals" className="text-blue-700 hover:underline">
          My deals
        </Link>
      </p>
    );
  }

  const listing = store.listings.find((l) => l.id === deal.listingId);
  const iAmBuyer = deal.buyerId === me.id;
  const other = nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId);
  const paidCents = deal.paidCents ?? 0;
  const price = formatPrice(paidCents);
  const statusClass = deal.status === "held" ? "text-amber-700" : deal.status === "completed" ? "text-green-700" : "text-gray-600";

  async function submitCode() {
    try {
      const result = await store.confirmHandoff(dealId, code);
      setError(result.matched ? "" : `That code doesn't match. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left.`);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  let handoff;
  if (deal.status === "completed") {
    handoff = (
      <>
        <p className="font-semibold text-green-700">Handoff complete</p>
        <p className="mt-1 text-sm text-gray-600">
          {paidCents > 0 ? (iAmBuyer ? `Your ${price} was sent to ${other}.` : `You've been paid ${price}.`) : "The item was handed off."} The
          listing is marked sold.
        </p>
      </>
    );
  } else if (deal.status === "closed") {
    handoff = <p className="font-semibold text-gray-700">{dealStatusLabel(store, deal)}</p>;
  } else if (deal.status === "open") {
    handoff = <p className="text-sm text-gray-600">Not paid yet.</p>;
  } else if (iAmBuyer) {
    handoff = (
      <>
        <p className="label">Your handoff code</p>
        <p className="font-mono text-4xl font-bold tracking-widest">{handoffCodeFor(store, deal, me.id)?.code}</p>
        <p className="mt-3 text-sm text-gray-600">
          {paidCents > 0 && `Your ${price} is on hold. `}Meet {other} and give them this code only after you have the item. That
          releases the payment.
        </p>
      </>
    );
  } else {
    handoff = (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitCode();
        }}
      >
        <p className="label">Handoff code</p>
        <p className="text-sm text-gray-600">
          {paidCents > 0 && `${price} is on hold for you. `}Enter {other}'s {HANDOFF_CODE_DIGITS}-digit code when you hand the item over.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={HANDOFF_CODE_DIGITS}
            placeholder="000000"
            aria-label="Handoff code"
            className="field w-36 font-mono tracking-widest"
          />
          <button type="submit" disabled={code.length !== HANDOFF_CODE_DIGITS} className="btn btn-primary">
            Confirm handoff
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div>
      <Link to="/deals" className="text-sm text-blue-700 hover:underline">
        ← My deals
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{listing?.title}</h1>
      <p className="text-sm text-gray-600">
        {iAmBuyer ? `Buying from ${other}` : `Selling to ${other}`} · {price} ·{" "}
        <span className={`font-medium ${statusClass}`}>{dealStatusLabel(store, deal)}</span>
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card self-start p-5">{handoff}</section>
        <DealChat deal={deal} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: `DealChat.tsx`** — replace the file:

```tsx
import { useEffect, useRef, useState } from "react";
import { friendlyError, MESSAGE_MAX } from "../data/rules/index.ts";
import { messagesForDeal, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import type { Deal } from "../types.ts";

// In-app messages between the buyer and seller, plus gray event lines ("Bob Smith paid $20").
export default function DealChat({ deal }: { deal: Deal }) {
  const store = useStore();
  const me = useMe();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesForDeal(store, deal.id);
  const canSend = deal.status === "open" || deal.status === "held";

  // keep the newest message in view
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length]);

  async function send() {
    if (!draft.trim()) return;
    try {
      await store.sendMessage(deal.id, draft);
      setDraft("");
      setError("");
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <section className="card flex h-80 flex-col">
      <h2 className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">Messages</h2>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {!messages.some((m) => m.kind === "text") && <p className="text-gray-500">No messages yet. Agree on a public spot and a time.</p>}
        {messages.map((message) => {
          if (message.kind === "event") {
            return (
              <p key={message.id} className="text-center text-xs text-gray-500">
                {message.text}
              </p>
            );
          }
          const mine = message.senderId === me.id;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded px-3 py-2 ${mine ? "bg-cardinal text-white" : "bg-gray-100"}`}>
                {!mine && <p className="text-xs font-semibold">{nameOf(store, message.senderId ?? "")}</p>}
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      {canSend && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex gap-2 border-t border-gray-200 p-2"
        >
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MESSAGE_MAX} placeholder="Write a message" aria-label="Message" className="field" />
          <button type="submit" disabled={!draft.trim()} className="btn btn-cardinal">
            Send
          </button>
        </form>
      )}
      {error && <p className="px-3 pb-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 8: `AccountPage.tsx`** — two edits:

```tsx
import { campusForEmail } from "../data/campus.ts";
```
```tsx
  const myListings = listings.filter((l) => l.sellerId === me.id && l.status !== "removed");
```

- [ ] **Step 9: `CreateListingPage.tsx`** — imports, photo size, async submit:

```tsx
import { campusForEmail, campuses, placesOnCampus } from "../data/campus.ts";
import { friendlyError, MAX_PHOTO_CHARS } from "../data/rules/index.ts";
```
In `choosePhoto`, change `800` to `600`, `0.55` to `0.5`, and the size check to:
```tsx
      if (data.length > MAX_PHOTO_CHARS) throw new Error("This photo is too large. Choose a smaller one.");
```
Make `submit` async and await the store:
```tsx
  async function submit() {
```
```tsx
      const listing = await createListing({
```
```tsx
    } catch (err) {
      setError(friendlyError(err));
    }
```
and the form's `onSubmit` body becomes `event.preventDefault(); void submit();`.

- [ ] **Step 10: Delete the old data layer**

```bash
git rm src/data/actions.ts src/data/places.ts src/data/fakeUsers.ts src/data/fakeListings.ts
```

- [ ] **Step 11: Typecheck, lint, test**

Run: `npm run build`
Expected: `✓ built`. If strict mode reports anything in untouched files, fix it with precise types (no `any`, no `!`).

Run: `npm run lint`
Expected: exit 0.

Run: `npm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add -A src
git commit -m "refactor: port pages to the new data layer and remove the old one"
```

---

### Task 15: Backend contract, README, retire DEMO_GUIDE

**Files:** Create `docs/backend-handoff.md`; rewrite `README.md`; delete `DEMO_GUIDE.md`.

- [ ] **Step 1: Write `docs/backend-handoff.md`:**

````markdown
# Backend handoff

The frontend runs against a local stand-in for the backend. This is the contract for replacing it.
**Behavior is defined by `src/data/rules/*.ts` and their tests.** If this doc and the rules disagree,
the rules win (and please fix the doc).

## 1. The seam

Pages only touch data through `useStore()` (`src/data/storeContext.ts`). `src/data/StoreProvider.tsx`
implements it locally. To connect a backend:

1. Keep the `Store` type. Rewrite `StoreProvider.tsx` so each method calls the matching server
   function, and the collections hold live data the viewer is allowed to read (section 2). Methods are
   already async and pages already `await` them; set `ready` false until the first data arrives.
2. Port each rule in `src/data/rules/` to a server function. They're plain TypeScript with no browser
   APIs, so they can run server-side mostly as-is. Pass a server `RuleContext`: server time, server
   ids, and handoff codes from `crypto` (see `src/lib/ids.ts`).
3. Set `localMode = false` in `src/config.ts` (no sample data, no testing tools), then delete
   `storage.ts` and `sample.ts`.

## 2. Collections and who may read them

Clients never write collections directly; every change goes through a server function.

| Collection | Readable by |
|---|---|
| `users`: `id`, `name`, `joinedAt`, `stats` | everyone. Signed-out readers get the name masked as "Bob S." — mask on the server (see `displayName` in `selectors.ts`). |
| `users`: `email`, `dorm` | that user only. Consider splitting into a public profile doc and a private account doc. |
| `listings` | everyone (`removed` ones: the seller only) |
| `deals` | the deal's buyer and seller |
| `messages` | the deal's buyer and seller |
| `dealReads` | that user |
| `handoffCodes` | **the buyer only. The seller's device must never receive the code.** Only the server compares it. |
| `saves` | that user |

## 3. Store methods → rules

| Store method | Rule (`src/data/rules/`) |
|---|---|
| `signUp` | `users.ts` `signUp` — plus real `.edu` email verification (local mode shows the code on screen) |
| `signIn`, `signOut` | your auth provider |
| `createListing`, `updateListing`, `removeListing` | `listings.ts` |
| `toggleSave` | `saves.ts` |
| `startDeal`, `sendMessage`, `payDeal`, `cancelDeal`, `markRead` | `deals.ts` |
| `buyNow` | `startDeal` + `payDeal` in one transaction |
| `makeOffer`, `acceptOffer`, `declineOffer` | `offers.ts` |
| `proposeMeetup`, `acceptMeetup` | `meetups.ts` |
| `confirmHandoff`, `newHandoffCode`, `rateDeal` | `handoff.ts` |

Each rule that can refuse has a `whyNot…()` helper; the UI uses the same helpers to hide buttons.

## 4. Server-only, never trusted from the client

- Time, ids and handoff codes (the `RuleContext`).
- Handoff codes: storage, comparison, the 10-wrong-tries cap. Add a rate limit per deal on top.
- User `stats`: only `confirmHandoff` and `rateDeal` change them.
- Event messages (`kind: "event"`): written by rules, never accepted from a client.
- Name masking and never returning `email`/`dorm` on public reads.
- Transactions: `payDeal` (two buyers paying at once — exactly one wins), `confirmHandoff`, `cancelDeal`.
- Photos: today a listing's photo is a JPEG data URL inside the listing (validated by `listings.ts`).
  Move to file uploads with server-side type and size checks, served from your own domain.

## 5. Payments (simulated today)

- Use a hosted payment form; the app must never handle card numbers.
- `payDeal` holds the funds; `confirmHandoff` releases them to the seller; cancelling a paid deal refunds the buyer.
- **Required before real money: a dispute path.** After a meetup is agreed the buyer can't cancel
  (that blocks "take the item, keep the code, get a refund"), so if the seller disappears the buyer's
  money is stuck until a person can review and refund it.
- Seller payouts and identity checks belong to the payment provider.

## 6. Also needed before launch

Real auth and `.edu` verification; notifications (new message, offer, meetup); rate limits on messages
and sign-in codes; reporting and moderation; account deletion and data export; terms and privacy policy.
````

- [ ] **Step 2: Rewrite `README.md`:**

````markdown
# CampusCirculate

A marketplace for college students: buy, sell and give away stuff with verified `.edu` students on
your campus. Each buyer gets one thread per item with the seller: chat, offers, payment, a meetup at
a public spot, and a handoff code the buyer gives the seller when they have the item, which releases
the payment.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests for the rules and selectors
npm run build   # typecheck + production build into dist/
npm run lint
```

## Local mode

There's no backend yet. `src/config.ts` has `localMode = true`, which means:

- data is saved in this browser, and each tab can be signed in as a different student, so you can
  play buyer and seller in two windows side by side;
- sample accounts and listings are loaded; the sign-in code is shown on screen;
- if two tabs save at the same instant, the last one wins.

## How the code is organized

| Path | What it is |
|---|---|
| `src/types.ts` | the data shapes — one collection per kind of record |
| `src/data/rules/` | every rule of the marketplace: who can do what, validation. Plain functions, fully tested. |
| `src/data/selectors.ts` | read-only views (search, unread counts, names) |
| `src/data/StoreProvider.tsx` | the only place data changes; the file a backend replaces |
| `src/data/storage.ts`, `sample.ts` | local mode only |
| `src/pages/`, `src/components/` | the UI |

To change behavior, change the rule and its test. Pages never change data themselves.

## Backend

See [docs/backend-handoff.md](docs/backend-handoff.md).

## Deploy

Vercel: framework Vite, build `npm run build`, output `dist`. `vercel.json` (and `public/_redirects`
on Netlify) sends every route to `index.html` so refreshing a page works.

## Docs

- Design: `docs/specs/2026-11-17-deal-threads-design.md`
- Plans: `docs/plans/`
````

- [ ] **Step 3: Retire the class-demo guide**

```bash
git rm DEMO_GUIDE.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/backend-handoff.md README.md docs/specs docs/plans
git commit -m "docs: backend contract and project README; retire the class-demo guide"
```

---

### Task 16: Verify in a real browser

- [ ] **Step 1: Full checks**

Run: `npm test && npm run build && npm run lint`
Expected: all pass.

- [ ] **Step 2: Browser walk** — start `npx vite --port 5199 --strictPort` and run the Playwright walk (scratchpad, outside the repo) at 1280px and 390px: sign in as the sample buyer, buy a listing, send a message, switch to the seller, enter a wrong 6-digit code (sees "9 tries left"), enter the right one (sees "You've been paid"), check `/deals`, `/sell`, `/account`, dark mode, 404. Expected: no console errors, no horizontal overflow, screenshots match today's UI apart from the 6-digit code and gray event lines.

- [ ] **Step 3: Stop the dev server, then hand back**: the branch, test count, and anything the walk turned up. Do not push.
````
