// The app's data and actions, available to any component through useStore(). Pages read the
// collections and call these methods; they never change data themselves. StoreProvider.tsx
// implements it, and it's the only file a backend replaces.

import { createContext, useContext } from "react";
import type { Data, Deal, Listing, ListingInput, Rating, User } from "../types.ts";
import type { MeetupInput, SignUpInput } from "./rules/index.ts";

export type HandoffAttempt = { matched: true } | { matched: false; triesLeft: number };

// Every action is async: instant in local mode, a network call with a backend.
export type Store = Data & {
  ready: boolean; // false while data is loading
  currentUser: User | null;
  saveFailed: boolean; // the browser refused to save (usually storage full)

  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (input: SignUpInput, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsSample: (userId: string) => Promise<void>; // local mode only
  resetLocalData: () => Promise<void>; // local mode only

  uploadPhoto: (file: File) => Promise<string>; // returns the URL to save as the listing's photoUrl
  createListing: (input: ListingInput) => Promise<Listing>;
  updateListing: (listingId: string, input: ListingInput) => Promise<void>;
  removeListing: (listingId: string) => Promise<void>;
  toggleSave: (listingId: string) => Promise<boolean>;

  startDeal: (listingId: string) => Promise<Deal>;
  buyNow: (listingId: string) => Promise<Deal>; // start (or reuse) the deal and pay, all or nothing
  sendMessage: (dealId: string, text: string) => Promise<void>;
  payDeal: (dealId: string) => Promise<void>;
  cancelDeal: (dealId: string) => Promise<void>;
  makeOffer: (dealId: string, amountCents: number) => Promise<void>;
  acceptOffer: (dealId: string) => Promise<void>;
  declineOffer: (dealId: string) => Promise<void>;
  proposeMeetup: (dealId: string, input: MeetupInput) => Promise<void>;
  acceptMeetup: (dealId: string) => Promise<void>;
  confirmHandoff: (dealId: string, code: string) => Promise<HandoffAttempt>;
  newHandoffCode: (dealId: string) => Promise<void>;
  rateDeal: (dealId: string, rating: Rating) => Promise<void>;
  markRead: (dealId: string) => Promise<void>;
};

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore() has to be used inside <StoreProvider>");
  return store;
}

// For pages behind the sign-in wall, where there's always a signed-in student.
export function useMe(): User {
  const { currentUser } = useStore();
  if (!currentUser) throw new Error("useMe() needs a signed-in student");
  return currentUser;
}
