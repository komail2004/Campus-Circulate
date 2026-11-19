import { Link } from "react-router";
import ListingTile from "../components/ListingTile.tsx";
import { campusForEmail } from "../data/campus.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { useTitle } from "../lib/useTitle.ts";

// Your account: who you are, and everything you've listed (including sold items).
export default function AccountPage() {
  const { listings } = useStore();
  const me = useMe();
  useTitle("My account");
  const campus = campusForEmail(me.email);
  const myListings = listings.filter((l) => l.sellerId === me.id && l.status !== "removed");
  const count = (status: string) => myListings.filter((l) => l.status === status).length;

  return (
    <div>
      <h1 className="heading text-3xl">My account</h1>
      <p className="mt-2 text-body">{me.name}</p>
      <p className="text-sm text-muted">
        {me.email}
        <br />
        {campus ? campus.name : "Your school isn't on CampusCirculate yet"}
        {me.dorm && `, ${me.dorm}`}
      </p>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="heading text-2xl">My listings</h2>
          <p className="mt-1 text-sm text-muted">
            {count("active")} for sale, {count("reserved")} reserved, {count("sold")} sold
          </p>
        </div>
        <Link to="/sell" className="btn btn-primary">
          Sell something
        </Link>
      </div>

      {myListings.length === 0 && <p className="mt-4 text-muted">You haven't listed anything yet.</p>}

      <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {myListings.map((listing) => (
          <ListingTile key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
