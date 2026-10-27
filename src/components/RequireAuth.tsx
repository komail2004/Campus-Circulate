import { Outlet } from "react-router";
import { useStore } from "../data/storeContext.ts";
import { useLayout } from "./layoutContext.ts";

// Selling and deals need a signed-in student. Anyone else gets a prompt to sign in.
export default function RequireAuth() {
  const { currentUser } = useStore();
  const layout = useLayout();

  if (!currentUser) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Sign in to continue</h1>
        <p className="mt-2 text-gray-600">Selling and deals are for verified students.</p>
        <button type="button" onClick={layout.openSignIn} className="btn btn-primary mt-4">
          Sign in
        </button>
      </div>
    );
  }
  // pass the layout's tools on to the page inside
  return <Outlet context={layout} />;
}
