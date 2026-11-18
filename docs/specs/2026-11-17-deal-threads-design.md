# Deal threads, trust & discovery — design

Status: approved 2026-11-17 · Owner: William Baldwin · Backend: roommate (after this ships)

The class demo is over; this builds the real product. It stays **frontend-only** (localStorage, "local
mode") until the backend lands. The data layer is shaped so a backend can replace one file
(`StoreProvider.tsx`) without page changes. Every rule below must be enforced by the backend too; local
mode enforces it in the browser.

## 1. Goals

1. One **deal thread** per buyer + listing that holds chat, offers, payment, meetup, handoff and rating.
2. Fix the 17 frontend problems found in the 2026-11-17 analysis (section 9).
3. New features: offers, meetup planner, seller profiles + ratings, saved items, filters/sort, course codes.
4. A clean backend seam plus a written contract (`docs/backend-handoff.md`).
5. Class-demo scaffolding removed from the product; testing tools live behind `localMode` (section 2a).
6. `main` works after every phase merges.

**Queued, not in scope:** Move-out mode (free pile + bundles). Real auth, payments, image storage,
disputes — backend work, listed in the contract.

## 2. Architecture

```
src/types.ts                 domain types (one file)
src/data/rules/              pure rules — no React, no storage, no Date.now, no Math.random
  errors.ts                  RuleError + check()
  context.ts                 RuleContext type
  users.ts listings.ts deals.ts offers.ts meetups.ts handoff.ts saves.ts
src/data/selectors.ts        read-only derived data (search, unread, names, permissions for UI)
src/data/storage.ts          localStorage (shared data) + sessionStorage (who's signed in, per tab)
src/data/StoreProvider.tsx   the seam: each method = run one rule, save, publish
src/data/seed/               places, categories, meetup spots + sample users/listings (local mode)
src/lib/                     ids.ts (crypto) · format.ts · time.ts · courseCode.ts · distance.ts
src/components/ui/Modal.tsx  the only pop-up implementation
```

**Rule shape.** Every mutation is `rule(data, ctx, actorId, input) => { data, ...extras }` and throws
`RuleError` with a user-facing message when not allowed. `ctx = { now, newId, newCode }` is injected
so rules are deterministic in tests and use server time/randomness on a backend.

**Permission helpers are shared.** Each rule that can be refused exports a `whyNot…()` helper
returning `string | null`. The rule throws when it's non-null; the UI uses the same helper to hide or
disable buttons. One source of truth — the UI can't drift from the rules.

**Store.** `StoreProvider` keeps the latest `Data` in a ref so back-to-back actions (send, then
mark read) build on each other instead of overwriting. After each rule it saves; if saving fails it
sets `saveFailed` and the layout shows a banner.

**Tabs.** Shared data lives in localStorage; the signed-in user lives in sessionStorage (per tab).
A `storage` event listener reloads data saved by another tab. Two windows = buyer and seller side by
side. Last write wins if two tabs save in the same instant (acceptable in local mode; noted in README).

## 2a. Local mode (replaces the class-demo scaffolding)

`src/config.ts` exports `localMode = true` — the one switch the backend turns off.

- **Removed from the product:** the "Class demo" bar, the "Try the full class demo" box in sign-in,
  the "Demo payment — no charge" badge, the always-visible "Reset demo data" link, and the fake card
  form. The app must never collect card numbers in its own inputs; the backend will use a hosted
  payment form (e.g. Stripe), so the pay step is a "Confirm payment" dialog that calls `payDeal` —
  the single place a payment call plugs in.
- **Dev tools panel** (rendered only when `localMode`): sign in as a sample account, reset local
  data. In local mode the sign-in dialog also shows the verification code on screen (there's no email
  service yet) and the pay dialog says payments are simulated.
- **Seed data** (sample users and listings) loads only in local mode.
- `DEMO_GUIDE.md` is replaced by a real `README.md` (setup, scripts, architecture, local mode,
  deploy notes carried over from the guide).

## 3. Data model

One collection per record kind — the same collections a backend would have.

```ts
User         { id, name, email*, dorm*, joinedAt,
               stats: { completedHandoffs, thumbsUp, thumbsDown } }      // * private; stats rule-written only
Listing      { id, sellerId, title, priceCents, location, category, description,
               photoUrl?, courseCode?, status: "active"|"reserved"|"sold"|"removed", createdAt }
Deal         { id, listingId, buyerId, sellerId,
               status: "open"|"held"|"completed"|"closed",
               offer: { amountCents, byUserId, status: "pending"|"accepted" } | null,
               paidCents: number | null,
               meetup: { spot, time, proposedBy, agreed } | null,
               meetupEverAgreed: boolean,
               ratings: { byBuyer?: "up"|"down", bySeller?: "up"|"down" },
               closeReason: "cancelled_by_buyer"|"cancelled_by_seller"|"sold_elsewhere"|"listing_removed" | null,
               createdAt, updatedAt }
Message      { id, dealId, senderId: string | null, text, sentAt, kind: "text"|"event" }   // null = system
DealRead     { dealId, userId, lastReadAt }
HandoffCode  { dealId, buyerId, code, wrongTries }        // buyer-only; never sent to the seller
Save         { userId, listingId, savedAt }
Data         { users, listings, deals, messages, dealReads, handoffCodes, saves }
```

All times are ISO-8601 UTC strings. Money is integer cents. The deal price is derived, not stored:
`offer?.status === "accepted" ? offer.amountCents : listing.priceCents`.

## 4. Deal lifecycle

```
open ──pay──▶ held ──confirm code──▶ completed ──▶ (both may rate once)
  │             │
  └──cancel─────┴──cancel / auto-close──▶ closed (closeReason)
```

| Rule | Who | Allowed when | Effect |
|---|---|---|---|
| `startDeal` | buyer (not seller) | listing active or reserved | returns existing open/held deal for this buyer+listing, else creates one |
| `sendMessage` | either party | deal open or held; 1–1000 chars | adds message |
| `makeOffer` | either party | deal open, listing active, price > 0, 1 ≤ amount < asking | replaces current offer; event line |
| `acceptOffer` / `declineOffer` | party who did NOT make it | offer pending, listing active (accept) | accepted / cleared; event line |
| `payDeal` | buyer | deal open, listing active | held; `paidCents` = deal price; listing reserved; new 6-digit code; event lines here and "Reserved by another student" in the listing's other open deals |
| `cancelDeal` | open: either · held: seller any time, buyer only if `!meetupEverAgreed` | open or held | closed with reason; held → listing active, code deleted, "payment refunded" event, "Back on sale" in other open deals |
| `proposeMeetup` | either party | deal held; spot from list; now < time ≤ now + 14 days | meetup proposed; event |
| `acceptMeetup` | party who did NOT propose | meetup proposed and time still in the future | agreed; `meetupEverAgreed = true`; event |
| `confirmHandoff` | seller | deal held; code not used up | match → completed, listing sold, code deleted, both users `completedHandoffs+1`, other open deals closed `sold_elsewhere`. Miss → `wrongTries+1`, returns `{ matched: false, triesLeft }` (does **not** throw, so the count persists) |
| `newHandoffCode` | buyer | deal held | fresh code, `wrongTries = 0`; event |
| `rateDeal` | either party | deal completed; not yet rated by that side | stores rating; other user's `thumbsUp`/`thumbsDown` +1 |
| `markRead` | either party | any status | upserts `DealRead` |

**Why the buyer can't cancel after a meetup was ever agreed:** otherwise a buyer could take the item,
withhold the code, cancel and be refunded. `meetupEverAgreed` (not `meetup.agreed`) closes the
loophole of re-proposing a meetup to un-agree it. A seller who ghosts after agreeing leaves the buyer
stuck — the contract requires a dispute path before real money.

**Handoff code:** 6 digits from `crypto.getRandomValues`, max 10 wrong tries, then the buyer must make
a new code. (4 digits × 5 tries / 15 min ≈ 1-in-3 chance of a lucky guess within a week.)

Free items (price 0): no offers; "Reserve for free" asks for confirmation in a dialog; events say
"Reserved" instead of "Paid".

## 5. Listing rules

| Rule | Who | When | Notes |
|---|---|---|---|
| `createListing` | student on a supported campus | — | title 3–80, description ≤ 1000, price $0–$10,000 in whole cents, pickup hall on own campus, valid category, `photoUrl` must be `data:image/jpeg;base64,…` or a `/listings/…` path, `courseCode` only for Textbooks |
| `updateListing` | seller | active | same validation; a price change clears offers on open deals with an event line |
| `removeListing` | seller | active (cancel a held deal first) | status `removed`; open deals closed `listing_removed` |
| `toggleSave` | signed-in user | listing not removed | add/remove `Save` |

Course codes: input like `math120`, `MATH 120`, `Math-120B` → stored `MATH 120` / `MATH 120B`
(`^[A-Z]{2,4} ?-?\d{3}[A-Z]?$` after uppercasing). Search matches with spaces/dashes ignored.

## 6. Privacy & security

- Signed-out visitors may browse listings and profiles. They see names as **first name + last initial**
  ("Bob S."), never emails or dorms. Signed-in students see full names. (Backend must mask server-side.)
- Public profile (`/students/:id`): display name, campus, joined date, completed handoffs,
  thumbs-up % (only once rated), active listings. No email, no dorm.
- Rules validate every input (lengths, cents integers, allow-listed photo URLs, allow-listed meetup
  spots, time windows). The UI's checks are convenience only.
- Text is rendered as React text only — no `dangerouslySetInnerHTML` anywhere.
- IDs from `crypto.randomUUID()`; codes from `crypto.getRandomValues`.
- No raw card fields anywhere. The sample-account switcher exists only in local mode and refuses
  non-sample accounts.
- Save key is versioned (`campus-circulate:v2:<seed-hash>`); old `campus-circulate-demo-*` keys are
  deleted on load to free space. Unknown/old shapes start fresh instead of crashing.
- Server-only on a backend (listed in the contract): handoff code storage + `confirmHandoff`,
  stats counters, event lines, name masking, `ctx.now`.

## 7. Screens

- **Layout:** header (logo, search, desktop nav, theme toggle); category row with edge fade;
  storage-full banner; phone bottom tab bar (Browse · Sell · Deals with unread count · Account);
  dev tools panel in local mode only. No sign-in gate on browsing.
- **Browse:** compact hero on phones (no photo); filters Campus · Nearest to · Sort (Nearest, Newest,
  Price low–high) · Free only · Max price — all in the URL; cards with heart + Buy/Reserve that opens
  the pay dialog.
- **Listing:** photo, price, course-code chip, location ("In your hall" when same building), seller card →
  profile, Buy / Make offer (hidden for free) / Message seller / Save; owner sees Edit / Remove;
  existing thread → "Open conversation".
- **Deal:** item photo + link to listing + status chip; stage card (offer → pay → meetup → handoff →
  rating, or closed reason); cancel button only when allowed; chat with timestamps and gray event lines;
  marks read on view.
- **Deals list:** thumbnail, other person, status, last message preview, unread dot, newest first.
- **Account:** profile + stats, My listings (Edit), Saved items. (Theme moves to the header.)
- **Profile** `/students/:id` and **Edit listing** `/listings/:id/edit` (shares the form with Sell).

Status wording: open "Chatting" · held "Payment held" / "Reserved" (free) · completed "Completed" ·
closed "Cancelled by Bob" / "Sold to another student" / "Listing removed". Dates show as ISO
`YYYY-MM-DD`; times as `h:mm AM/PM`.

## 8. Testing & verification

- **Vitest 5.1** (dev dependency; peer-compatible with Vite 8). Node environment — rules and selectors
  are pure, so no DOM needed. `npm test` runs once.
- Every rule: happy path, each refusal (wrong actor, wrong status, bad input), and the side effects
  (listing status, other deals, counters, event lines). Selectors: search/sort/filter, unread, masking.
- Each phase ends with `npm test`, `npm run build` (typecheck), `npm run lint`, and a Playwright walk
  at 1280px and 390px (outside the repo) checking console errors and horizontal overflow.

## 9. The 17 fixes

1. Reserved items stuck forever → `cancelDeal`.
2. Sign-in title invisible in dark mode (`text-black`) → `text-heading`.
3. Seller told "released to the seller" → role-aware copy.
4. "same hall from your dorm" → "In your hall".
5. Full storage silently stops all saving → `saveFailed` banner; photos 600px / q0.5 / ≤ 200k chars.
6. Signed-out visitors can't look → open browsing; gate only buy/offer/message/save/sell (with masking).
7. Pop-ups: no Escape on pay, focus escapes, page scrolls → shared `<dialog>` Modal with backdrop-click
   close and scroll lock implemented explicitly.
8. Header uses ~30% of a phone; hero hides listings → compact phone header, bottom tab bar, no hero photo on phones.
9. Tap targets 16–20px → ≥ 44px on phones.
10. Category row clipped without hint → edge fade.
11. Dark mode flashes, ignores system, toggle buried, unguarded storage → pre-paint script in
    `index.html`, system default, header toggle, try/catch.
12. ~1.9 MB of PNG listing photos, no lazy loading → WebP + `loading="lazy"`.
13. Card Buy button just links to the listing → opens the pay dialog (keeps PR #3's buttons).
14. Deal page lacks photo/link, timestamps, unread → added.
15. Card titles in the display font wrap 2–3 lines → body font for card titles.
16. Demo bar boxed to content width → removed entirely (section 2a).
17. Code inputs accept letters; one error at a time; no length limits; same tab title everywhere;
    no edit/delete → digits only, per-field errors, `maxLength`, per-page titles, edit/remove.

## 10. Delivery

Stacked branches, one PR per phase into `main` (William pushes; the team reviews and merges):

| Phase | Branch | Contents |
|---|---|---|
| 0 | `phase-0-foundation` | Vitest; new types; all rules + selectors + tests; storage; StoreProvider (ref, per-tab session, storage events); seed; `config.ts`; existing pages ported to the new model (same UI); `docs/backend-handoff.md`; README replaces DEMO_GUIDE |
| 1 | `phase-1-fixes` | local mode (section 2a: demo scaffolding out, dev tools panel, no card form); fixes 2–7, 11, 12, 15, 16, 17 (digits, titles) |
| 2 | `phase-2-deal-threads` | message seller, offers, pay at agreed price, cancel, event lines, deals list, unread, fixes 1, 13, 14 |
| 3 | `phase-3-meetups` | meetup planner |
| 4 | `phase-4-trust` | ratings, seller card, profile page |
| 5 | `phase-5-discovery` | saved items, filters/sort, course codes |
| 6 | `phase-6-phone` | fixes 8, 9, 10 |
| 7 | `phase-7-listing-management` | edit/remove, per-field form errors (fix 17 rest) |

Tell the team before Phase 0 merges: it rewrites `src/data/*`, `src/types.ts`, and touches every page.
Later phases mostly touch pages/components; Phase 1 and 6 touch `Layout.tsx` and `index.css`.
`README.md` and `docs/backend-handoff.md` are updated in every phase that changes behavior.

## 11. Backlog

- Move-out mode (free pile + seller bundles).
- Backend: real auth + .edu verification, payments/escrow, dispute path, image storage, rate limits
  (handoff checks, messages), notifications.
