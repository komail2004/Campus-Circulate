import { Link } from "react-router";
import { priceFor } from "../data/rules/index.ts";
import { dealsForUser, dealStatusLabel, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { formatPrice } from "../lib/format.ts";
import type { DealStatus } from "../types.ts";

const statusColor: Record<DealStatus, string> = {
  open: "text-gray-600",
  held: "text-amber-700",
  completed: "text-green-700",
  closed: "text-gray-500",
};

export default function DealsPage() {
  const store = useStore();
  const me = useMe();
  const myDeals = dealsForUser(store, me.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">My deals</h1>
      {myDeals.length === 0 && <p className="mt-3 text-gray-600">No deals yet. Buy something from Browse to start one.</p>}

      <div className="mt-4 space-y-2">
        {myDeals.map((deal) => {
          const listing = store.listings.find((l) => l.id === deal.listingId);
          const iAmBuyer = deal.buyerId === me.id;
          const other = nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId);
          const amount = deal.paidCents ?? (listing ? priceFor(deal, listing) : 0);
          return (
            <Link key={deal.id} to={`/deals/${deal.id}`} className="card result-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{listing?.title}</p>
                <p className="text-sm text-gray-600">
                  {iAmBuyer ? `Buying from ${other}` : `Selling to ${other}`} · <span className="listing-price">{formatPrice(amount)}</span>
                </p>
              </div>
              <span className={`text-sm font-medium ${statusColor[deal.status]}`}>{dealStatusLabel(store, deal)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
