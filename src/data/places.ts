// Campuses and their residence halls.
// Hall coordinates are the buildings' real locations, from OpenStreetMap (© OpenStreetMap contributors).

import type { Campus, Place } from "../types.ts";

// A student's campus comes from their .edu email (baldwinwt@g.cofc.edu -> College of Charleston).
export const campuses: Campus[] = [{ id: "cofc", name: "College of Charleston", domain: "cofc.edu" }];

export const places: Place[] = [
  { name: "Berry Hall", campusId: "cofc", lat: 32.78594, lng: -79.93779 },
  { name: "Craig Hall", campusId: "cofc", lat: 32.78305, lng: -79.93666 },
  { name: "Rutledge Rivers Hall", campusId: "cofc", lat: 32.78457, lng: -79.93854 },
  { name: "Buist Rivers", campusId: "cofc", lat: 32.7843, lng: -79.93848 },
  { name: "Liberty Hall", campusId: "cofc", lat: 32.78302, lng: -79.93569 },
  { name: "McAlister Hall", campusId: "cofc", lat: 32.78668, lng: -79.93814 },
  { name: "McConnel Hall", campusId: "cofc", lat: 32.78096, lng: -79.93696 },
];

export function getPlace(name: string) {
  return places.find((place) => place.name === name) ?? places[0];
}

export function getCampus(id: string) {
  return campuses.find((campus) => campus.id === id);
}

export function placesOnCampus(campusId: string) {
  return places.filter((place) => place.campusId === campusId);
}

// The campus an email belongs to, or undefined if that school isn't on CampusCirculate yet.
// Subdomains count too: "g.cofc.edu" belongs to "cofc.edu".
export function campusForEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return campuses.find((campus) => domain === campus.domain || domain.endsWith(`.${campus.domain}`));
}
