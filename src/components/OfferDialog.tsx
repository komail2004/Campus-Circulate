import { useState } from "react";
import { formatPrice } from "../lib/format.ts";
import { useAction } from "../lib/useAction.ts";
import Modal from "./Modal.tsx";

// Offer (or counter) a lower price. The rule enforces the limits; this just collects dollars.
export default function OfferDialog({ askingCents, onSubmit, onClose }: { askingCents: number; onSubmit: (cents: number) => Promise<unknown>; onClose: () => void }) {
  const [dollars, setDollars] = useState("");
  const { run, error, busy } = useAction();
  const cents = Math.round(Number(dollars) * 100);

  return (
    <Modal title="Make an offer" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await onSubmit(cents);
            onClose();
          });
        }}
      >
        <div>
          <label className="label" htmlFor="offer-amount">
            Your offer
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">$</span>
            <input
              id="offer-amount"
              autoFocus
              inputMode="decimal"
              value={dollars}
              onChange={(e) => setDollars(e.target.value.replace(/[^\d.]/g, ""))}
              className="field pl-7 tabular-nums"
            />
          </div>
          <p className="mt-1.5 text-sm text-muted">Asking {formatPrice(askingCents)}. Offers go below the asking price.</p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy || !(cents > 0)} className="btn btn-brand w-full">
          {cents > 0 ? `Offer ${formatPrice(cents)}` : "Offer"}
        </button>
      </form>
    </Modal>
  );
}
