import type { ReactNode, SyntheticEvent } from "react";

// While `active` is true, clicking any link, button, or field inside opens the sign-in
// window instead of doing its normal thing. Everything still looks normal.
export default function SignInGate({
  active,
  onBlocked,
  className,
  children,
}: {
  active: boolean;
  onBlocked: () => void;
  className?: string;
  children: ReactNode;
}) {
  function onControl(event: SyntheticEvent) {
    return event.target instanceof Element && event.target.closest("a, button, input, select, textarea") !== null;
  }

  return (
    <div
      className={className}
      // "capture" runs before the clicked element reacts, so we can stop it first
      onMouseDownCapture={(event) => {
        if (active && onControl(event)) event.preventDefault(); // no focusing fields or opening dropdowns
      }}
      onClickCapture={(event) => {
        if (!active || !onControl(event)) return;
        event.preventDefault(); // links don't navigate
        event.stopPropagation(); // buttons don't run their own click
        onBlocked();
      }}
    >
      {children}
    </div>
  );
}
