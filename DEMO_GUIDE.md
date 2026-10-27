# CampusCirculate classroom demo — Vercel

## Deploy
Import `komail2004/Campus-Circulate` in Vercel, set branch to `class-demo-vercel` for a preview or merge to `main` for production. Framework Vite; build `npm run build`; output `dist`. `vercel.json` handles route refreshes.

## Walkthrough
1. Click **Reset demo data** in the footer to begin clean.
2. Use **Act as: Bob Smith (seller)** in the yellow bar. Click Sell, upload a photo, add title, price, category, pickup hall and post. Refresh to verify image persists.
3. Switch to **William Baldwin (buyer)**. Search or browse by dorm distance. Open the new listing and Buy; enter **dummy details only** in the card form, which charges nothing.
4. Open Deals; send a message and read the 4-digit handoff code.
5. Switch to Bob; open Deals, read William's message, and enter his code to mark the listing sold. Switch back to William to see the completed deal.
6. Try an invalid code and buying your own item to demonstrate error handling. The 6-digit registration code appears in a demo inbox, not real email.

## Limitations
This is a realistic **single-browser simulated demo**. Accounts, listings, messages and deals are stored in localStorage, not a shared database. Class persona switching is **not authentication**. No verified .edu email, real email sending, payment capture, escrow or cross-browser chat exists yet. Do not enter real card details. Firebase / Cloud Functions / Stripe remain future work as shown in the presentation.
