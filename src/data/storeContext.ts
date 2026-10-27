// Lets any component reach the app's data with useStore(), without passing it
// down through every component by hand. The data itself lives in StoreProvider.

import { createContext, useContext } from "react";
import type { Deal, Listing, User } from "../types.ts";
import type { Data } from "./actions.ts";

export type Store = Data & {
  currentUser: User | null;
  logIn: (email: string) => void;
  logOut: () => void;
  createListing: (input: Pick<Listing, "title" | "priceCents" | "location" | "category" | "description" | "photoUrl">) => Listing;
  buyListing: (listingId: string) => Deal;
  sendMessage: (dealId: string, text: string) => void;
  confirmHandoff: (dealId: string, code: string) => void;
};

export const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore() has to be used inside <StoreProvider>");
  return store;
}

// For pages behind the login wall, where there's always a logged-in user.
export function useMe() {
  const { currentUser } = useStore();
  if (!currentUser) throw new Error("useMe() needs a logged-in user");
  return currentUser;
}
