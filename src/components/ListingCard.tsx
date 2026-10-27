import { Link } from "react-router";
import { useStore } from "../data/storeContext.ts";
import { formatDistance } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";
import type { Listing } from "../types.ts";
import ListingPhoto from "./ListingPhoto.tsx";

// `distance` is optional: My account shows your own listings without one.
export default function ListingCard({ listing, distance }: { listing: Listing; distance?: number }) {
  const { currentUser } = useStore();
  const canBuy = !!currentUser && currentUser.id !== listing.sellerId && listing.status === "active";
  return (
    <div className="card overflow-hidden">
    <Link to={`/listings/${listing.id}`} className="block hover:bg-gray-50">
      <ListingPhoto src={listing.photoUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
      <div className="p-3">
        <p className="font-semibold">{formatPrice(listing.priceCents)}</p>
        <h3 className="text-sm">{listing.title}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {listing.location}
          {distance !== undefined && ` · ${formatDistance(distance)}`}
        </p>
        {listing.status === "reserved" && <p className="mt-1 text-xs font-medium text-amber-700">Reserved</p>}
        {listing.status === "sold" && <p className="mt-1 text-xs font-medium text-green-700">Sold</p>}
      </div>
    </Link>
    {canBuy && (
      <div className="px-3 pb-3">
        <Link to={`/listings/${listing.id}`} className="btn btn-primary block text-center text-sm">
          {listing.priceCents > 0 ? `Buy for ${formatPrice(listing.priceCents)}` : "Reserve for free"}
        </Link>
      </div>
    )}
    </div>
  );
}
