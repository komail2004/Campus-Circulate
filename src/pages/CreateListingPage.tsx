import { useNavigate } from "react-router";
import ListingForm from "../components/ListingForm.tsx";
import { campusForEmail, campuses, placesOnCampus } from "../data/campus.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { useTitle } from "../lib/useTitle.ts";

export default function CreateListingPage() {
  const store = useStore();
  const me = useMe();
  const navigate = useNavigate();
  useTitle("Sell");
  // you can only sell on the campus your .edu email belongs to
  const campus = campusForEmail(me.email);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="heading text-3xl">Sell an item</h1>
      {campus ? (
        <ListingForm
          campusName={campus.name}
          halls={placesOnCampus(campus.id).map((p) => p.name)}
          defaultHall={me.dorm}
          submitLabel="Post listing"
          onSubmit={async (input) => navigate(`/listings/${(await store.createListing(input)).id}`)}
        />
      ) : (
        <p className="mt-4 text-body">
          Selling is open to students at {campuses.map((c) => c.name).join(", ")} for now, since meetups happen on campus. You can still buy from any campus.
        </p>
      )}
    </div>
  );
}
