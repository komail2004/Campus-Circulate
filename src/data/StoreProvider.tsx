// Holds the app's data in memory and shares it with every page.
// Pages call these functions (store.buyListing(...), etc.) instead of changing
// data directly. There's no database: the data survives logging out and back
// in, but refreshing the page resets the demo.
// Later, Firebase calls go inside these same functions.

import { useState, type ReactNode } from "react";
import * as actions from "./actions.ts";
import { fakeListings } from "./fakeListings.ts";
import { fakeUsers } from "./fakeUsers.ts";
import { StoreContext, type Store } from "./storeContext.ts";

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<actions.Data>({ users: fakeUsers, listings: fakeListings, deals: [] });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
