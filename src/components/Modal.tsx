import { XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

// A pop-up on the browser's own <dialog>: Escape closes it and focus stays inside. Mount it to open,
// unmount it to close. Backdrop clicks and scroll lock aren't built into <dialog>, so they're added here
// and in index.css.
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal(); // the guard keeps StrictMode's double run from throwing
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // only the backdrop is the dialog itself
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-[#0b1220]/55"
    >
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="pt-2 text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon -mr-2 text-muted hover:text-ink">
            <XIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
