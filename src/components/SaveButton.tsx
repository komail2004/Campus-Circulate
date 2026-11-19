import { HeartIcon } from "@phosphor-icons/react";
import { friendlyError } from "../data/rules/index.ts";
import { isSaved } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";
import type { Listing } from "../types.ts";
import { useLayout } from "./layoutContext.ts";

// The heart on listings. Signed-out visitors get the sign-in window; sellers don't save their own items.
export default function SaveButton({ listing, className = "" }: { listing: Listing; className?: string }) {
  const store = useStore();
  const { openSignIn } = useLayout();
  const me = store.currentUser;
  if (me?.id === listing.sellerId) return null;
  const saved = !!me && isSaved(store, me.id, listing.id);

  function toggle() {
    if (!me) return openSignIn();
    store.toggleSave(listing.id).catch((err) => window.alert(friendlyError(err)));
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"} className={`btn-icon ${className}`}>
      <span className="flex size-[30px] items-center justify-center rounded-lg bg-surface/95 text-ink shadow-sm">
        <HeartIcon size={17} weight={saved ? "fill" : "regular"} className={saved ? "text-accent-text" : ""} />
      </span>
    </button>
  );
}
