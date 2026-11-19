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
    <ConfirmDialog title={free ? "Reserve this item" : `Pay ${formatPrice(cents)}`} confirmLabel={free ? "Reserve" : `Pay ${formatPrice(cents)}`} onConfirm={onConfirm} onClose={onClose}>
      <p>
        <span className="font-semibold text-ink">{title}</span> from {sellerName}
      </p>
      <p className="flex gap-2.5 rounded-lg bg-surface-2 p-3 text-sm">
        <ShieldCheckIcon size={20} className="shrink-0 text-brand" />
        {free
          ? `It's held for you until you meet ${sellerName} and share your handoff code.`
          : `Your ${formatPrice(cents)} is held, not paid to ${sellerName}, until you have the item and share your handoff code.`}
      </p>
      {localMode && !free && <p className="text-sm text-muted">Local mode: no card is charged.</p>}
    </ConfirmDialog>
  );
}
