import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { categories } from "../data/categories.ts";
import { useStore } from "../data/storeContext.ts";
import type { LayoutContext } from "./layoutContext.ts";
import SignInGate from "./SignInGate.tsx";
import SignInModal from "./SignInModal.tsx";

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "font-semibold text-gray-900 underline underline-offset-4" : "text-gray-600 hover:text-gray-900";
}

export default function Layout() {
  const { currentUser, logOut } = useStore();
  const [signInOpen, setSignInOpen] = useState(false);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const signedOut = !currentUser; // until someone signs in, clicks open the sign-in window
  const query = params.get("q") ?? "";
  const activeCategory = pathname === "/" ? params.get("category") : null;
  const openSignIn = () => setSignInOpen(true);
  const context: LayoutContext = { openSignIn };

  function signOut() {
    logOut();
    navigate("/");
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            Campus Circulate
          </Link>

          {/* search: on phones it drops to its own row */}
          <SignInGate active={signedOut} onBlocked={openSignIn} className="order-last w-full md:order-none md:w-auto md:flex-1">
            <form
              key={query}
              onSubmit={(event) => {
                event.preventDefault();
                if (signedOut) {
                  openSignIn(); // e.g. pressing Enter while signed out
                  return;
                }
                const text = String(new FormData(event.currentTarget).get("q") ?? "").trim();
                navigate(text ? `/?q=${encodeURIComponent(text)}` : "/");
              }}
              className="flex gap-2"
            >
              <input name="q" defaultValue={query} placeholder="Search for anything" aria-label="Search listings" className="field" />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>
          </SignInGate>

          <nav className="ml-auto flex items-center gap-5 text-sm md:ml-0">
            {currentUser ? (
              <>
                <NavLink to="/sell" className={linkClass}>
                  Sell
                </NavLink>
                <NavLink to="/deals" className={linkClass}>
                  Deals
                </NavLink>
                <span className="text-gray-400">{currentUser.name}</span>
                <button type="button" onClick={signOut} className="text-gray-600 hover:text-gray-900">
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" onClick={openSignIn} className="btn btn-secondary">
                Sign in
              </button>
            )}
          </nav>
        </div>

        {/* category row */}
        <SignInGate active={signedOut} onBlocked={openSignIn} className="mx-auto max-w-5xl overflow-x-auto px-4">
          <nav className="flex gap-5 pb-2 text-sm whitespace-nowrap">
            <Link to="/" className={linkClass({ isActive: pathname === "/" && !activeCategory && !query })}>
              All
            </Link>
            {categories.map((category) => (
              <Link key={category} to={`/?category=${encodeURIComponent(category)}`} className={linkClass({ isActive: activeCategory === category })}>
                {category}
              </Link>
            ))}
          </nav>
        </SignInGate>
      </header>

      {/* key: signing in or out starts each page fresh (e.g. distance from your own dorm) */}
      <main key={currentUser?.id ?? "guest"} className="mx-auto max-w-5xl px-4 py-6">
        <Outlet context={context} />
      </main>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}
