import { ShieldCheckIcon } from "@phosphor-icons/react";
import { localMode } from "../config.ts";
import { formatPrice } from "../lib/format.ts";
import ConfirmDialog from "./ConfirmDialog.tsx";

// The pay step. The app never collects card numbers: a hosted payment form plugs in behind `onConfirm`.
export default function PayDialog({ title, sellerName, cents, onConfirm, onClose }: {
  title: string;
  sellerName: string;
  cents: number;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const free = cents === 0;
  return (
    <ConfirmDialog title={free ? "Reserve this item" : `Reserve item for ${formatPrice(cents)}`} confirmLabel={free ? "Reserve" : "Confirm reservation"} onConfirm={onConfirm} onClose={onClose}>
      <p>
        <span className="font-semibold text-ink">{title}</span> from {sellerName}
      </p>
      <p className="flex gap-2.5 rounded-lg bg-surface-2 p-3 text-sm">
        <ShieldCheckIcon size={20} className="shrink-0 text-brand" />
        {free
          ? `The item is reserved until you meet ${sellerName} and share your handoff code.`
          : `Your reservation for ${formatPrice(cents)} with ${sellerName} is recorded. No charge is made.`}
      </p>
      {localMode && !free && <p className="text-sm text-muted">No payment or escrow is processed on this site.</p>}
    </ConfirmDialog>
  );
}
