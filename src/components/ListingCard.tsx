import { Link } from "react-router";
import { formatDistance } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";
import type { Listing } from "../types.ts";
import ListingPhoto from "./ListingPhoto.tsx";

// `distance` is optional: My account shows your own listings without one.
export default function ListingCard({ listing, distance }: { listing: Listing; distance?: number }) {
  return (
    <Link to={`/listings/${listing.id}`} className="card block overflow-hidden hover:border-gray-400">
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
  );
}
