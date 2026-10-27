import { useState } from "react";
import { Link, useParams } from "react-router";
import DealChat from "../components/DealChat.tsx";
import { useMe, useStore } from "../data/storeContext.ts";
import { dealStatus, formatPrice } from "../lib/format.ts";

export default function DealPage() {
  const { dealId } = useParams();
  const { deals, listings, users, confirmHandoff } = useStore();
  const me = useMe();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const deal = deals.find((d) => d.id === dealId);
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

  const listing = listings.find((l) => l.id === deal.listingId);
  const iAmBuyer = deal.buyerId === me.id;
  const other = users.find((u) => u.id === (iAmBuyer ? deal.sellerId : deal.buyerId));
  const price = formatPrice(deal.amountCents);

  function submitCode() {
    try {
      confirmHandoff(dealId ?? "", code);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  let handoff;
  if (deal.status === "released") {
    handoff = (
      <>
        <p className="font-semibold text-green-700">Handoff complete</p>
        <p className="mt-1 text-sm text-gray-600">
          {deal.amountCents > 0 ? `${price} was released to the seller.` : "The item was handed off."} The listing is marked sold.
        </p>
      </>
    );
  } else if (iAmBuyer) {
    handoff = (
      <>
        <p className="label">Your handoff code</p>
        <p className="font-mono text-4xl font-bold tracking-widest">{deal.handoffCode}</p>
        <p className="mt-3 text-sm text-gray-600">
          {deal.amountCents > 0 && `Your ${price} is on hold. `}Meet {other?.name} and give them this code only after
          you have the item. That releases the payment.
        </p>
      </>
    );
  } else {
    handoff = (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitCode();
        }}
      >
        <p className="label">Handoff code</p>
        <p className="text-sm text-gray-600">
          {deal.amountCents > 0 && `${price} is on hold for you. `}Enter {other?.name}'s 4-digit code when you hand
          the item over.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            aria-label="Handoff code"
            className="field w-28 font-mono tracking-widest"
          />
          <button type="submit" disabled={code.length !== 4} className="btn btn-primary">
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
        {iAmBuyer ? `Buying from ${other?.name}` : `Selling to ${other?.name}`} · {price} ·{" "}
        <span className={`font-medium ${deal.status === "held" ? "text-amber-700" : "text-green-700"}`}>
          {dealStatus(deal)}
        </span>
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card self-start p-5">{handoff}</section>
        <DealChat deal={deal} />
      </div>
    </div>
  );
}
