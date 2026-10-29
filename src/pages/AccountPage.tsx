import { Link } from "react-router";
import ListingCard from "../components/ListingCard.tsx";
import { campusForEmail } from "../data/places.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { useLayout } from "../components/layoutContext.ts";

// Your account: who you are, and everything you've listed (including sold items).
export default function AccountPage() {
  const { listings } = useStore();
  const { theme, toggleTheme } = useLayout();
  const me = useMe();
  const campus = campusForEmail(me.email);
  const myListings = listings.filter((l) => l.sellerId === me.id);
  const count = (status: string) => myListings.filter((l) => l.status === status).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">My account</h1>
      <p className="mt-1 text-gray-600">
        {me.name} · {me.email}
      </p>
      <p className="text-sm text-gray-600">
        {campus ? campus.name : "Your school isn't on CampusCirculate yet"}
        {me.dorm && ` · ${me.dorm}`}
      </p>

      <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-4" aria-labelledby="appearance-heading">
        <div>
          <h2 id="appearance-heading" className="font-semibold">
            Appearance
          </h2>
          <p className="mt-1 text-sm text-gray-600">Choose a theme for CampusCirculate on this device.</p>
        </div>
        <button type="button" className="btn btn-secondary" aria-pressed={theme === "dark"} onClick={toggleTheme}>
          Dark mode: {theme === "dark" ? "On" : "Off"}
        </button>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">My listings</h2>
          <p className="text-sm text-gray-600">
            {count("active")} for sale · {count("reserved")} reserved · {count("sold")} sold
          </p>
        </div>
        <Link to="/sell" className="btn btn-primary btn-cardinal">
          Sell something
        </Link>
      </div>

      {myListings.length === 0 && <p className="mt-4 text-gray-600">You haven't listed anything yet.</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {myListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
