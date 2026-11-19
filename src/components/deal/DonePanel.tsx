import { CheckCircleIcon, ThumbsDownIcon, ThumbsUpIcon } from "@phosphor-icons/react";
import { whyNotRate } from "../../data/rules/index.ts";
import { useStore } from "../../data/storeContext.ts";
import { formatPrice } from "../../lib/format.ts";
import { useAction } from "../../lib/useAction.ts";
import type { Deal, Rating, User } from "../../types.ts";

// After the handoff: what happened to the money, and a one-tap rating of the other student.
export default function DonePanel({ deal, me, otherName }: { deal: Deal; me: User; otherName: string }) {
  const store = useStore();
  const { run, error, busy } = useAction();
  const iAmBuyer = deal.buyerId === me.id;
  const paid = deal.paidCents ?? 0;
  const myRating = iAmBuyer ? deal.ratings.byBuyer : deal.ratings.bySeller;
  const rate = (rating: Rating) => run(() => store.rateDeal(deal.id, rating));

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-brand">
        <CheckCircleIcon size={20} weight="fill" />
        Handoff complete
      </h2>
      <p className="text-[15px] text-body">
        {paid === 0 ? "The item was handed off." : iAmBuyer ? `Your ${formatPrice(paid)} went to ${otherName}.` : `You've been paid ${formatPrice(paid)}.`}
      </p>
      {!whyNotRate(deal, me.id) ? (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm text-muted">How did it go with {otherName}?</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => rate("up")} className="btn btn-outline flex-1">
              <ThumbsUpIcon size={18} />
              Good
            </button>
            <button type="button" disabled={busy} onClick={() => rate("down")} className="btn btn-outline flex-1">
              <ThumbsDownIcon size={18} />
              Not good
            </button>
          </div>
        </div>
      ) : (
        myRating && <p className="text-sm text-muted">Thanks for rating {otherName}.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
