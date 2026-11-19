import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import ListingTile from "../components/ListingTile.tsx";
import { campusForEmail } from "../data/campus.ts";
import { savedListings, thumbsUpPercent } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { initials } from "../lib/format.ts";
import { useTitle } from "../lib/useTitle.ts";

// Your own account: private details, your listings (all states) and your saved items.
export default function AccountPage() {
  const store = useStore();
  const me = useMe();
  const navigate = useNavigate();
  const { hash } = useLocation();
  useTitle("Account");

  // the header's heart links to #saved
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const campus = campusForEmail(me.email);
  const mine = store.listings.filter((l) => l.sellerId === me.id && l.status !== "removed");
  const saved = savedListings(store, me.id);
  const thumbs = thumbsUpPercent(me.stats);
  const count = (status: string) => mine.filter((l) => l.status === status).length;

  return (
    <div>
      <section className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-brand-solid font-display text-2xl font-bold text-white">{initials(me.name)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="heading text-3xl">{me.name}</h1>
          <p className="mt-1.5 text-sm text-muted">{me.email}</p>
          <p className="text-sm text-muted">
            {campus ? campus.name : "Your school isn't on CampusCirculate yet"}
            {me.dorm && `, ${me.dorm}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/students/${me.id}`} className="btn btn-outline">
            Public profile
          </Link>
          <button
            type="button"
            onClick={async () => {
              await store.signOut();
              navigate("/");
            }}
            className="btn btn-outline"
          >
            Sign out
          </button>
        </div>
      </section>

      <p className="mt-5 text-sm text-body">
        {me.stats.completedHandoffs} completed {me.stats.completedHandoffs === 1 ? "handoff" : "handoffs"}
        {thumbs !== null && `, ${thumbs}% thumbs up`}
      </p>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="heading text-2xl">My listings</h2>
          <p className="mt-1.5 text-sm text-muted">
            {count("active")} for sale, {count("reserved")} reserved, {count("sold")} sold
          </p>
        </div>
        <Link to="/sell" className="btn btn-primary">
          Sell something
        </Link>
      </div>
      {mine.length === 0 ? (
        <p className="mt-4 text-muted">You haven't listed anything yet.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {mine.map((listing) => (
            <ListingTile key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <h2 id="saved" className="heading mt-12 scroll-mt-6 text-2xl">
        Saved
      </h2>
      {saved.length === 0 ? (
        <p className="mt-3 text-muted">Tap the heart on a listing to save it here.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {saved.map((listing) => (
            <ListingTile key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
