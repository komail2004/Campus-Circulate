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
