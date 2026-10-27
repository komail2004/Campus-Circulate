import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import ListingCard from "../components/ListingCard.tsx";
import { getPlace, places } from "../data/places.ts";
import { useStore } from "../data/storeContext.ts";
import { milesBetween } from "../lib/distance.ts";

// The home page. Anyone can browse; buying and selling need a sign in.
export default function BrowsePage() {
  const { listings, currentUser } = useStore();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("category");
  const [from, setFrom] = useState(currentUser?.dorm ?? "Library"); // sort by distance from here

  const search = query.trim().toLowerCase();
  const origin = getPlace(from);
  const results = listings
    .filter((listing) => listing.status !== "sold")
    .filter((listing) => !category || listing.category === category)
    .filter((listing) => !search || listing.title.toLowerCase().includes(search) || listing.description.toLowerCase().includes(search))
    .map((listing) => ({ listing, miles: milesBetween(origin, getPlace(listing.location)) }))
    .sort((a, b) => a.miles - b.miles);

  let heading = "Listings near you";
  if (query) heading = `Results for "${query}"`;
  else if (category) heading = category;

  return (
    <div>
      {!query && !category && (
        <section className="card mb-8 grid overflow-hidden md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 md:p-10">
            <h1 className="text-3xl font-bold">Find it on campus</h1>
            <p className="mt-2 text-gray-600">
              Buy, sell, and give away stuff with verified students nearby. Your payment is held until the item is in your hands.
            </p>
            <Link to="/sell" className="btn btn-primary mt-5 self-start">
              Start selling
            </Link>
          </div>
          <img src="/campus.webp" alt="Brick campus building with white columns" className="h-48 w-full object-cover md:h-72" />
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <label className="flex items-center gap-2 text-sm">
          Nearest to
          <select value={from} onChange={(event) => setFrom(event.target.value)} className="field w-auto">
            {places.map((place) => (
              <option key={place.name} value={place.name}>
                {place.name === currentUser?.dorm ? `${place.name} (your dorm)` : place.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length === 0 && (
        <p className="mt-4 text-gray-600">
          No listings match.{" "}
          <Link to="/" className="text-blue-700 hover:underline">
            See everything
          </Link>
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {results.map(({ listing, miles }) => (
          <ListingCard key={listing.id} listing={listing} distance={miles} />
        ))}
      </div>
    </div>
  );
}
