import { SealCheckIcon } from "@phosphor-icons/react";
import { Link, useParams } from "react-router";
import ListingTile from "../components/ListingTile.tsx";
import { campusForEmail } from "../data/campus.ts";
import { activeListingsBy, displayName, thumbsUpPercent } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";
import { initials } from "../lib/format.ts";
import { useTitle } from "../lib/useTitle.ts";

// A student's public page: name (masked for visitors), track record and what they're selling.
// Never shows email or dorm.
export default function ProfilePage() {
  const { userId = "" } = useParams();
  const store = useStore();
  const viewer = store.currentUser;
  const user = store.users.find((u) => u.id === userId);
  const name = displayName(user, !!viewer);
  useTitle(user ? name : "Student not found");

  if (!user) {
    return (
      <div className="py-16 text-center">
        <h1 className="heading text-3xl">Student not found</h1>
        <Link to="/" className="btn btn-outline mt-6">
          Back to listings
        </Link>
      </div>
    );
  }

  // a backend returns the campus itself, so the email never leaves the server
  const campus = campusForEmail(user.email);
  const thumbs = thumbsUpPercent(user.stats);
  const ratings = user.stats.thumbsUp + user.stats.thumbsDown;
  const listings = activeListingsBy(store, user.id);

  return (
    <div>
      <section className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-brand-solid font-display text-2xl font-bold text-white">{initials(name)}</span>
        <div className="min-w-0">
          <h1 className="heading text-3xl">{name}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <SealCheckIcon size={16} weight="fill" className="text-brand" />
            Verified student{campus && ` at ${campus.name}`}
          </p>
          <p className="text-sm text-muted">Joined {user.joinedAt.slice(0, 7)}</p>
        </div>
      </section>

      <dl className="mt-6 grid max-w-md grid-cols-2 gap-3">
        <div className="panel p-4">
          <dt className="text-sm text-muted">Completed handoffs</dt>
          <dd className="price mt-2 text-[34px]">{user.stats.completedHandoffs}</dd>
        </div>
        <div className="panel p-4">
          <dt className="text-sm text-muted">Thumbs up</dt>
          <dd className="price mt-2 text-[34px]">{thumbs === null ? "New" : `${thumbs}%`}</dd>
          {thumbs !== null && <dd className="mt-1 text-xs text-muted">{ratings === 1 ? "1 rating" : `${ratings} ratings`}</dd>}
        </div>
      </dl>

      <h2 className="heading mt-10 text-2xl">For sale</h2>
      {listings.length === 0 ? (
        <p className="mt-3 text-muted">Nothing for sale right now.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingTile key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
