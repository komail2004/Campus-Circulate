import { CaretLeftIcon, CaretRightIcon, MapPinIcon, SealCheckIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import ListingPhoto from "../components/ListingPhoto.tsx";
import OfferDialog from "../components/OfferDialog.tsx";
import PayDialog from "../components/PayDialog.tsx";
import SaveButton from "../components/SaveButton.tsx";
import { useLayout } from "../components/layoutContext.ts";
import { localMode } from "../config.ts";
import { placeByName } from "../data/campus.ts";
import { whyNotEdit } from "../data/rules/index.ts";
import { displayName } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";
import { milesBetween, walkLabel } from "../lib/distance.ts";
import { formatPrice, initials } from "../lib/format.ts";
import { useAction } from "../lib/useAction.ts";
import { useTitle } from "../lib/useTitle.ts";

type Dialog = "pay" | "offer" | "remove" | null;

export default function ListingPage() {
  const { listingId = "" } = useParams();
  const store = useStore();
  const me = store.currentUser;
  const { openSignIn } = useLayout();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const { run, error, busy } = useAction();

  const listing = store.listings.find((l) => l.id === listingId && (l.status !== "removed" || l.sellerId === me?.id));
  useTitle(listing?.title ?? "Listing not found");
  if (!listing) {
    return (
      <div className="py-16 text-center">
        <h1 className="heading text-3xl">Listing not found</h1>
        <Link to="/" className="btn btn-outline mt-6">
          Back to listings
        </Link>
      </div>
    );
  }

  const seller = store.users.find((u) => u.id === listing.sellerId);
  const sellerName = displayName(seller, !!me);
  const isOwner = me?.id === listing.sellerId;
  const myDeal = me && store.deals.find((d) => d.listingId === listing.id && d.buyerId === me.id && d.status !== "closed");
  const pickup = placeByName(listing.location);
  const myHall = me?.dorm ? placeByName(me.dorm) : undefined;
  const free = listing.priceCents === 0;
  const price = formatPrice(listing.priceCents);

  const ifSignedIn = (action: () => void) => () => (me ? action() : openSignIn());
  // Messaging starts (or reuses) the buyer's deal thread and lands there.
  const openDeal = () =>
    run(async () => {
      const deal = await store.startDeal(listing.id);
      navigate(`/deals/${deal.id}`);
    });

  let actions: ReactNode;
  if (isOwner) {
    const editBlock = whyNotEdit(listing, listing.sellerId);
    actions = (
      <div className="space-y-2">
        <p className="text-sm text-muted">{editBlock ?? "This is your listing."}</p>
        {!editBlock && (
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/listings/${listing.id}/edit`} className="btn btn-brand">
              Edit listing
            </Link>
            <button type="button" onClick={() => setDialog("remove")} className="btn btn-outline">
              Remove
            </button>
          </div>
        )}
      </div>
    );
  } else if (!localMode) {
    actions = <p className="rounded-lg bg-surface-2 p-4 text-sm text-body">Listings are live. Checkout and private messaging are temporarily unavailable until secure transaction processing is configured. Save this item to return to it later.</p>;
  } else if (myDeal) {
    actions = (
      <Link to={`/deals/${myDeal.id}`} className="btn btn-brand w-full">
        Open your deal
      </Link>
    );
  } else if (listing.status === "sold") {
    actions = <p className="text-muted">This item has sold.</p>;
  } else {
    const reserved = listing.status === "reserved";
    actions = (
      <div className="space-y-2">
        {reserved ? (
          <p className="text-sm text-muted">Another student reserved this item. You can still message the seller in case it comes back.</p>
        ) : (
          <button type="button" onClick={ifSignedIn(() => setDialog("pay"))} className="btn btn-primary w-full">
            {free ? "Reserve for free" : `Buy for ${price}`}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {!free && !reserved && (
            <button type="button" onClick={ifSignedIn(() => setDialog("offer"))} className="btn btn-outline">
              Make offer
            </button>
          )}
          <button type="button" disabled={busy} onClick={ifSignedIn(() => void openDeal())} className={`btn btn-outline ${free || reserved ? "col-span-2" : ""}`}>
            Message seller
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="link mb-4 inline-flex h-11 items-center gap-1 md:-mt-3">
        <CaretLeftIcon size={18} />
        Listings
      </Link>

      <div className="md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-10">
        <div className="relative -mx-4 md:mx-0">
          <ListingPhoto eager src={listing.photoUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover md:rounded-lg" />
          <SaveButton listing={listing} className="absolute top-2 right-2" />
        </div>

        <div className="mt-5 space-y-5 md:mt-0">
          <div>
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] md:text-[26px]">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
              {myHall && pickup && (
                <span className="flex items-center gap-1 font-medium text-brand">
                  <MapPinIcon size={15} weight="bold" />
                  {walkLabel(milesBetween(myHall, pickup), true)}
                </span>
              )}
              <span className="text-muted">{listing.location}</span>
              <span className="text-muted">{listing.category}</span>
              {listing.courseCode && <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-medium text-body">{listing.courseCode}</span>}
            </div>
            <p className={`price mt-4 text-[40px] ${free ? "text-accent-text uppercase" : ""}`}>{price}</p>
          </div>

          {actions}
          {error && <p className="text-sm text-danger">{error}</p>}

          {listing.description && <p className="max-w-[65ch] border-t border-line pt-5 text-[15px] leading-relaxed text-body">{listing.description}</p>}

          <Link to={`/students/${listing.sellerId}`} className="group flex items-center gap-3 border-t border-line pt-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-[15px] font-semibold text-white">{initials(sellerName)}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold group-hover:underline">
                {sellerName}
                <SealCheckIcon size={17} weight="fill" className="text-brand" aria-label="Demo student" />
              </p>
              <p className="text-[13px] text-muted">Class demo student profile</p>
            </div>
            <CaretRightIcon size={18} className="text-muted" />
          </Link>

          {!isOwner && localMode && (
            <div className="flex gap-3 rounded-lg bg-surface-2 p-4">
              <ShieldCheckIcon size={22} className="shrink-0 text-brand" />
              <div>
                <p className="text-sm font-semibold">Simulated payment protection</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-body">In this demo only, payment is marked as held until handoff. No real money moves.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {dialog === "pay" && (
        <PayDialog
          title={listing.title}
          sellerName={sellerName}
          cents={listing.priceCents}
          onClose={() => setDialog(null)}
          onConfirm={async () => navigate(`/deals/${(await store.buyNow(listing.id)).id}`)}
        />
      )}
      {dialog === "offer" && (
        <OfferDialog
          askingCents={listing.priceCents}
          onClose={() => setDialog(null)}
          onSubmit={async (cents) => {
            const deal = await store.startDeal(listing.id);
            await store.makeOffer(deal.id, cents);
            navigate(`/deals/${deal.id}`);
          }}
        />
      )}
      {dialog === "remove" && (
        <ConfirmDialog
          title="Remove this listing?"
          confirmLabel="Remove"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await store.removeListing(listing.id);
            navigate("/account");
          }}
        >
          <p>It disappears from the market, and anyone chatting about it is told it was removed.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
