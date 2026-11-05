import { useEffect, useState } from "react";
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
  const { currentUser, logOut, resetDemo, demoSwitchUser } = useStore();
  const [signInOpen, setSignInOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.localStorage.getItem("campus-circulate-theme") === "dark" ? "dark" : "light",
  );
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const signedOut = !currentUser; // until someone signs in, clicks open the sign-in window
  const query = params.get("q") ?? "";
  const activeCategory = pathname === "/" ? params.get("category") : null;
  const openSignIn = () => setSignInOpen(true);
  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));
  const context: LayoutContext = { openSignIn, theme, toggleTheme };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("campus-circulate-theme", theme);
  }, [theme]);

  function signOut() {
    logOut();
    navigate("/");
  }

  // clears accounts, listings, and deals made while rehearsing
  function reset() {
    if (!window.confirm("Reset the demo? Accounts, listings, and deals made during the demo will be removed.")) return;
    resetDemo();
    navigate("/");
  }

  return (
    <div className="min-h-dvh">
      <header className="site-header border-b border-gray-200 bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="site-title text-lg font-bold">
            CampusCirculate
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
                <NavLink to="/account" className={linkClass} title="My account and listings">
                  {currentUser.name}
                </NavLink>
                <button type="button" onClick={signOut} className="text-gray-600 hover:text-gray-900">
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" onClick={openSignIn} className="btn btn-cardinal">
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

      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <strong>Class demo</strong>
        <span>Sample accounts · simulated payments · data saved on this browser</span>
        <label className="ml-auto flex items-center gap-2">
          <span>Act as:</span>
          <select aria-label="Switch sample student" className="rounded border border-amber-300 bg-surface px-2 py-1" value={currentUser?.id === "u1" || currentUser?.id === "u2" ? currentUser.id : ""} onChange={e => { if(e.target.value) { demoSwitchUser(e.target.value); navigate("/"); } }}>
            <option value="">Select a student</option>
            <option value="u1">William Baldwin (buyer)</option>
            <option value="u2">Bob Smith (seller)</option>
          </select>
        </label>
      </div>
      {/* key: signing in or out starts each page fresh (e.g. distance from your own dorm) */}
      <main key={currentUser?.id ?? "guest"} className="mx-auto max-w-5xl px-4 py-6">
        <Outlet context={context} />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pt-4 pb-8 text-xs text-gray-400">
        <button type="button" onClick={reset} className="hover:text-gray-700 hover:underline">
          Reset demo data
        </button>
      </footer>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}
