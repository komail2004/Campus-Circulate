import type { Deal } from "../types.ts";

// Turns a price in cents into text people read: 4500 -> "$45", 4550 -> "$45.50", 0 -> "Free".
export function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

// What to call a deal's status. Free items have no payment to hold, so they're just "Reserved".
export function dealStatus(deal: Deal) {
  if (deal.status === "released") return "Completed";
  return deal.amountCents > 0 ? "Payment held" : "Reserved";
}
