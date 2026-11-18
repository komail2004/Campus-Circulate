import { useState } from "react";
import { Link, useParams } from "react-router";
import DealChat from "../components/DealChat.tsx";
import { friendlyError, HANDOFF_CODE_DIGITS } from "../data/rules/index.ts";
import { dealStatusLabel, handoffCodeFor, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { formatPrice } from "../lib/format.ts";

export default function DealPage() {
  const { dealId = "" } = useParams();
  const store = useStore();
  const me = useMe();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const deal = store.deals.find((d) => d.id === dealId);
  // only the buyer and the seller can see a deal
  if (!deal || (deal.buyerId !== me.id && deal.sellerId !== me.id)) {
    return (
      <p>
        Deal not found.{" "}
        <Link to="/deals" className="text-blue-700 hover:underline">
          My deals
        </Link>
      </p>
    );
  }

  const listing = store.listings.find((l) => l.id === deal.listingId);
  const iAmBuyer = deal.buyerId === me.id;
  const other = nameOf(store, iAmBuyer ? deal.sellerId : deal.buyerId);
  const paidCents = deal.paidCents ?? 0;
  const price = formatPrice(paidCents);
  const statusClass = deal.status === "held" ? "text-amber-700" : deal.status === "completed" ? "text-green-700" : "text-gray-600";

  async function submitCode() {
    try {
      const result = await store.confirmHandoff(dealId, code);
      setError(result.matched ? "" : `That code doesn't match. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left.`);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  let handoff;
  if (deal.status === "completed") {
    handoff = (
      <>
        <p className="font-semibold text-green-700">Handoff complete</p>
        <p className="mt-1 text-sm text-gray-600">
          {paidCents > 0 ? (iAmBuyer ? `Your ${price} was sent to ${other}.` : `You've been paid ${price}.`) : "The item was handed off."} The
          listing is marked sold.
        </p>
      </>
    );
  } else if (deal.status === "closed") {
    handoff = <p className="font-semibold text-gray-700">{dealStatusLabel(store, deal)}</p>;
  } else if (deal.status === "open") {
    handoff = <p className="text-sm text-gray-600">Not paid yet.</p>;
  } else if (iAmBuyer) {
    handoff = (
      <>
        <p className="label">Your handoff code</p>
        <p className="font-mono text-4xl font-bold tracking-widest">{handoffCodeFor(store, deal, me.id)?.code}</p>
        <p className="mt-3 text-sm text-gray-600">
          {paidCents > 0 && `Your ${price} is on hold. `}Meet {other} and give them this code only after you have the item. That
          releases the payment.
        </p>
      </>
    );
  } else {
    handoff = (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitCode();
        }}
      >
        <p className="label">Handoff code</p>
        <p className="text-sm text-gray-600">
          {paidCents > 0 && `${price} is on hold for you. `}Enter {other}'s {HANDOFF_CODE_DIGITS}-digit code when you hand the item over.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={HANDOFF_CODE_DIGITS}
            placeholder="000000"
            aria-label="Handoff code"
            className="field w-36 font-mono tracking-widest"
          />
          <button type="submit" disabled={code.length !== HANDOFF_CODE_DIGITS} className="btn btn-primary">
            Confirm handoff
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div>
      <Link to="/deals" className="text-sm text-blue-700 hover:underline">
        ← My deals
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{listing?.title}</h1>
      <p className="text-sm text-gray-600">
        {iAmBuyer ? `Buying from ${other}` : `Selling to ${other}`} · {price} ·{" "}
        <span className={`font-medium ${statusClass}`}>{dealStatusLabel(store, deal)}</span>
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card self-start p-5">{handoff}</section>
        <DealChat deal={deal} />
      </div>
    </div>
  );
}
