// Turns a price in cents into text people read: 4500 -> "$45", 4550 -> "$45.50", 0 -> "Free".
export function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
