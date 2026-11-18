// Saved items: a student's private shortlist.

import type { Data, Save } from "../../types.ts";
import type { RuleContext } from "./context.ts";
import { check } from "./errors.ts";
import { getListing, getUser } from "./shared.ts";

export function toggleSave(data: Data, ctx: RuleContext, userId: string, listingId: string) {
  getUser(data, userId);
  const listing = getListing(data, listingId);
  const isThis = (s: Save) => s.userId === userId && s.listingId === listingId;
  if (data.saves.some(isThis)) return { data: { ...data, saves: data.saves.filter((s) => !isThis(s)) }, saved: false };

  check(listing.status !== "removed", "This listing was removed.");
  return { data: { ...data, saves: [...data.saves, { userId, listingId, savedAt: ctx.now }] }, saved: true };
}
