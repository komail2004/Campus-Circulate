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
