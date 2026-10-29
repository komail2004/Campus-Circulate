import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import ListingCard from "../components/ListingCard.tsx";
import { useLayout } from "../components/layoutContext.ts";
import SignInGate from "../components/SignInGate.tsx";
import { campusForEmail, campuses, getPlace, places, placesOnCampus } from "../data/places.ts";
import { useStore } from "../data/storeContext.ts";
import { milesBetween } from "../lib/distance.ts";

// The home page. Anyone can look; clicking anything while signed out opens the sign-in window.
export default function BrowsePage() {
  const { listings, currentUser } = useStore();
  const { openSignIn } = useLayout();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("category");

  // filters: which campus, and which hall to measure distance from
  const myCampus = currentUser ? campusForEmail(currentUser.email) : undefined;
  const [campusId, setCampusId] = useState(myCampus?.id ?? "all");
  const [from, setFrom] = useState(currentUser?.dorm ?? places[0].name);
  const hallOptions = campusId === "all" ? places : placesOnCampus(campusId);
  const fromHall = hallOptions.some((p) => p.name === from) ? from : hallOptions[0].name;

  const search = query.trim().toLowerCase();
  const origin = getPlace(fromHall);
  const results = listings
    .filter((listing) => listing.status !== "sold")
    .filter((listing) => campusId === "all" || getPlace(listing.location).campusId === campusId)
    .filter((listing) => !category || listing.category === category)
    .filter((listing) => !search || listing.title.toLowerCase().includes(search) || listing.description.toLowerCase().includes(search))
    .map((listing) => ({ listing, miles: milesBetween(origin, getPlace(listing.location)) }))
    .sort((a, b) => a.miles - b.miles);

  let heading = "Listings near you";
  if (query) heading = `Results for "${query}"`;
  else if (category) heading = category;

  return (
    <SignInGate active={!currentUser} onBlocked={openSignIn}>
      {!query && !category && (
        <section className="card mb-8 grid overflow-hidden md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 md:p-10">
            <h1 className="text-3xl font-bold">Find it on campus</h1>
            <p className="mt-2 text-gray-600">
              Buy, sell, and give away stuff with verified students nearby. Your payment is held until the item is in your hands.
            </p>
            <span className="payment-protected mt-4 self-start rounded px-3 py-1 text-sm font-semibold">Payment protected</span>
            <Link to="/sell" className="btn btn-primary btn-cardinal mt-5 self-start">
              Start selling
            </Link>
          </div>
          <img src="/campus.webp" alt="Brick campus building with white columns" className="h-48 w-full object-cover md:h-72" />
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Campus
            <select
              value={campusId}
              // keyboard changes skip the click, so check here too
              onChange={(event) => (currentUser ? setCampusId(event.target.value) : openSignIn())}
              className="field w-auto"
            >
              <option value="all">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Nearest to
            <select
              value={fromHall}
              onChange={(event) => (currentUser ? setFrom(event.target.value) : openSignIn())}
              className="field w-auto"
            >
              {hallOptions.map((place) => (
                <option key={place.name} value={place.name}>
                  {place.name === currentUser?.dorm ? `${place.name} (your dorm)` : place.name}
                </option>
              ))}
            </select>
          </label>
        </div>
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
    </SignInGate>
  );
}
