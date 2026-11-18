// The shapes of everything the app stores. Each list in `Data` is one collection: the same
// collections a backend will have. Times are ISO-8601 UTC strings; money is whole cents.

export type Campus = { id: string; name: string; domain: string };

// A residence hall. Coordinates let us measure distance between halls.
export type Place = { name: string; campusId: string; lat: number; lng: number };

export type Category = "Furniture" | "Electronics" | "Textbooks" | "Appliances" | "Clothing" | "Other";

export type UserStats = { completedHandoffs: number; thumbsUp: number; thumbsDown: number };

export type User = {
  id: string;
  name: string;
  email: string; // private: never shown on public pages
  dorm?: string; // private; only for students on a CampusCirculate campus
  joinedAt: string;
  stats: UserStats; // public; only the handoff and rating rules change it
};

export type ListingStatus = "active" | "reserved" | "sold" | "removed";

export type Listing = {
  id: string;
  sellerId: string;
  title: string;
  priceCents: number; // 0 = free
  location: string; // the pickup hall (a Place name)
  category: Category;
  description: string;
  photoUrl?: string;
  courseCode?: string; // Textbooks only, stored like "MATH 120"
  status: ListingStatus;
  createdAt: string;
};

// What the Sell / Edit form sends.
export type ListingInput = Pick<Listing, "title" | "priceCents" | "location" | "category" | "description" | "photoUrl" | "courseCode">;

export type Offer = { amountCents: number; byUserId: string; status: "pending" | "accepted" };
export type Meetup = { spot: string; time: string; proposedBy: string; agreed: boolean };
export type Rating = "up" | "down";
export type DealStatus = "open" | "held" | "completed" | "closed";
export type CloseReason = "cancelled_by_buyer" | "cancelled_by_seller" | "sold_elsewhere" | "listing_removed";

// One buyer's conversation with the seller about one listing, from first message to handoff.
export type Deal = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: DealStatus;
  offer: Offer | null;
  paidCents: number | null; // set when the buyer pays (0 for free items)
  meetup: Meetup | null;
  meetupEverAgreed: boolean; // once true, only the seller can cancel a paid deal
  ratings: { byBuyer?: Rating; bySeller?: Rating };
  closeReason: CloseReason | null;
  createdAt: string;
  updatedAt: string; // last activity; the deals list is sorted by it
};

// senderId is null for system events ("This item was sold to another student.").
export type Message = { id: string; dealId: string; senderId: string | null; text: string; sentAt: string; kind: "text" | "event" };

export type DealRead = { dealId: string; userId: string; lastReadAt: string };

// Secret. Only the buyer may see it; on a backend only the server reads it.
export type HandoffCode = { dealId: string; buyerId: string; code: string; wrongTries: number };

export type Save = { userId: string; listingId: string; savedAt: string };

export type Data = {
  users: User[];
  listings: Listing[];
  deals: Deal[];
  messages: Message[];
  dealReads: DealRead[];
  handoffCodes: HandoffCode[];
  saves: Save[];
};
