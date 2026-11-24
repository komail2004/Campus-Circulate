# Firebase free-plan integration (staged)

Project: `campus-circulate-ed5c1`. Frontend remains on Vercel.

## Safety boundary
The existing `main` release is a local-mode classroom demonstration. Do not turn off `localMode` until a Firebase store is implemented, rules are deployed, Auth email verification and cross-device tests pass, and Vercel has the required public web configuration.

## Firebase Console setup
1. **Authentication**: enable Email/Password, verify that email verification is sent and required before posting, and add your Vercel production domain under Authentication → Settings → Authorized domains.
2. **Firestore Database**: default database is present in `nam5`. In the **Rules** tab, replace the default rules with this branch's `firestore.rules` and publish. Use Firebase Emulator Suite to test before publishing whenever possible.
3. **Storage**: not enabled, because the project is staying on Spark (free plan). Never enable an unrestricted public upload endpoint.
4. **Photographs**: for a *small classroom demo only*, a compressed JPEG data URL of **at most 65 KB** may be stored in a listing document. This is not a scalable file store. The React local demo already compresses images; the Firestore adapter must reduce further or reject oversized images. For production use a properly authenticated upload endpoint with a dedicated image host; no unsigned Cloudinary upload preset.
5. **Firestore indexes**: avoid requiring indexes initially; subscribe to public listing collection and apply existing `browseListings` search/filter logic client-side for the modest classroom dataset. Review scale/privacy later.

## Security model
- User account private fields are in `users/{uid}`, owner-read only.
- Public seller name and aggregate stats are separate in `publicProfiles/{uid}`. Don't put email or dorm there.
- Signed-in and **email-verified** .edu users can create/update their own active listings.
- Anonymous visitors can browse listings and public profile names.
- All direct client reads and writes to private deals, messages and handoff codes are **denied**, pending trusted server actions.
- Payments remain unimplemented. Do not claim funds are captured or held.

## Manual test checklist
Use two browser profiles/devices:
- Sign up with a school email; require email verification before listing.
- Ensure non-.edu addresses cannot post. Check the auth token's `email_verified` claim, not just a client regex.
- User A creates a listing; user B can search/filter and see it without refreshing.
- User B cannot modify user A's listing.
- User A can edit or remove their own *active* listing.
- Firestore denies arbitrary writes to `deals`, `messages`, and `handoffCodes`.
- Upload a small JPEG and confirm it persists, or decline image upload until a secure file host is configured.

## Deployment
This branch provides configuration/rules *scaffolding*, not a completed Firebase adapter. Rule files in GitHub **do not automatically deploy** just by merging a PR or redeploying Vercel. Deploy rules separately from the Firebase CLI or paste them into Firestore Rules console. Never merge code that expects these rules before publishing the verified policy.
