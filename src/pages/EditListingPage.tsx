import { Link, useNavigate, useParams } from "react-router";
import ListingForm from "../components/ListingForm.tsx";
import { campusForEmail, placesOnCampus } from "../data/campus.ts";
import { whyNotEdit } from "../data/rules/index.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { useTitle } from "../lib/useTitle.ts";

export default function EditListingPage() {
  const { listingId = "" } = useParams();
  const store = useStore();
  const me = useMe();
  const navigate = useNavigate();
  useTitle("Edit listing");
  const listing = store.listings.find((l) => l.id === listingId);
  const campus = campusForEmail(me.email);
  const blocked = !listing ? "That listing doesn't exist." : whyNotEdit(listing, me.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="heading text-3xl">Edit listing</h1>
      {blocked || !listing || !campus ? (
        <div className="mt-4">
          <p className="text-body">{blocked}</p>
          <Link to={listing ? `/listings/${listing.id}` : "/account"} className="btn btn-outline mt-4">
            Back
          </Link>
        </div>
      ) : (
        <ListingForm
          initial={listing}
          campusName={campus.name}
          halls={placesOnCampus(campus.id).map((p) => p.name)}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await store.updateListing(listing.id, input);
            navigate(`/listings/${listing.id}`);
          }}
        />
      )}
    </div>
  );
}
