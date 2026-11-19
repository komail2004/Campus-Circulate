import { CaretLeftIcon, ChatCircleIcon, CheckCircleIcon, LockSimpleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import DealChat from "../components/DealChat.tsx";
import ListingPhoto from "../components/ListingPhoto.tsx";
import DealProgress from "../components/deal/DealProgress.tsx";
import DonePanel from "../components/deal/DonePanel.tsx";
import HandoffPanel from "../components/deal/HandoffPanel.tsx";
import MeetupPanel from "../components/deal/MeetupPanel.tsx";
import OfferPanel from "../components/deal/OfferPanel.tsx";
import { priceFor, whyNotCancel } from "../data/rules/index.ts";
import { dealStatusLabel, nameOf, unreadCount } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { firstName, formatPrice } from "../lib/format.ts";
import { useTitle } from "../lib/useTitle.ts";
import type { DealStatus } from "../types.ts";

const STATUS_ICON: Record<DealStatus, typeof LockSimpleIcon> = { open: ChatCircleIcon, held: LockSimpleIcon, completed: CheckCircleIcon, closed: XCircleIcon };

export default function DealPage() {
  const { dealId = "" } = useParams();
  const store = useStore();
  const me = useMe();
  const [cancelling, setCancelling] = useState(false);
  const deal = store.deals.find((d) => d.id === dealId && (d.buyerId === me.id || d.sellerId === me.id));
  const listing = deal && store.listings.find((l) => l.id === deal.listingId);
  const unread = deal ? unreadCount(store, deal.id, me.id) : 0;
  useTitle(listing?.title ?? "Deal");

  // reading the thread clears its unread badge
  useEffect(() => {
    if (deal && unread > 0) void store.markRead(deal.id);
  }, [deal, unread, store]);

  if (!deal || !listing) {
    return (
      <div className="py-16 text-center">
        <h1 className="heading text-3xl">Deal not found</h1>
        <Link to="/deals" className="btn btn-outline mt-6">
          Back to deals
        </Link>
      </div>
    );
  }

  const iAmBuyer = deal.buyerId === me.id;
  const other = firstName(nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId));
  const amount = deal.paidCents ?? priceFor(deal, listing);
  const StatusIcon = STATUS_ICON[deal.status];
  const canCancel = !whyNotCancel(deal, me.id);

  return (
    <div>
      <Link to="/deals" className="link mb-4 inline-flex h-11 items-center gap-1 md:-mt-3">
        <CaretLeftIcon size={18} />
        Deals
      </Link>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start md:gap-8">
        <div className="space-y-4">
          <Link to={`/listings/${listing.id}`} className="panel flex items-center gap-3 p-3 hover:bg-surface-2">
            <ListingPhoto src={listing.photoUrl} alt={listing.title} className="size-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{listing.title}</p>
              <p className="text-[13px] text-muted">{iAmBuyer ? `From ${other}` : `To ${other}`}</p>
            </div>
            <div className="text-right">
              <p className="price text-[22px]">{formatPrice(amount)}</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold text-brand">
                <StatusIcon size={13} weight="bold" />
                {dealStatusLabel(store, deal)}
              </p>
            </div>
          </Link>

          {deal.status !== "closed" && <DealProgress deal={deal} />}
          {deal.status === "open" && <OfferPanel deal={deal} listing={listing} me={me} otherName={other} />}
          {deal.status === "held" && (
            <>
              <MeetupPanel deal={deal} listing={listing} me={me} otherName={other} />
              <HandoffPanel deal={deal} me={me} otherName={other} />
            </>
          )}
          {deal.status === "completed" && <DonePanel deal={deal} me={me} otherName={other} />}
          {deal.status === "closed" && (
            <section className="panel p-4">
              <h2 className="font-semibold">{dealStatusLabel(store, deal)}</h2>
              <p className="mt-1 text-sm text-muted">This deal is closed.</p>
            </section>
          )}

          {canCancel && (
            <button type="button" onClick={() => setCancelling(true)} className="btn mx-auto flex font-medium text-muted hover:text-ink">
              Cancel deal
            </button>
          )}
        </div>

        <DealChat deal={deal} otherName={other} />
      </div>

      {cancelling && (
        <ConfirmDialog title="Cancel this deal?" confirmLabel="Cancel deal" onClose={() => setCancelling(false)} onConfirm={() => store.cancelDeal(deal.id)}>
          <p>
            {deal.status === "held"
              ? `${iAmBuyer ? "Your" : `${other}'s`} ${amount > 0 ? `${formatPrice(amount)} is refunded` : "reservation ends"} and the item goes back on sale.`
              : "This closes the conversation. You can start a new one later."}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
