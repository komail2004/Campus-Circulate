import { useState } from "react";
import { friendlyError } from "../data/rules/index.ts";

// Runs a store action and keeps its error and busy state, so buttons can disable and explain failures.
export function useAction() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return { run, error, busy };
}
