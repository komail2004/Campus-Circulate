import { MapPinIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
import { walkLabel } from "../lib/distance.ts";
import { formatPrice } from "../lib/format.ts";
import type { Listing } from "../types.ts";
import ListingPhoto from "./ListingPhoto.tsx";
import SaveButton from "./SaveButton.tsx";

const STATUS: Partial<Record<Listing["status"], string>> = { reserved: "Reserved", sold: "Sold", removed: "Removed" };

// One listing in a grid: photo, scoreboard price, walking distance, title, hall.
// The heart sits outside the link so a button never nests inside an anchor.
export default function ListingTile({ listing, miles, fromOwnDorm = false }: { listing: Listing; miles?: number; fromOwnDorm?: boolean }) {
  const status = STATUS[listing.status];
  return (
    <div className="relative">
      <Link to={`/listings/${listing.id}`} className="group flex flex-col gap-2.5">
        <ListingPhoto src={listing.photoUrl} alt={listing.title} className="aspect-[4/3] w-full rounded-lg object-cover" />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`price text-[23px] ${listing.priceCents === 0 ? "text-accent-text uppercase" : ""}`}>{formatPrice(listing.priceCents)}</span>
            {status ? (
              <span className="text-[12.5px] font-semibold text-muted">{status}</span>
            ) : (
              miles !== undefined && (
                <span className="flex items-center gap-1 text-[12.5px] font-medium whitespace-nowrap text-brand">
                  <MapPinIcon size={13} weight="bold" />
                  {walkLabel(miles, fromOwnDorm)}
                </span>
              )
            )}
          </div>
          <span className="line-clamp-2 text-[14.5px] leading-[1.3] font-medium group-hover:underline">{listing.title}</span>
          <span className="text-[12.5px] text-muted">{listing.location}</span>
        </div>
      </Link>
      <SaveButton listing={listing} className="absolute top-0.5 right-0.5" />
    </div>
  );
}
