import { useState } from "react";
import { useNavigate } from "react-router";
import { categories } from "../data/categories.ts";
import { campusForEmail, campuses, placesOnCampus } from "../data/places.ts";
import type { Category } from "../types.ts";
import { useMe, useStore } from "../data/storeContext.ts";

export default function CreateListingPage() {
  const { createListing } = useStore();
  const me = useMe();
  const navigate = useNavigate();

  // you can only sell on the campus your .edu email belongs to
  const campus = campusForEmail(me.email);
  const myHalls = campus ? placesOnCampus(campus.id) : [];

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(""); // dollars, as typed
  const [location, setLocation] = useState(myHalls.some((p) => p.name === me.dorm) ? me.dorm : myHalls[0]?.name);
  const [category, setCategory] = useState<Category>("Furniture");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  async function choosePhoto(file?: File) {
    if (!file) { setPhotoUrl(undefined); return; }
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      setError("Choose an image under 12 MB."); return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image could not be read."));
        image.src = url;
      });
      const scale = Math.min(1, 800 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.55);
      if (data.length > 350000) throw new Error("Photo is too large for demo storage. Choose a smaller one.");
      setPhotoUrl(data);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load photo."); }
    finally { URL.revokeObjectURL(url); }
  }
  function submit() {
    const dollars = Number(price);
    if (title.trim().length < 3) {
      setError("Give your item a title.");
      return;
    }
    if (price === "" || !(dollars >= 0)) {
      setError("Enter a price (0 if it's free).");
      return;
    }
    try {
      const listing = createListing({
        title: title.trim(),
        priceCents: Math.round(dollars * 100),
        location: location ?? "",
        category,
        description: description.trim(),
        photoUrl,
      });
      navigate(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (!campus) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold">Sell an item</h1>
        <p className="mt-3 text-gray-600">
          You can only sell on your own campus, and your school isn't on CampusCirculate yet. Right now that's{" "}
          {campuses.map((c) => c.name).join(", ")}. You can still buy from any campus.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">Sell an item</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="card mt-4 space-y-4 p-5"
      >
        <div>
          <label className="label" htmlFor="photo">
            Photo
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(event) => {
              void choosePhoto(event.target.files?.[0]);
            }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-50"
          />
          {photoUrl && <img src={photoUrl} alt="Preview" className="mt-2 h-48 w-full rounded border border-gray-200 object-cover" />}
        </div>
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="price">
            Price ($)
          </label>
          <input
            id="price"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0 for free"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" value={category} onChange={(event) => setCategory(event.target.value as Category)} className="field">
            {categories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="location">
            Pickup spot at {campus.name}
          </label>
          <select id="location" value={location} onChange={(event) => setLocation(event.target.value)} className="field">
            {myHalls.map((place) => (
              <option key={place.name}>{place.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Post listing
        </button>
      </form>
    </div>
  );
}
