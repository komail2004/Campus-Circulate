// Where local mode keeps things. Shared data (listings, deals, …) goes in localStorage so every tab
// sees it; who is signed in goes in sessionStorage so each tab can be a different student.
// A backend replaces this file entirely.

import type { Data } from "../types.ts";

const DATA_PREFIX = "campus-circulate:v2:";
const OLD_PREFIX = "campus-circulate-demo-"; // the class demo's save slots
const SESSION_KEY = "campus-circulate:session";
const COLLECTIONS = ["users", "listings", "deals", "messages", "dealReads", "handoffCodes", "saves"] as const;

export function dataKey(version: string): string {
  return DATA_PREFIX + version;
}

// An in-memory stand-in for when the browser blocks storage, and for tests.
export function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key) {
      return items.get(key) ?? null;
    },
    key(index) {
      return [...items.keys()][index] ?? null;
    },
    removeItem(key) {
      items.delete(key);
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
  };
}

// The browser's storage, or the in-memory stand-in when it's blocked (some privacy modes throw on access).
export function browserStorage(kind: "localStorage" | "sessionStorage"): Storage {
  try {
    return window[kind];
  } catch {
    return memoryStorage();
  }
}

function isData(value: unknown): value is Data {
  return typeof value === "object" && value !== null && COLLECTIONS.every((key) => Array.isArray((value as Record<string, unknown>)[key]));
}

// Older versions' save slots only take up room; storage is small (about 5 MB).
function removeStaleSlots(storage: Storage, keepKey: string) {
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key !== keepKey && (key.startsWith(DATA_PREFIX) || key.startsWith(OLD_PREFIX))) stale.push(key);
  }
  stale.forEach((key) => storage.removeItem(key));
}

export function loadData(storage: Storage, key: string, fresh: () => Data): Data {
  try {
    removeStaleSlots(storage, key);
    const text = storage.getItem(key);
    const saved: unknown = text ? JSON.parse(text) : null;
    if (isData(saved)) return saved;
  } catch {
    // unreadable or corrupt: start fresh
  }
  return fresh();
}

// false means the browser refused (usually storage full), so the app can warn instead of losing work silently.
export function saveData(storage: Storage, key: string, data: Data): boolean {
  try {
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSession(storage: Storage): string | null {
  try {
    return storage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSession(storage: Storage, userId: string | null): void {
  try {
    if (userId) storage.setItem(SESSION_KEY, userId);
    else storage.removeItem(SESSION_KEY);
  } catch {
    // blocked: the student stays signed in until the tab closes
  }
}
