// Local-mode implementation of the store: each method runs one rule from ./rules against the newest
// data and saves the result in this browser. THIS is the backend seam: replace each method body with
// a server call and the pages don't change.
//
// When the backend replaces it, these must live on the server, never trusted from the client:
// - every rule in ./rules (run them as server functions; clients never write collections directly)
// - handoffCodes: only the buyer may read their code; the seller's device must never receive it
// - user stats and event messages (written only by rules), time, ids and codes (the RuleContext)
// - signed-out reads get names masked (see displayName) and never email or dorm
// - payDeal / confirmHandoff / cancelDeal run as transactions (two buyers paying at once: one wins)

import { useEffect, useRef, useState, type ReactNode } from "react";
import { localMode } from "../config.ts";
import { newCode, newId } from "../lib/ids.ts";
import type { Data } from "../types.ts";
import * as rules from "./rules/index.ts";
import { emptyData, SAMPLE_VERSION, sampleData, sampleUsers } from "./sample.ts";
import { findUserByEmail } from "./selectors.ts";
import { browserStorage, dataKey, loadData, loadSession, saveData, saveSession } from "./storage.ts";
import { StoreContext, type Store } from "./storeContext.ts";

const shared = browserStorage("localStorage");
const tab = browserStorage("sessionStorage");
const KEY = dataKey(SAMPLE_VERSION);
const fresh = () => (localMode ? sampleData() : emptyData());

function liveContext(): rules.RuleContext {
  return { now: new Date().toISOString(), newId, newCode: () => newCode(rules.HANDOFF_CODE_DIGITS) };
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => loadData(shared, KEY, fresh));
  const [userId, setUserId] = useState(() => loadSession(tab));
  const [saveFailed, setSaveFailed] = useState(false);
  // The newest values, readable before React re-renders. Rules always start from these, so two
  // actions in a row (send a message, then mark it read) build on each other instead of the
  // second one undoing the first.
  const latest = useRef({ data, userId });

  // Another tab saved: show its changes here too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== KEY) return;
      const next = loadData(shared, KEY, fresh);
      latest.current.data = next;
      setData(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function commit(next: Data) {
    latest.current.data = next;
    setData(next);
    setSaveFailed(!saveData(shared, KEY, next));
  }

  function setSession(id: string | null) {
    latest.current.userId = id;
    setUserId(id);
    saveSession(tab, id);
  }

  function me(): string {
    const id = latest.current.userId;
    if (!id) throw new rules.RuleError("Please sign in first.");
    return id;
  }

  // Run one rule against the newest data, save what it returns, and hand back its extras.
  function run<T extends { data: Data }>(rule: (data: Data, ctx: rules.RuleContext, actorId: string) => T): T {
    const result = rule(latest.current.data, liveContext(), me());
    commit(result.data);
    return result;
  }

  const store: Store = {
    ...data,
    ready: true, // local data is available immediately
    currentUser: data.users.find((u) => u.id === userId) ?? null,
    saveFailed,

    async signIn(email) {
      const user = findUserByEmail(latest.current.data, email);
      if (!user) throw new rules.RuleError("No student account found for that email.");
      setSession(user.id);
    },
    async signUp(input) {
      const { data: next, user } = rules.signUp(latest.current.data, liveContext(), input);
      commit(next);
      setSession(user.id);
    },
    async signOut() {
      setSession(null);
    },
    async signInAsSample(id) {
      // Testing only: never a way into a real account.
      if (!localMode || !sampleUsers.some((u) => u.id === id)) throw new rules.RuleError("Not a sample account.");
      setSession(id);
    },
    async resetLocalData() {
      if (!localMode) return;
      commit(fresh());
      setSession(null);
    },

    createListing: async (input) => run((d, ctx, actor) => rules.createListing(d, ctx, actor, input)).listing,
    updateListing: async (listingId, input) => {
      run((d, ctx, actor) => rules.updateListing(d, ctx, actor, listingId, input));
    },
    removeListing: async (listingId) => {
      run((d, ctx, actor) => rules.removeListing(d, ctx, actor, listingId));
    },
    toggleSave: async (listingId) => run((d, ctx, actor) => rules.toggleSave(d, ctx, actor, listingId)).saved,

    startDeal: async (listingId) => run((d, ctx, actor) => rules.startDeal(d, ctx, actor, listingId)).deal,
    buyNow: async (listingId) =>
      run((d, ctx, actor) => {
        const started = rules.startDeal(d, ctx, actor, listingId);
        return { ...rules.payDeal(started.data, ctx, actor, started.deal.id), deal: started.deal };
      }).deal,
    sendMessage: async (dealId, text) => {
      run((d, ctx, actor) => rules.sendMessage(d, ctx, actor, dealId, text));
    },
    payDeal: async (dealId) => {
      run((d, ctx, actor) => rules.payDeal(d, ctx, actor, dealId));
    },
    cancelDeal: async (dealId) => {
      run((d, ctx, actor) => rules.cancelDeal(d, ctx, actor, dealId));
    },
    makeOffer: async (dealId, amountCents) => {
      run((d, ctx, actor) => rules.makeOffer(d, ctx, actor, dealId, amountCents));
    },
    acceptOffer: async (dealId) => {
      run((d, ctx, actor) => rules.acceptOffer(d, ctx, actor, dealId));
    },
    declineOffer: async (dealId) => {
      run((d, ctx, actor) => rules.declineOffer(d, ctx, actor, dealId));
    },
    proposeMeetup: async (dealId, input) => {
      run((d, ctx, actor) => rules.proposeMeetup(d, ctx, actor, dealId, input));
    },
    acceptMeetup: async (dealId) => {
      run((d, ctx, actor) => rules.acceptMeetup(d, ctx, actor, dealId));
    },
    confirmHandoff: async (dealId, code) => {
      const result = run((d, ctx, actor) => rules.confirmHandoff(d, ctx, actor, dealId, code));
      return result.matched ? { matched: true } : { matched: false, triesLeft: result.triesLeft };
    },
    newHandoffCode: async (dealId) => {
      run((d, ctx, actor) => rules.newHandoffCode(d, ctx, actor, dealId));
    },
    rateDeal: async (dealId, rating) => {
      run((d, ctx, actor) => rules.rateDeal(d, ctx, actor, dealId, rating));
    },
    markRead: async (dealId) => {
      run((d, ctx, actor) => rules.markRead(d, ctx, actor, dealId));
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
