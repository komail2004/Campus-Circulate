import { useState } from "react";
import { HANDOFF_CODE_DIGITS } from "../../data/rules/index.ts";
import { handoffCodeFor } from "../../data/selectors.ts";
import { useStore } from "../../data/storeContext.ts";
import { formatPrice } from "../../lib/format.ts";
import { useAction } from "../../lib/useAction.ts";
import type { Deal, User } from "../../types.ts";
import ConfirmDialog from "../ConfirmDialog.tsx";

// The buyer shows their code; the seller types it in at the meetup, which releases the payment.
export default function HandoffPanel({ deal, me, otherName }: { deal: Deal; me: User; otherName: string }) {
  const store = useStore();
  const { run, error, busy } = useAction();
  const [typed, setTyped] = useState("");
  const [miss, setMiss] = useState("");
  const [renewing, setRenewing] = useState(false);
  const paid = deal.paidCents ?? 0;

  if (deal.buyerId === me.id) {
    const code = handoffCodeFor(store, deal, me.id)?.code ?? "";
    return (
      <section className="space-y-2 rounded-lg bg-brand-solid p-4 text-white">
        <h2 className="text-sm font-medium text-white/75">Your handoff code</h2>
        <p className="font-mono text-[38px] leading-tight tracking-[0.16em]">{`${code.slice(0, 3)} ${code.slice(3)}`}</p>
        <p className="max-w-[40ch] text-sm text-white/85">
          Share it only once the item is yours. {paid > 0 ? `It releases your ${formatPrice(paid)} to ${otherName}.` : "It marks the handoff complete."}
        </p>
        <button type="button" onClick={() => setRenewing(true)} className="h-11 text-sm font-semibold text-gold">
          Generate a new code
        </button>
        {renewing && (
          <ConfirmDialog title="Generate a new code?" confirmLabel="New code" onClose={() => setRenewing(false)} onConfirm={() => store.newHandoffCode(deal.id)}>
            <p>The old code stops working. Do this if someone saw it, or if the seller ran out of tries.</p>
          </ConfirmDialog>
        )}
      </section>
    );
  }

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="font-semibold">Handoff code</h2>
      <p className="text-[15px] text-body">
        When you hand the item over, enter {otherName}'s {HANDOFF_CODE_DIGITS}-digit code.{paid > 0 && ` That releases ${formatPrice(paid)} to you.`}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const result = await store.confirmHandoff(deal.id, typed);
            setMiss(result.matched ? "" : `That code doesn't match. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left.`);
            if (!result.matched) setTyped("");
          });
        }}
      >
        <label htmlFor="handoff-code" className="sr-only">
          Handoff code
        </label>
        <input
          id="handoff-code"
          value={typed}
          onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="off"
          maxLength={HANDOFF_CODE_DIGITS}
          placeholder="000000"
          className="field font-mono text-lg tracking-[0.3em]"
        />
        <button type="submit" disabled={busy || typed.length !== HANDOFF_CODE_DIGITS} className="btn btn-brand shrink-0">
          Confirm
        </button>
      </form>
      {(miss || error) && <p className="text-sm text-danger">{error || miss}</p>}
    </section>
  );
}
