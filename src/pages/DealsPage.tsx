import { Link } from "react-router";
import { useMe, useStore } from "../data/storeContext.ts";
import { dealStatus, formatPrice } from "../lib/format.ts";

export default function DealsPage() {
  const { deals, listings, users } = useStore();
  const me = useMe();
  const myDeals = deals.filter((d) => d.buyerId === me.id || d.sellerId === me.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">My deals</h1>
      {myDeals.length === 0 && <p className="mt-3 text-gray-600">No deals yet. Buy something from Browse to start one.</p>}

      <div className="mt-4 space-y-2">
        {myDeals.map((deal) => {
          const listing = listings.find((l) => l.id === deal.listingId);
          const iAmBuyer = deal.buyerId === me.id;
          const other = users.find((u) => u.id === (iAmBuyer ? deal.sellerId : deal.buyerId));
          return (
            <Link key={deal.id} to={`/deals/${deal.id}`} className="card result-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{listing?.title}</p>
                <p className="text-sm text-gray-600">
                  {iAmBuyer ? `Buying from ${other?.name}` : `Selling to ${other?.name}`} · {formatPrice(deal.amountCents)}
                </p>
              </div>
              <span className={`text-sm font-medium ${deal.status === "held" ? "text-amber-700" : "text-green-700"}`}>
                {dealStatus(deal)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
