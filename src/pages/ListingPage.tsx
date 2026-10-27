import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ListingPhoto from "../components/ListingPhoto.tsx";
import { useLayout } from "../components/layoutContext.ts";
import { getPlace } from "../data/places.ts";
import { useStore } from "../data/storeContext.ts";
import { formatDistance, milesBetween } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";

export default function ListingPage() {
  const { listingId } = useParams();
  const { listings, users, deals, currentUser, buyListing } = useStore();
  const { openSignIn } = useLayout();
  const navigate = useNavigate();
  const [error, setError] = useState("");

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

  function buy() {
    // signed-out visitors have to sign in first
    if (!currentUser) {
      openSignIn();
      return;
    }
    try {
      const deal = buyListing(listingId ?? "");
      navigate(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  let action;
  if (myDeal) {
    action = (
      <Link to={`/deals/${myDeal.id}`} className="btn btn-primary">
        View deal
      </Link>
    );
  } else if (listing.sellerId === currentUser?.id) {
    action = <p className="text-gray-600">This is your listing.</p>;
  } else if (listing.status === "active") {
    action = (
      <>
        <button type="button" onClick={buy} className="btn btn-primary">
          {listing.priceCents === 0 ? "Reserve it (free)" : `Buy for ${formatPrice(listing.priceCents)}`}
        </button>
        <p className="mt-2 text-sm text-gray-600">
          {listing.priceCents === 0 ? "It's held for you" : "Your payment is held"} until you meet {seller?.name} and give them
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
          <p className="mt-1 text-xl font-semibold">{formatPrice(listing.priceCents)}</p>
          <p className="mt-2 text-sm text-gray-600">
            {listing.location}
            {currentUser && ` · ${formatDistance(milesBetween(getPlace(currentUser.dorm), getPlace(listing.location)))} from your dorm`}
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
    </div>
  );
}
