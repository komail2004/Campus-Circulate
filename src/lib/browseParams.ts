// Browse filters live in the URL so back, refresh and shared links keep them. Anything unknown or
// hand-edited falls back to a default instead of breaking the page.

import { categories } from "../data/categories.ts";
import { campuses, placeByName } from "../data/campus.ts";
import type { SortOrder } from "../data/selectors.ts";
import type { Category } from "../types.ts";

export type BrowseParams = {
  query: string;
  category: Category | null;
  freeOnly: boolean;
  maxPriceCents: number | null;
  sort: SortOrder;
  campusId: string; // "all" or a campus id
  from: string; // hall to measure distance from
};

const SORTS: SortOrder[] = ["nearest", "newest", "price"];

export function readBrowseParams(p: URLSearchParams, defaults: { campusId: string; from: string }): BrowseParams {
  const max = Number(p.get("max"));
  const campus = p.get("campus");
  const from = p.get("from") ?? "";
  return {
    query: (p.get("q") ?? "").slice(0, 100),
    category: categories.find((c) => c === p.get("category")) ?? null,
    freeOnly: p.get("free") === "1",
    maxPriceCents: Number.isInteger(max) && max > 0 ? max * 100 : null,
    sort: SORTS.find((s) => s === p.get("sort")) ?? "nearest",
    campusId: campus === "all" || campuses.some((c) => c.id === campus) ? (campus as string) : defaults.campusId,
    from: placeByName(from) ? from : defaults.from,
  };
}

// The query string for these filters, leaving out anything at its default.
export function browseSearch(b: Partial<BrowseParams>, defaults?: { campusId: string; from: string }): string {
  const p = new URLSearchParams();
  if (b.query) p.set("q", b.query);
  if (b.category) p.set("category", b.category);
  if (b.freeOnly) p.set("free", "1");
  if (b.maxPriceCents) p.set("max", String(Math.round(b.maxPriceCents / 100)));
  if (b.sort && b.sort !== "nearest") p.set("sort", b.sort);
  if (b.campusId && b.campusId !== defaults?.campusId) p.set("campus", b.campusId);
  if (b.from && b.from !== defaults?.from) p.set("from", b.from);
  const text = p.toString();
  return text ? `?${text}` : "";
}
