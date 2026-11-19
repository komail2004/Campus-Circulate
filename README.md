# CampusCirculate

A marketplace for `.edu` students: buy, sell and give away stuff on your campus.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
npm run lint
```

Until the backend lands, `src/config.ts` has `localMode = true`: data lives in this browser, sample
accounts are loaded, and each tab can be signed in as a different student.

`src/data/rules/` holds every marketplace rule (tested). `src/data/StoreProvider.tsx` is the only
place data changes and the file the backend replaces.

Deploy: Vite build to `dist`; `vercel.json` and `public/_redirects` send every route to `index.html`.
