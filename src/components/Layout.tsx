import { ArrowsClockwiseIcon, ChatCircleIcon, HeartIcon, HouseIcon, MagnifyingGlassIcon, MoonIcon, PlusSquareIcon, SunIcon, UserIcon } from "@phosphor-icons/react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router";
import { unreadDealCount } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";
import { initials } from "../lib/format.ts";
import DevTools from "./DevTools.tsx";
import type { LayoutContext } from "./layoutContext.ts";
import SignInModal from "./SignInModal.tsx";

const THEME_KEY = "campus-circulate-theme"; // index.html reads it before first paint

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="ml-1 min-w-[18px] rounded-full bg-accent px-1.5 text-center text-[11px] leading-[18px] font-semibold text-white">{count}</span> : null;
}

export default function Layout() {
  const store = useStore();
  const { currentUser, ready, saveFailed } = store;
  const [signInOpen, setSignInOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q") ?? "";
  const unread = currentUser ? unreadDealCount(store, currentUser.id) : 0;
  const openSignIn = () => setSignInOpen(true);
  const context: LayoutContext = { openSignIn };

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage blocked: the choice lasts until reload
    }
  }

  // Selling, deals and the account need a student: signed-out taps open sign-in instead of a dead end.
  function needsStudent(event: MouseEvent) {
    if (currentUser) return;
    event.preventDefault();
    openSignIn();
  }

  const headerLink = ({ isActive }: { isActive: boolean }) =>
    `hidden h-11 items-center rounded-lg px-3 text-[15px] font-medium hover:bg-white/10 md:inline-flex ${isActive ? "bg-white/10" : ""}`;

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="bg-header text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 pt-2.5 pb-3.5 md:flex-nowrap md:py-3">
          <Link to="/" aria-label="CampusCirculate home" className="flex h-11 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gold text-navy">
              <ArrowsClockwiseIcon size={18} weight="bold" />
            </span>
            <span className="font-display text-[22px] leading-none tracking-[0.06em] uppercase">
              <span className="font-bold">Campus</span>
              <span className="font-semibold text-header-muted">Circulate</span>
            </span>
          </Link>

          <form
            key={query}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const text = String(new FormData(event.currentTarget).get("q") ?? "").trim();
              navigate(text ? `/?q=${encodeURIComponent(text)}` : "/");
            }}
            className="order-last w-full md:order-none md:mx-4 md:max-w-xl md:flex-1"
          >
            <label htmlFor="site-search" className="sr-only">
              Search
            </label>
            <div className="flex h-11 items-center gap-2 rounded-lg bg-surface px-3 text-muted">
              <MagnifyingGlassIcon size={18} />
              <input
                id="site-search"
                name="q"
                defaultValue={query}
                maxLength={100}
                placeholder="Search listings or a course code"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
            </div>
          </form>

          <nav aria-label="Account" className="ml-auto flex items-center gap-0.5">
            <NavLink to="/sell" onClick={needsStudent} className={headerLink}>
              Sell
            </NavLink>
            <NavLink to="/deals" onClick={needsStudent} className={headerLink}>
              Deals
              <Badge count={unread} />
            </NavLink>
            <button type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="btn-icon hover:bg-white/10">
              {dark ? <SunIcon size={21} /> : <MoonIcon size={21} />}
            </button>
            <Link to="/account#saved" onClick={needsStudent} aria-label="Saved items" className="btn-icon hover:bg-white/10">
              <HeartIcon size={21} />
            </Link>
            {currentUser ? (
              <Link to="/account" aria-label="My account" className="btn-icon">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-xs font-semibold">{initials(currentUser.name)}</span>
              </Link>
            ) : (
              <button type="button" onClick={openSignIn} className="btn ml-1 h-10 bg-white/12 px-3 text-white hover:bg-white/20">
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>
      <div className="stripe" />

      {saveFailed && (
        <p role="alert" className="bg-danger px-4 py-2 text-center text-sm font-medium text-white">
          This browser's storage is full, so new changes won't be saved. Remove a photo or reset local data.
        </p>
      )}

      {/* key: signing in or out starts each page fresh */}
      <main key={currentUser?.id ?? "guest"} className="mx-auto max-w-6xl px-4 py-5 md:py-8">
        {ready ? <Outlet context={context} /> : <p className="text-muted">Loading…</p>}
      </main>

      <DevTools />

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <TabLink to="/" icon={<HouseIcon size={22} />} label="Browse" />
        <TabLink to="/sell" icon={<PlusSquareIcon size={22} />} label="Sell" onClick={needsStudent} />
        <TabLink to="/deals" icon={<ChatCircleIcon size={22} />} label="Deals" onClick={needsStudent} badge={unread} />
        <TabLink to="/account" icon={<UserIcon size={22} />} label="Account" onClick={needsStudent} />
      </nav>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}

function TabLink({ to, icon, label, onClick, badge = 0 }: { to: string; icon: ReactNode; label: string; onClick?: (event: MouseEvent) => void; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] ${isActive ? "font-semibold text-brand shadow-[inset_0_2px_0_var(--color-cardinal)]" : "font-medium text-muted"}`
      }
    >
      {icon}
      {label}
      {badge > 0 && <span className="absolute top-2 left-[56%] min-w-[17px] rounded-full bg-accent px-1 text-center text-[10.5px] leading-[17px] font-semibold text-white">{badge}</span>}
    </NavLink>
  );
}
