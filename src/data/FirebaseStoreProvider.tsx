// Real Firebase-backed profiles, listings, and bookmarks on the Spark (free) plan.
// Deliberately does NOT implement client-authoritative purchases, escrow, messages
// or handoff codes. Those require protected server-side transactions and private data.

import { useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword, onIdTokenChanged, sendEmailVerification,
  signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import {
  collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, query,
  runTransaction, setDoc, where, writeBatch,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { Data, Listing, ListingInput, Save, User } from "../types.ts";
import { firebaseAuth, firestore } from "../firebase/client.ts";
import { campusForEmail, placeByName, placesOnCampus } from "./campus.ts";
import { compressPhoto } from "./photo.ts";
import { RuleError } from "./rules/errors.ts";
import { isEduEmail } from "./rules/users.ts";
import { listingProblems } from "./rules/listings.ts";
import { emptyData } from "./sample.ts";
import { StoreContext, type Store } from "./storeContext.ts";

const empty = emptyData();
const defaultStats = { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 };
const unavailable = (): never => {
  throw new RuleError(
    "This transaction needs the secure checkout backend. Browsing, accounts, listings and saved items are available; payments and handoffs are not enabled."
  );
};
const now = () => new Date().toISOString();

function requireVerified(user: FirebaseUser | null): FirebaseUser {
  if (!user || !user.email || !user.emailVerified || !isEduEmail(user.email)) {
    throw new RuleError("Sign in and verify your .edu email before using this feature.");
  }
  return user;
}

function listingInput(input: ListingInput, email: string): Record<string, unknown> {
  const problem = Object.values(listingProblems(input))[0];
  if (problem) throw new RuleError(problem);
  const campus = campusForEmail(email);
  if (!campus || placeByName(input.location)?.campusId !== campus.id) {
    throw new RuleError("Choose a pickup location on your university campus.");
  }
  if (input.photoUrl && input.photoUrl.length > 65000) {
    throw new RuleError("That photo exceeds the free-plan 65 KB thumbnail limit.");
  }
  return {
    title: input.title.trim(),
    priceCents: input.priceCents,
    location: input.location,
    category: input.category,
    description: input.description.trim(),
    ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    ...(input.category === "Textbooks" && input.courseCode?.trim() ? { courseCode: input.courseCode.trim().toUpperCase() } : {}),
  };
}

type Load = { listings: boolean; profiles: boolean; auth: boolean; own: boolean };
export default function FirebaseStoreProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [own, setOwn] = useState<User | null>(null);
  const [identity, setIdentity] = useState<FirebaseUser | null>(null);
  const [saves, setSaves] = useState<Save[]>([]);
  const [loaded, setLoaded] = useState<Load>({ listings: false, profiles: false, auth: false, own: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fail = (err: Error) => { if (alive) { console.error(err); setError("Firebase could not load the marketplace. Check your connection and project rules."); } };
    const stopListings = onSnapshot(collection(firestore, "listings"), snapshot => {
      if (!alive) return;
      setListings(snapshot.docs.map(d => d.data() as Listing));
      setLoaded(s => ({ ...s, listings: true }));
    }, fail);
    const stopProfiles = onSnapshot(collection(firestore, "publicProfiles"), snapshot => {
      if (!alive) return;
      setProfiles(snapshot.docs.map(d => ({ email: "", ...d.data() }) as User));
      setLoaded(s => ({ ...s, profiles: true }));
    }, fail);
    return () => { alive = false; stopListings(); stopProfiles(); };
  }, []);

  useEffect(() => {
    let alive = true;
    let stopOwn: (() => void) | undefined;
    let stopSaves: (() => void) | undefined;
    const stopAuth = onIdTokenChanged(firebaseAuth, user => {
      stopOwn?.();
      stopSaves?.();
      stopOwn = undefined;
      stopSaves = undefined;
      if (!alive) return;
      setIdentity(user?.emailVerified && user.email && isEduEmail(user.email) ? user : null);
      setOwn(null);
      setSaves([]);
      setLoaded(s => ({ ...s, auth: true, own: false }));
      if (!user?.emailVerified || !user.email || !isEduEmail(user.email)) {
        setLoaded(s => ({ ...s, own: true }));
        return;
      }
      stopOwn = onSnapshot(doc(firestore, "users", user.uid), snapshot => {
        if (!alive) return;
        setOwn(snapshot.exists() ? snapshot.data() as User : null);
        setLoaded(s => ({ ...s, own: true }));
      }, err => { console.error(err); setError("Could not load your account profile."); setLoaded(s => ({ ...s, own: true })); });
      stopSaves = onSnapshot(query(collection(firestore, "saves"), where("userId", "==", user.uid)), snapshot => {
        if (!alive) return;
        setSaves(snapshot.docs.map(d => d.data() as Save));
      }, err => { console.error(err); setError("Saved listings could not be loaded."); });
    });
    return () => { alive = false; stopAuth(); stopOwn?.(); stopSaves?.(); };
  }, []);

  const users = own ? [...profiles.filter(p => p.id !== own.id), own] : profiles;
  const data: Data = { ...empty, users, listings, saves };
  const ready = loaded.auth && loaded.listings && loaded.profiles && loaded.own;

  const store: Store = {
    ...data,
    ready,
    currentUser: identity && own && own.id === identity.uid ? own : null,
    saveFailed: !!error,

    async signIn(email, password) {
      if (!password) throw new RuleError("Enter your password.");
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
      await credential.user.reload();
      if (!credential.user.emailVerified) {
        await signOut(firebaseAuth);
        throw new RuleError("Please verify your email using the link Firebase sent before signing in.");
      }
      await credential.user.getIdToken(true);
      const profile = await getDoc(doc(firestore, "users", credential.user.uid));
      if (!profile.exists()) {
        await signOut(firebaseAuth);
        throw new RuleError("Your profile could not be found. Please contact the CampusCirculate team.");
      }
      const publicRef = doc(firestore, "publicProfiles", credential.user.uid);
      if (!(await getDoc(publicRef)).exists()) {
        const person = profile.data() as User;
        await setDoc(publicRef, { id: person.id, name: person.name, joinedAt: person.joinedAt, stats: person.stats });
      }
    },
    async signUp(input, password) {
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      if (!isEduEmail(email) || name.length === 0 || name.length > 60) {
        throw new RuleError("Enter your name and a valid .edu email.");
      }
      if (!password || password.length < 8) throw new RuleError("Use a password at least 8 characters long.");
      const campus = campusForEmail(email);
      const dorm = campus && placesOnCampus(campus.id).some(p => p.name === input.dorm) ? input.dorm : undefined;
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user: User = {
        id: credential.user.uid, name, email, ...(dorm ? { dorm } : {}),
        joinedAt: now(), stats: { ...defaultStats },
      };
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, "users", user.id), user);
      await batch.commit();
      await sendEmailVerification(credential.user);
      await signOut(firebaseAuth);
    },
    async signOut() { await signOut(firebaseAuth); },
    async signInAsSample() { unavailable(); },
    async resetLocalData() { unavailable(); },

    async uploadPhoto(file) {
      requireVerified(firebaseAuth.currentUser);
      return compressPhoto(file, { maxDimension: 360, quality: 0.40, maxChars: 64000 });
    },
    async createListing(input) {
      const user = requireVerified(firebaseAuth.currentUser);
      const ref = doc(collection(firestore, "listings"));
      const cleaned = listingInput(input, user.email!);
      const listing: Listing = {
        ...(cleaned as unknown as ListingInput),
        id: ref.id, sellerId: user.uid, status: "active", createdAt: now(),
      };
      await setDoc(ref, listing);
      return listing;
    },
    async updateListing(listingId, input) {
      const user = requireVerified(firebaseAuth.currentUser);
      const cleaned = listingInput(input, user.email!);
      await runTransaction(firestore, async tx => {
        const ref = doc(firestore, "listings", listingId);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) throw new RuleError("Listing not found.");
        const listing = snapshot.data() as Listing;
        if (listing.sellerId !== user.uid || listing.status !== "active") throw new RuleError("Only the owner can edit active listings.");
        tx.update(ref, {
          ...cleaned,
          photoUrl: input.photoUrl || deleteField(),
          courseCode: input.category === "Textbooks" && input.courseCode?.trim()
            ? input.courseCode.trim().toUpperCase() : deleteField(),
        });
      });
    },
    async removeListing(listingId) {
      const user = requireVerified(firebaseAuth.currentUser);
      await runTransaction(firestore, async tx => {
        const ref = doc(firestore, "listings", listingId);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) throw new RuleError("Listing not found.");
        const listing = snapshot.data() as Listing;
        if (listing.sellerId !== user.uid || listing.status !== "active") throw new RuleError("Only the owner can remove active listings.");
        tx.update(ref, { status: "removed" });
      });
    },
    async toggleSave(listingId) {
      const user = requireVerified(firebaseAuth.currentUser);
      const ref = doc(firestore, "saves", user.uid + "_" + listingId);
      const snap = await getDoc(ref);
      if (snap.exists()) { await deleteDoc(ref); return false; }
      await setDoc(ref, { userId: user.uid, listingId, savedAt: now() });
      return true;
    },

    async startDeal() { return unavailable(); },
    async buyNow() { return unavailable(); },
    async sendMessage() { unavailable(); },
    async payDeal() { unavailable(); },
    async cancelDeal() { unavailable(); },
    async makeOffer() { unavailable(); },
    async acceptOffer() { unavailable(); },
    async declineOffer() { unavailable(); },
    async proposeMeetup() { unavailable(); },
    async acceptMeetup() { unavailable(); },
    async confirmHandoff() { return unavailable(); },
    async newHandoffCode() { unavailable(); },
    async rateDeal() { unavailable(); },
    async markRead() { unavailable(); },
  };
  return (
    <StoreContext value={store}>
      {error && <p role="alert" className="bg-red-700 p-3 text-center text-sm text-white">{error}</p>}
      {children}
    </StoreContext>
  );
}
