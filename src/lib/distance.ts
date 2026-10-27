// Distance between two spots on a map, in miles (the "haversine" formula).

import type { Place } from "../types.ts";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function milesBetween(a: Place, b: Place) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// Campus is small, so short distances read better in feet: 0 -> "same hall", 0.02 -> "100 ft", 0.31 -> "0.3 mi".
export function formatDistance(miles: number) {
  if (miles < 0.01) return "same hall";
  if (miles < 0.1) return `${Math.max(50, Math.round((miles * 5280) / 50) * 50)} ft`;
  return `${miles.toFixed(1)} mi`;
}
