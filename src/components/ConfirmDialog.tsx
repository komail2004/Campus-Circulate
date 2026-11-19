import type { ReactNode } from "react";
import { useAction } from "../lib/useAction.ts";
import Modal from "./Modal.tsx";

// "Are you sure?" with the real action behind the confirm button; errors stay in the dialog.
export default function ConfirmDialog({ title, confirmLabel, onConfirm, onClose, children }: {
  title: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  children: ReactNode;
}) {
  const { run, error, busy } = useAction();
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-[15px] text-body">{children}</div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
          Back
        </button>
        <button type="button" disabled={busy} onClick={() =>
            run(async () => {
              await onConfirm();
              onClose();
            })
          } className="btn btn-primary flex-1">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
