import { useEffect, useState } from "react";
import { isEduEmail } from "../data/actions.ts";
import { useStore } from "../data/storeContext.ts";
import { makeCode } from "../lib/ids.ts";

// Pop-up sign in. Two steps: enter your .edu email -> type the code we "emailed" you.
export default function SignInModal({ onClose }: { onClose: () => void }) {
  const { users, logIn } = useStore();
  const [email, setEmail] = useState("");
  const [sentCode, setSentCode] = useState(""); // empty until a code is "sent"
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // the Escape key closes the window
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function sendCode() {
    if (!isEduEmail(email)) {
      setError("Campus Circulate is for students only. Use your .edu email.");
      return;
    }
    if (!users.some((u) => u.email === email.trim().toLowerCase())) {
      setError("No student account found for that email.");
      return;
    }
    setError("");
    setSentCode(makeCode(6));
  }

  function verify() {
    if (code !== sentCode) {
      setError("That code doesn't match.");
      return;
    }
    logIn(email);
    onClose();
  }

  return (
    // clicking the dark background (but not the window itself) closes it
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="sign-in-title" className="card relative w-full max-w-sm p-6 shadow-lg">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 px-2 text-xl text-gray-500 hover:text-gray-900">
          ×
        </button>
        <h2 id="sign-in-title" className="text-xl font-bold">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-gray-600">Students only. Use your .edu email.</p>

        {!sentCode ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendCode();
            }}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="label" htmlFor="email">
                School email
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@school.edu"
                className="field"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!email.trim()} className="btn btn-primary w-full">
              Send verification code
            </button>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              verify();
            }}
            className="mt-5 space-y-4"
          >
            <p className="text-sm">We sent a 6-digit code to {email}.</p>
            <p className="rounded bg-gray-100 p-3 text-sm">
              Demo inbox: your code is <strong className="font-mono">{sentCode}</strong>
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="Enter code"
              aria-label="Verification code"
              className="field font-mono tracking-widest"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">
              Verify and sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
