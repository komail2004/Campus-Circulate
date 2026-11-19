import { ImageIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { categories } from "../data/categories.ts";
import { DESCRIPTION_MAX, listingProblems, TITLE_MAX, type ListingField } from "../data/rules/index.ts";
import { useStore } from "../data/storeContext.ts";
import { useAction } from "../lib/useAction.ts";
import type { Category, Listing, ListingInput } from "../types.ts";

// The Sell and Edit form. It checks with the same listingProblems the rules use, so every bad field
// is marked at once and the rules never disagree with the screen.
export default function ListingForm({ initial, campusName, halls, defaultHall, submitLabel, onSubmit }: {
  initial?: Listing;
  campusName: string;
  halls: string[];
  defaultHall?: string;
  submitLabel: string;
  onSubmit: (input: ListingInput) => Promise<unknown>;
}) {
  const store = useStore();
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(initial ? String(initial.priceCents / 100) : "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "Furniture");
  const [courseCode, setCourseCode] = useState(initial?.courseCode ?? "");
  const [location, setLocation] = useState(initial?.location ?? (halls.includes(defaultHall ?? "") ? defaultHall : halls[0]) ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [problems, setProblems] = useState<Partial<Record<ListingField, string>>>({});
  const photo = useAction();
  const save = useAction();

  const input: ListingInput = {
    title,
    priceCents: price.trim() === "" ? Number.NaN : Math.round(Number(price) * 100),
    location,
    category,
    description,
    photoUrl,
    courseCode: category === "Textbooks" ? courseCode : undefined,
  };

  function field(id: ListingField, label: string, control: ReactNode, hint?: string) {
    return (
      <div>
        <label className="label" htmlFor={`lf-${id}`}>
          {label}
        </label>
        {control}
        {problems[id] ? (
          <p id={`lf-${id}-error`} className="mt-1.5 text-sm text-danger">
            {problems[id]}
          </p>
        ) : (
          hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>
        )}
      </div>
    );
  }
  const invalid = (id: ListingField) => (problems[id] ? { "aria-invalid": true, "aria-describedby": `lf-${id}-error` } : {});

  return (
    <form
      noValidate
      className="panel mt-5 space-y-5 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const found = listingProblems(input);
        setProblems(found);
        if (Object.keys(found).length === 0) void save.run(() => onSubmit(input));
      }}
    >
      <div>
        <span className="label">Photo</span>
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt="Listing photo" className="aspect-[4/3] w-36 rounded-lg bg-surface-2 object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-36 items-center justify-center rounded-lg bg-surface-2 text-muted">
              <ImageIcon size={28} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="btn btn-outline cursor-pointer">
              {photoUrl ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void photo.run(async () => setPhotoUrl(await store.uploadPhoto(file)));
                }}
              />
            </label>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl(undefined)} className="text-sm font-medium text-muted hover:text-ink">
                Remove photo
              </button>
            )}
          </div>
        </div>
        {(photo.error || problems.photoUrl) && <p className="mt-1.5 text-sm text-danger">{photo.error || problems.photoUrl}</p>}
      </div>

      {field("title", "Title", <input id="lf-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className="field" {...invalid("title")} />)}

      <div className="grid gap-5 sm:grid-cols-2">
        {field(
          "priceCents",
          "Price",
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">$</span>
            <input id="lf-priceCents" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} className="field pl-7 tabular-nums" {...invalid("priceCents")} />
          </div>,
          "0 to give it away free",
        )}
        {field(
          "category",
          "Category",
          <select id="lf-category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="field">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>,
        )}
      </div>

      {category === "Textbooks" &&
        field(
          "courseCode",
          "Course code (optional)",
          <input id="lf-courseCode" value={courseCode} maxLength={12} placeholder="MATH 120" onChange={(e) => setCourseCode(e.target.value)} className="field" {...invalid("courseCode")} />,
          "Buyers can search for their class.",
        )}

      <div>
        <label className="label" htmlFor="lf-location">
          Pickup spot at {campusName}
        </label>
        <select id="lf-location" value={location} onChange={(e) => setLocation(e.target.value)} className="field">
          {halls.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      {field(
        "description",
        "Description",
        <textarea id="lf-description" rows={4} value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} className="field" {...invalid("description")} />,
        `${description.trim().length} / ${DESCRIPTION_MAX}`,
      )}

      {save.error && <p className="text-sm text-danger">{save.error}</p>}
      <button type="submit" disabled={save.busy || photo.busy} className="btn btn-primary w-full sm:w-auto">
        {submitLabel}
      </button>
    </form>
  );
}
