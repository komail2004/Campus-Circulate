// Local mode: there's no backend yet. Data is saved in this browser, sample accounts and listings
// are loaded, and testing tools are shown. The backend turns this off.
// The production backend is enabled only when both public web-app identifiers are configured.
// Without them the existing local classroom demo still runs unchanged.
export const localMode = !import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_APP_ID;
