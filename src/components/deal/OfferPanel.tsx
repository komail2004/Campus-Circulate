import { useState } from "react";
import { priceFor, whyNotAnswerOffer, whyNotOffer, whyNotPay } from "../../data/rules/index.ts";
import { useStore } from "../../data/storeContext.ts";
import { formatPrice } from "../../lib/format.ts";
import { useAction } from "../../lib/useAction.ts";
import type { Deal, Listing, User } from "../../types.ts";
import OfferDialog from "../OfferDialog.tsx";
import PayDialog from "../PayDialog.tsx";

// Before payment: the offer back-and-forth and the buyer's Pay button.
export default function OfferPanel({ deal, listing, me, otherName }: { deal: Deal; listing: Listing; me: User; otherName: string }) {
  const store = useStore();
  const { run, error, busy } = useAction();
  const [dialog, setDialog] = useState<"offer" | "pay" | null>(null);
  const offer = deal.offer;
  const iAmBuyer = deal.buyerId === me.id;
  const canAnswer = !whyNotAnswerOffer(deal, me.id);
  const canOffer = !whyNotOffer(store, deal, me.id);
  const payBlock = whyNotPay(store, deal, me.id);
  const price = priceFor(deal, listing);

  let status = `Asking ${formatPrice(listing.priceCents)}.`;
  if (offer?.status === "accepted") status = `Agreed price ${formatPrice(offer.amountCents)}.`;
  else if (offer && canAnswer) status = `${otherName} offered ${formatPrice(offer.amountCents)}. Asking was ${formatPrice(listing.priceCents)}.`;
  else if (offer) status = `You offered ${formatPrice(offer.amountCents)}. Waiting for ${otherName}.`;

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="font-semibold">Price</h2>
      <p className="text-[15px] text-body">{status}</p>
      {canAnswer && (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => run(() => store.acceptOffer(deal.id))} className="btn btn-brand flex-1">
            Accept
          </button>
          <button type="button" disabled={busy} onClick={() => run(() => store.declineOffer(deal.id))} className="btn btn-outline flex-1">
            Decline
          </button>
        </div>
      )}
      {iAmBuyer ? (
        payBlock ? (
          <p className="text-sm text-muted">{payBlock}</p>
        ) : (
          <button type="button" onClick={() => setDialog("pay")} className="btn btn-primary w-full">
            {price ? `Pay ${formatPrice(price)}` : "Reserve for free"}
          </button>
        )
      ) : (
        <p className="text-sm text-muted">Waiting for {otherName} to pay.</p>
      )}
      {canOffer && (
        <button type="button" onClick={() => setDialog("offer")} className="btn btn-outline w-full">
          {canAnswer ? "Counter offer" : "Make an offer"}
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {dialog === "offer" && <OfferDialog askingCents={listing.priceCents} onClose={() => setDialog(null)} onSubmit={(cents) => store.makeOffer(deal.id, cents)} />}
      {dialog === "pay" && <PayDialog title={listing.title} sellerName={otherName} cents={price} onClose={() => setDialog(null)} onConfirm={() => store.payDeal(deal.id)} />}
    </section>
  );
}
