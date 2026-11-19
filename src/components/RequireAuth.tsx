import { Outlet } from "react-router";
import { useStore } from "../data/storeContext.ts";
import { useLayout } from "./layoutContext.ts";

// Selling, deals and the account need a signed-in student.
export default function RequireAuth() {
  const { currentUser } = useStore();
  const layout = useLayout();

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="heading text-3xl">Sign in to continue</h1>
        <p className="mt-3 text-muted">Selling and deals are for verified students.</p>
        <button type="button" onClick={layout.openSignIn} className="btn btn-primary mt-6">
          Sign in
        </button>
      </div>
    );
  }
  return <Outlet context={layout} />;
}
