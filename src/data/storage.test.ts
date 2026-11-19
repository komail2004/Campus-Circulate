import { describe, expect, it } from "vitest";
import { someData } from "../test/fixtures.ts";
import type { Data } from "../types.ts";
import { dataKey, loadData, loadSession, memoryStorage, saveData, saveSession } from "./storage.ts";

const KEY = dataKey("abc");
const empty = (): Data => ({ users: [], listings: [], deals: [], messages: [], dealReads: [], handoffCodes: [], saves: [] });

describe("storage", () => {
  it("round-trips saved data", () => {
    const storage = memoryStorage();
    expect(saveData(storage, KEY, someData())).toBe(true);
    expect(loadData(storage, KEY, empty)).toEqual(someData());
  });

  it("starts fresh when nothing is saved, the save is corrupt, or it's an old shape", () => {
    const storage = memoryStorage();
    expect(loadData(storage, KEY, empty)).toEqual(empty());
    storage.setItem(KEY, "{not json");
    expect(loadData(storage, KEY, empty)).toEqual(empty());
    storage.setItem(KEY, JSON.stringify({ users: [], listings: [], deals: [] }));
    expect(loadData(storage, KEY, empty)).toEqual(empty());
  });

  it("reports when the browser refuses to save", () => {
    const full = memoryStorage();
    full.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(saveData(full, KEY, someData())).toBe(false);
  });

  it("clears out old save slots to free space, and nothing else", () => {
    const storage = memoryStorage();
    storage.setItem("campus-circulate-demo-123", "old");
    storage.setItem(dataKey("older"), "old");
    storage.setItem("campus-circulate-theme", "dark");
    loadData(storage, KEY, empty);
    expect(storage.getItem("campus-circulate-demo-123")).toBeNull();
    expect(storage.getItem(dataKey("older"))).toBeNull();
    expect(storage.getItem("campus-circulate-theme")).toBe("dark");
  });

  it("remembers who is signed in", () => {
    const session = memoryStorage();
    saveSession(session, "u1");
    expect(loadSession(session)).toBe("u1");
    saveSession(session, null);
    expect(loadSession(session)).toBeNull();
  });
});
