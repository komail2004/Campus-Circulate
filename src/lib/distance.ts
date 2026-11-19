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

// Students think in minutes, not miles: a 3 mph walk is 20 minutes per mile.
// `fromOwnDorm` is true when distance is measured from the viewer's dorm, so "In your hall" is honest.
export function walkLabel(miles: number, fromOwnDorm: boolean) {
  if (miles < 0.01) return fromOwnDorm ? "In your hall" : "Same hall";
  return `${Math.max(1, Math.round(miles * 20))} min walk`;
}
