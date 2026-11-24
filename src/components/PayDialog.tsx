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
    <ConfirmDialog title={free ? "Reserve this item" : `Simulate ${formatPrice(cents)} purchase`} confirmLabel={free ? "Reserve" : "Simulate purchase"} onConfirm={onConfirm} onClose={onClose}>
      <p>
        <span className="font-semibold text-ink">{title}</span> from {sellerName}
      </p>
      <p className="flex gap-2.5 rounded-lg bg-surface-2 p-3 text-sm">
        <ShieldCheckIcon size={20} className="shrink-0 text-brand" />
        {free
          ? `In this class demo, the item is reserved until you meet ${sellerName} and share your handoff code.`
          : `Demo only: ${formatPrice(cents)} is marked held for ${sellerName}. No actual money moves and no card is charged.`}
      </p>
      {localMode && !free && <p className="text-sm text-muted">Class demo only: no card is charged and no real escrow occurs.</p>}
    </ConfirmDialog>
  );
}
