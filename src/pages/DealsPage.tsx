import { Link } from "react-router";
import ListingPhoto from "../components/ListingPhoto.tsx";
import { dealsForUser, dealStatusLabel, messagesForDeal, nameOf, unreadCount } from "../data/selectors.ts";
import { localMode } from "../config.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { firstName } from "../lib/format.ts";
import { messageWhen } from "../lib/time.ts";
import { useTitle } from "../lib/useTitle.ts";

export default function DealsPage() {
  const store = useStore();
  const me = useMe();
  useTitle("Deals");
  const myDeals = dealsForUser(store, me.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="heading text-3xl">Deals</h1>
      {myDeals.length === 0 ? (
        <div className="panel mt-6 px-6 py-12 text-center">
          <p className="font-medium">No deals yet</p>
          <p className="mt-1 text-sm text-muted">{localMode ? "Message a seller or buy something to start one." : "Checkout and private messaging will be enabled after secure transaction processing is configured."}</p>
          <Link to="/" className="btn btn-outline mt-5">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="panel mt-5 divide-y divide-line overflow-hidden">
          {myDeals.map((deal) => {
            const listing = store.listings.find((l) => l.id === deal.listingId);
            const iAmBuyer = deal.buyerId === me.id;
            const other = firstName(nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId));
            const last = messagesForDeal(store, deal.id).at(-1);
            const unread = unreadCount(store, deal.id, me.id);
            return (
              <li key={deal.id}>
                <Link to={`/deals/${deal.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                  <ListingPhoto src={listing?.photoUrl} alt={listing?.title ?? "Listing"} className="size-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{listing?.title}</p>
                      <span className="shrink-0 text-xs text-muted">{messageWhen(deal.updatedAt)}</span>
                    </div>
                    <p className={`truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>
                      {iAmBuyer ? "From" : "To"} {other}: {last?.text ?? "No messages yet"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-brand">{dealStatusLabel(store, deal)}</p>
                  </div>
                  {unread > 0 && <span className="size-2.5 shrink-0 rounded-full bg-accent" role="img" aria-label={`${unread} unread`} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
