//fake listings for demo
//pulls listing from types for blueprint
//all 12 belong to Bob Smith (u2); photos live in public/listings/ (see photo-credits.md)

import type { Listing } from "../types.ts";

export const fakeListings: Listing[] = [
  { id: "1", sellerId: "u2", title: "Mini fridge", priceCents: 4500, location: "North Hall", category: "Appliances", status: "active", photoUrl: "/listings/mini-fridge.png", description: "Mini fridge is basically new, just downsizing and need it gone" },
  { id: "2", sellerId: "u2", title: "Calculus textbook", priceCents: 2000, location: "West Hall", category: "Textbooks", status: "active", photoUrl: "/listings/calculus-textbook.webp", description: "Used only one year, don't need it anymore" },
  { id: "3", sellerId: "u2", title: "Coffee Table", priceCents: 1000, location: "East Hall", category: "Furniture", status: "active", photoUrl: "/listings/coffee-table.webp", description: "Banged up but is sturdy still" },
  { id: "4", sellerId: "u2", title: "Harbinger Speaker", priceCents: 3000, location: "Hall Bridge", category: "Electronics", status: "active", photoUrl: "/listings/speaker.webp", description: "Harbinger Speaker product number 5xfH6s3KKoF, plays music just fine and all outlets work." },
  { id: "5", sellerId: "u2", title: "Leather sofa", priceCents: 0, location: "Hall Bridge", category: "Furniture", status: "active", photoUrl: "/listings/leather-sofa.webp", description: "Rough Condition, just need it gone, first come first serve" },
  { id: "6", sellerId: "u2", title: "IKEA Lamp + desk", priceCents: 500, location: "North Hall", category: "Furniture", status: "active", photoUrl: "/listings/lamp-desk.webp", description: "Used only a semester, don't need it anymore, but still looks new" },
  { id: "7", sellerId: "u2", title: "Graphing calculator", priceCents: 4000, location: "South Hall", category: "Electronics", status: "active", photoUrl: "/listings/calculator.png", description: "TI-84 Plus CE, works perfectly" },
  { id: "8", sellerId: "u2", title: "Twin XL mattress topper", priceCents: 1500, location: "West Hall", category: "Other", status: "active", photoUrl: "/listings/mattress-topper.webp", description: "Memory foam, fits the dorm beds, always used with a cover" },
  { id: "9", sellerId: "u2", title: "Microwave", priceCents: 2500, location: "East Hall", category: "Appliances", status: "active", photoUrl: "/listings/microwave.webp", description: "Fits on a dorm shelf, cleaned and ready to go" },
  { id: "10", sellerId: "u2", title: "Winter coat (men's M)", priceCents: 0, location: "South Hall", category: "Clothing", status: "active", photoUrl: "/listings/winter-coat.png", description: "Warm brown jacket, free to whoever needs it" },
  { id: "11", sellerId: "u2", title: "Desk chair", priceCents: 2000, location: "Library", category: "Furniture", status: "active", photoUrl: "/listings/desk-chair.png", description: "Rolling chair, adjustable height" },
  { id: "12", sellerId: "u2", title: "Bike lock", priceCents: 800, location: "Hall Bridge", category: "Other", status: "active", photoUrl: "/listings/bike-lock.webp", description: "Heavy cable lock with two keys" },
];
