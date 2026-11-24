# CampusCirculate: Firebase Spark / Vercel staged integration

Firebase project: `campus-circulate-ed5c1` (Cloud Firestore default database, `nam5`).
The branch `firebase-free-plan-foundation` uses the Firebase JavaScript SDK. The default
`main` remains the existing fully local classroom demo until we verify the real backend.

## What this branch implements

- Firebase Email/Password account creation and real email verification
- Private Firestore student records (`users/{uid}`), public names/stats (`publicProfiles/{uid}`)
- Live Firestore listeners for listings, public profiles, and the signed-in student's bookmarks
- Seller-only creation, editing and removal of active listings; existing client search, filters,
  campus proximity and pricing continue to operate on shared listings
- Authenticated bookmarks, reloaded across devices
- Small, compressed JPEG thumbnails embedded in individual Firestore listing documents (64,000
  characters maximum). This is a short-term, capped workaround without a Storage billing plan.
  Large/full-resolution photos require a separate authenticated image hosting service.
- Original local mode is kept when Firebase public web settings are not configured

**Not yet implemented in Firebase mode:** real checkout, escrow/payments, offer negotiations,
private messaging and handoff-code transactions. These deliberately fail closed, rather
than expose sensitive transactions through unrestricted Firestore client writes. The old
local classroom simulation still works in local mode.

## Required one-time Firebase Console work

1. In **Authentication → Sign-in method**, ensure Email/Password is enabled.
2. Under **Authentication → Settings → Authorized domains**, add the domain serving your
   Vercel site. Check any preview domain you intend to use.
3. In **Firestore Database → Rules**, copy the complete `firestore.rules` from this branch.
   Review it with the team and click **Publish**. Rules committed to GitHub are **not** deployed
   to Firebase by Vercel. Never use a blanket `allow read, write: if true` policy.
4. Confirm that the default Firestore database exists. Do **not** manually insert demo
   users with arbitrary IDs; authentication uses real Firebase UIDs.
5. Cloud Storage is **not required** for this trial, and staying on the Spark plan avoids
   the Blaze billing requirement shown in the Firebase console.

## Vercel public build variables

Set these in Vercel → CampusCirculate → Settings → Environment Variables for the desired
Preview environment first, using the **exact public SDK web config** from Firebase Project
Settings → General → Your apps → SDK setup and configuration → Config:

```
VITE_FIREBASE_API_KEY=<your real public web API key>
VITE_FIREBASE_APP_ID=<your real public web app ID>
VITE_FIREBASE_AUTH_DOMAIN=campus-circulate-ed5c1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campus-circulate-ed5c1
```

These web settings are not service-account secrets. **Never** upload a service account JSON
file or admin private key to this repository. Vite embeds `VITE_*` environment variables
at **build time**, so redeploy after changing them. For testing use a branch Preview and do not
promote to Production until the security rules and functional tests pass.

## End-to-end acceptance tests (two browsers/devices)

1. Confirm the default site can browse but cannot create a listing when signed out.
2. Register a new `.edu` email and password (at least 8 characters), receive a **real**
   verification email, follow the link and sign in. Unverified users cannot post.
3. Repeat with a non-`.edu` email: account creation should be rejected by the app and
   Firestore policy. Note that email ownership alone does not establish current enrollment.
4. Register a CofC student, select an allowed hall, post a listing with or without a
   small JPEG thumbnail. Verify it appears on a **second device**.
5. Search for the new title and textbook course code, filter by category, price, free
   and campus, and sort by distance/newest/price.
6. Edit and remove your own active listing. Confirm another account cannot modify it.
7. Bookmark an item, sign in on another device and confirm the bookmark persists.
8. Confirm Firestore prevents direct client reads of other people's private user records
   and any writes to `deals`, `messages` and `handoffCodes`.
9. Confirm no page claims that a card was charged or a payment is held in Firebase mode.
10. Verify all GitHub CI tests and the production build before merging the draft PR.

## The next backend phase

To bring real buyer/seller deals and handoff codes across devices without exposing
private codes or allowing double reservations, build a trusted transactional API on
Vercel (with securely provisioned credentials), or use Firebase Functions if the billing
plan permits. Keep paid checkout disabled until a proper payment provider is integrated;
Firestore alone is not an escrow system. For full-resolution photo uploads, configure a
dedicated, authenticated image-hosting service with server-verified Firebase identity.

Do not merge this feature branch solely because its TypeScript build passes: Firebase
rules must be tested against the actual service and a real verified account first.
