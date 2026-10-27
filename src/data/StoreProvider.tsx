// Holds the app's data and shares it with every page.
// Pages call these functions (store.buyListing(...), etc.) instead of changing
// data directly. There's no database: the data is saved in this browser
// (localStorage) so a refresh doesn't wipe the demo. "Reset demo data" starts over.
// Later, Firebase calls go inside these same functions.

import { useEffect, useState, type ReactNode } from "react";
import * as actions from "./actions.ts";
import { fakeListings } from "./fakeListings.ts";
import { fakeUsers } from "./fakeUsers.ts";
import { StoreContext, type Store } from "./storeContext.ts";

type Saved = { data: actions.Data; currentUserId: string | null };

// The save slot's name changes whenever fakeUsers or fakeListings is edited,
// so edits to the starting data show up instead of an old saved copy.
const SEED_VERSION = [...JSON.stringify([fakeUsers, fakeListings])].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) | 0, 0);
const SAVE_KEY = `campus-circulate-demo-${SEED_VERSION}`;

function freshStart(): Saved {
  return { data: { users: fakeUsers, listings: fakeListings, deals: [] }, currentUserId: null };
}

function loadSaved(): Saved {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (text) return JSON.parse(text) as Saved;
  } catch {
    // storage blocked or unreadable: start fresh
  }
  return freshStart();
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => ({ key: SAVE_KEY, ...loadSaved() }));

  // If the starting data was edited while the app is open, switch to the new save slot.
  if (state.key !== SAVE_KEY) setState({ key: SAVE_KEY, ...loadSaved() });

  const { data, currentUserId } = state;
  const setData = (next: actions.Data) => setState((s) => ({ ...s, data: next }));
  const setCurrentUserId = (id: string | null) => setState((s) => ({ ...s, currentUserId: id }));

  // save after every change
  useEffect(() => {
    try {
      localStorage.setItem(state.key, JSON.stringify({ data: state.data, currentUserId: state.currentUserId }));
    } catch {
      // storage full or blocked: the demo still works, it just won't survive a refresh
    }
  }, [state]);

  function myId() {
    if (!currentUserId) throw new Error("Please log in first.");
    return currentUserId;
  }

  const store: Store = {
    ...data,
    currentUser: data.users.find((u) => u.id === currentUserId) ?? null,

    logIn(email) {
      const user = data.users.find((u) => u.email === email.trim().toLowerCase());
      if (!user) throw new Error("No student account found for that email.");
      setCurrentUserId(user.id);
    },
    // Creates the account and signs straight in.
    signUp(name, email, dorm) {
      const result = actions.addUser(data, name, email, dorm);
      setData(result.data);
      setCurrentUserId(result.user.id);
    },
    logOut() {
      setCurrentUserId(null);
    },

    createListing(input) {
      const result = actions.createListing(data, myId(), input);
      setData(result.data);
      return result.listing;
    },
    buyListing(listingId) {
      const result = actions.buyListing(data, listingId, myId());
      setData(result.data);
      return result.deal;
    },
    sendMessage(dealId, text) {
      setData(actions.sendMessage(data, dealId, myId(), text));
    },
    confirmHandoff(dealId, code) {
      setData(actions.confirmHandoff(data, dealId, myId(), code));
    },

    demoSwitchUser(id) {
      // Class rehearsal only: never use as production authentication.
      if (!fakeUsers.some(user => user.id === id)) throw new Error("Not a sample account.");
      setCurrentUserId(id);
    },
    // Back to the starting accounts and listings, signed out.
    resetDemo() {
      setState({ key: SAVE_KEY, ...freshStart() });
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
