import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import ListingTile from "../components/ListingTile.tsx";
import Modal from "../components/Modal.tsx";
import { useLayout } from "../components/layoutContext.ts";
import { campusForEmail, campuses, placeByName, places, placesOnCampus } from "../data/campus.ts";
import { categories } from "../data/categories.ts";
import { browseListings, type SortOrder } from "../data/selectors.ts";
import { useStore } from "../data/storeContext.ts";
import { browseSearch, readBrowseParams, type BrowseParams } from "../lib/browseParams.ts";
import { useTitle } from "../lib/useTitle.ts";

const SORT_LABEL: Record<SortOrder, string> = { nearest: "closest first", newest: "newest first", price: "lowest price first" };

// The home page: everyone can browse; buying, saving and selling ask for sign-in.
export default function BrowsePage() {
  const { listings, currentUser } = useStore();
  const { openSignIn } = useLayout();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const myCampus = currentUser ? campusForEmail(currentUser.email) : undefined;
  const defaults = { campusId: myCampus?.id ?? "all", from: currentUser?.dorm ?? places[0].name };
  const filters = readBrowseParams(params, defaults);
  const origin = placeByName(filters.from) ?? places[0];
  const results = browseListings(listings, { ...filters, origin });
  const go = (changes: Partial<BrowseParams>) => navigate(`/${browseSearch({ ...filters, ...changes }, defaults)}`);

  let heading = `Near ${origin.name}`;
  if (filters.query) heading = `Results for “${filters.query}”`;
  else if (filters.category) heading = filters.category;
  else if (filters.freeOnly) heading = "Free stuff";
  useTitle(filters.query ? `Search: ${filters.query}` : (filters.category ?? (filters.freeOnly ? "Free stuff" : "")));

  const tab = (active: boolean) =>
    `inline-flex h-11 shrink-0 items-center px-3 text-sm ${active ? "font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-cardinal)]" : "font-medium text-muted hover:text-ink"}`;

  return (
    <div>
      {!currentUser && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 p-4">
          <p className="max-w-[52ch] text-[15px] text-body">Buy and sell with verified students on your campus. Your payment is held until the item is in your hands.</p>
          <button type="button" onClick={openSignIn} className="btn btn-primary">
            Sign in
          </button>
        </section>
      )}

      <nav aria-label="Categories" className="-mx-4 mb-5 flex overflow-x-auto border-b border-line px-1 [scrollbar-width:none] md:mx-0 md:px-0">
        <Link to={`/${browseSearch({ ...filters, query: "", category: null, freeOnly: false }, defaults)}`} className={tab(!filters.category && !filters.freeOnly && !filters.query)}>
          All
        </Link>
        <Link to={`/${browseSearch({ ...filters, query: "", category: null, freeOnly: true }, defaults)}`} className={tab(filters.freeOnly && !filters.category)}>
          Free
        </Link>
        {categories.map((c) => (
          <Link key={c} to={`/${browseSearch({ ...filters, query: "", category: c, freeOnly: false }, defaults)}`} className={tab(filters.category === c)}>
            {c}
          </Link>
        ))}
      </nav>

      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="heading text-[25px] leading-[1.05] text-balance md:text-3xl">{heading}</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {results.length} {results.length === 1 ? "listing" : "listings"}, {SORT_LABEL[filters.sort]}
          </p>
        </div>
        <button type="button" onClick={() => setFiltersOpen(true)} className="btn btn-outline shrink-0 px-3 text-sm font-medium">
          <SlidersHorizontalIcon size={17} />
          Filters
        </button>
      </div>

      {results.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="text-body">No listings match these filters.</p>
          <Link to="/" className="btn btn-outline mt-4">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {results.map(({ listing, miles }) => (
            <ListingTile key={listing.id} listing={listing} miles={miles} fromOwnDorm={filters.from === currentUser?.dorm} />
          ))}
        </div>
      )}

      {filtersOpen && (
        <FiltersModal
          filters={filters}
          onApply={(changes) => {
            go(changes);
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

function FiltersModal({ filters, onApply, onClose }: { filters: BrowseParams; onApply: (changes: Partial<BrowseParams>) => void; onClose: () => void }) {
  const [campusId, setCampusId] = useState(filters.campusId);
  const halls = campusId === "all" ? places : placesOnCampus(campusId);
  const [from, setFrom] = useState(filters.from);
  const hall = halls.some((p) => p.name === from) ? from : halls[0].name;

  return (
    <Modal title="Filters" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const max = Number(form.get("max"));
          onApply({
            campusId,
            from: hall,
            sort: (form.get("sort") as SortOrder) ?? "nearest",
            freeOnly: form.get("free") === "on",
            maxPriceCents: Number.isInteger(max) && max > 0 ? max * 100 : null,
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="f-campus">
              Campus
            </label>
            <select id="f-campus" className="field" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              <option value="all">All campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-from">
              Distance from
            </label>
            <select id="f-from" className="field" value={hall} onChange={(e) => setFrom(e.target.value)}>
              {halls.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Sort</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["nearest", "newest", "price"] as const).map((s) => (
              <label key={s} className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-line-strong text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-surface-2 has-[:checked]:text-brand">
                <input type="radio" name="sort" value={s} defaultChecked={filters.sort === s} className="sr-only" />
                {{ nearest: "Nearest", newest: "Newest", price: "Price" }[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label className="label" htmlFor="f-max">
              Max price ($)
            </label>
            <input id="f-max" name="max" inputMode="numeric" defaultValue={filters.maxPriceCents ? filters.maxPriceCents / 100 : ""} placeholder="Any" className="field" />
          </div>
          <label className="flex h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="free" defaultChecked={filters.freeOnly} className="size-4 accent-[var(--accent)]" />
            Free only
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-outline flex-1" onClick={() => onApply({ freeOnly: false, maxPriceCents: null, sort: "nearest" })}>
            Clear
          </button>
          <button type="submit" className="btn btn-brand flex-1">
            Show listings
          </button>
        </div>
      </form>
    </Modal>
  );
}
