import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ListingPhoto from "../components/ListingPhoto.tsx";
import { useLayout } from "../components/layoutContext.ts";
import { getCampus, getPlace } from "../data/places.ts";
import { useStore } from "../data/storeContext.ts";
import { formatDistance, milesBetween } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";

export default function ListingPage() {
  const { listingId } = useParams();
  const { listings, users, deals, currentUser, buyListing } = useStore();
  const { openSignIn } = useLayout();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false); // the demo card pop-up

  const listing = listings.find((l) => l.id === listingId);
  if (!listing) {
    return (
      <p>
        Listing not found.{" "}
        <Link to="/" className="text-blue-700 hover:underline">
          Back to listings
        </Link>
      </p>
    );
  }

  const seller = users.find((u) => u.id === listing.sellerId);
  const myDeal = currentUser
    ? deals.find((d) => d.listingId === listing.id && (d.buyerId === currentUser.id || d.sellerId === currentUser.id))
    : undefined;

  const price = formatPrice(listing.priceCents);
  const paid = listing.priceCents > 0;

  function buy() {
    // signed-out visitors have to sign in first
    if (!currentUser) {
      openSignIn();
      return;
    }
    // paid items go through the card pop-up first; free items reserve right away
    if (paid) setPayOpen(true);
    else completePurchase();
  }

  function completePurchase() {
    try {
      const deal = buyListing(listingId ?? "");
      navigate(`/deals/${deal.id}`);
    } catch (err) {
      setPayOpen(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  let action;
  if (myDeal) {
    action = (
      <Link to={`/deals/${myDeal.id}`} className="btn btn-cardinal">
        View deal
      </Link>
    );
  } else if (listing.sellerId === currentUser?.id) {
    action = <p className="text-gray-600">This is your listing.</p>;
  } else if (listing.status === "active") {
    action = (
      <>
        <button type="button" onClick={buy} className="btn btn-primary">
          {paid ? `Buy for ${price}` : "Reserve it (free)"}
        </button>
        <p className="mt-2 text-sm text-gray-600">
          {paid ? "Your payment is held" : "It's held for you"} until you meet {seller?.name} and give them
          your handoff code.
        </p>
      </>
    );
  } else {
    action = <p className="text-gray-600">{listing.status === "sold" ? "Sold." : "Reserved by another student."}</p>;
  }

  return (
    <div>
      <Link to="/" className="text-sm text-blue-700 hover:underline">
        ← Back to listings
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <ListingPhoto src={listing.photoUrl} alt={listing.title} className="aspect-square w-full rounded border border-gray-200 bg-white object-contain" />
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="listing-price mt-1 text-xl font-semibold">{formatPrice(listing.priceCents)}</p>
          <p className="mt-2 text-sm text-gray-600">
            {listing.location}, {getCampus(getPlace(listing.location).campusId)?.name}
            {currentUser?.dorm && ` · ${formatDistance(milesBetween(getPlace(currentUser.dorm), getPlace(listing.location)))} from your dorm`}
          </p>
          <p className="text-sm text-gray-600">
            {listing.category} · Seller: {seller?.name} (verified student)
          </p>
          <p className="mt-4">{listing.description}</p>
          <div className="mt-6">
            {action}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>

      {/* Demo card pop-up: nothing is charged; any card details work. */}
      {payOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPayOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-title"
            onSubmit={(event) => {
              event.preventDefault();
              completePurchase();
            }}
            className="card relative w-full max-w-sm space-y-4 p-6 shadow-lg"
          >
            <button type="button" onClick={() => setPayOpen(false)} aria-label="Close" className="absolute top-3 right-3 px-2 text-xl text-gray-500 hover:text-gray-900">
              ×
            </button>
            <div>
              <h2 id="pay-title" className="text-xl font-bold">
                Pay {price}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {listing.title} from {seller?.name}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="card">
                Card number
              </label>
              <input id="card" required autoComplete="off" inputMode="numeric" placeholder="4242 4242 4242 4242" className="field font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="expiry">
                  Expires
                </label>
                <input id="expiry" required autoComplete="off" placeholder="MM / YY" className="field font-mono" />
              </div>
              <div>
                <label className="label" htmlFor="cvc">
                  CVC
                </label>
                <input id="cvc" required autoComplete="off" inputMode="numeric" placeholder="123" className="field font-mono" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="cardName">
                Name on card
              </label>
              <input id="cardName" required autoComplete="off" className="field" />
            </div>
            <p className="rounded bg-gray-100 p-3 text-sm">
              Demo: no real charge, so don't use a real card. Your {price} is held, not paid to {seller?.name}, until you give them your
              handoff code at the meetup.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Pay {price}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
