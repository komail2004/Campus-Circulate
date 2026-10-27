// Blueprints: what information each thing in the app has. Other files use these.

// A spot on campus. Coordinates let us measure distance between spots.
export type Place = {
  name: string;
  lat: number;
  lng: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  dorm: string; // the name of a Place
};

export type Category = "Furniture" | "Electronics" | "Textbooks" | "Appliances" | "Clothing" | "Other";

export type Listing = {
  id: string;
  sellerId: string;
  title: string;
  priceCents: number; // 0 means free
  location: string; // the name of a Place
  category: Category;
  description: string;
  photoUrl?: string; // optional: listings without one show "No photo"
  status: "active" | "reserved" | "sold";
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
};

// Created when someone buys a listing. The payment is held until the seller
// types in the buyer's handoff code at the meetup.
export type Deal = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  handoffCode: string;
  status: "held" | "released";
  messages: Message[];
};
