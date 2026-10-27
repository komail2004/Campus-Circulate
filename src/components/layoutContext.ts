// Lets pages inside the Layout open the sign-in window (e.g. the Buy button when you're signed out).

import { useOutletContext } from "react-router";

export type LayoutContext = { openSignIn: () => void };

export function useLayout() {
  return useOutletContext<LayoutContext>();
}
