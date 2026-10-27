// Spots on campus. Coordinates are made up for the demo; only the distances between them matter.

import type { Place } from "../types.ts";

export const places: Place[] = [
  { name: "North Hall", lat: 35.0045, lng: -80.0005 },
  { name: "South Hall", lat: 34.9962, lng: -80.001 },
  { name: "East Hall", lat: 35.0008, lng: -79.993 },
  { name: "West Hall", lat: 35.0003, lng: -80.0072 },
  { name: "Hall Bridge", lat: 35.0025, lng: -79.9968 },
  { name: "Library", lat: 35.001, lng: -80.0014 },
];

export function getPlace(name: string) {
  return places.find((place) => place.name === name) ?? places[0];
}
