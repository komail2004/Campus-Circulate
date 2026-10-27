import { useEffect, useState } from "react";
import { isEduEmail } from "../data/actions.ts";
import { campusForEmail, campuses, placesOnCampus } from "../data/places.ts";
import { useStore } from "../data/storeContext.ts";
import { makeCode } from "../lib/ids.ts";

type Mode = "signIn" | "signUp";

// Pop-up for signing in or creating an account.
// Two steps either way: fill in your details -> type the code we "emailed" you.
export default function SignInModal({ onClose }: { onClose: () => void }) {
  const { users, logIn, signUp } = useStore();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dorm, setDorm] = useState("");
  const [sentCode, setSentCode] = useState(""); // empty until a code is "sent"
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // the dorm list follows the email: a cofc.edu email gets College of Charleston halls
  const campus = campusForEmail(email);
  const dormOptions = campus ? placesOnCampus(campus.id) : [];
  const chosenDorm = dormOptions.some((p) => p.name === dorm) ? dorm : dormOptions[0]?.name;

  // the Escape key closes the window
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function switchMode(next: Mode) {
    setMode(next);
    setSentCode("");
    setCode("");
    setError("");
  }

  function sendCode() {
    if (mode === "signUp" && !name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!isEduEmail(email)) {
      setError("CampusCirculate is for students only. Use your .edu email.");
      return;
    }
    const exists = users.some((u) => u.email === email.trim().toLowerCase());
    if (mode === "signIn" && !exists) {
      setError("No student account found for that email. Create an account instead.");
      return;
    }
    if (mode === "signUp" && exists) {
      setError("There's already an account with that email. Sign in instead.");
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
    if (mode === "signUp") signUp(name, email, chosenDorm);
    else logIn(email);
    onClose();
  }

  const isSignUp = mode === "signUp";

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
          {isSignUp ? "Create an account" : "Sign in"}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {isSignUp ? "Already have an account? " : "New to CampusCirculate? "}
          <button type="button" onClick={() => switchMode(isSignUp ? "signIn" : "signUp")} className="text-blue-700 hover:underline">
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>

        {!sentCode ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendCode();
            }}
            className="mt-5 space-y-4"
          >
            {isSignUp && (
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(""); // an old error shouldn't stick around once you fix the field
                  }}
                  className="field"
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">
                School email
              </label>
              <input
                id="email"
                type="email"
                autoFocus={!isSignUp}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="you@school.edu"
                className="field"
              />
            </div>
            {isSignUp && campus && (
              <div>
                <label className="label" htmlFor="dorm">
                  Your dorm at {campus.name}
                </label>
                <select id="dorm" value={chosenDorm} onChange={(event) => setDorm(event.target.value)} className="field">
                  {dormOptions.map((place) => (
                    <option key={place.name}>{place.name}</option>
                  ))}
                </select>
              </div>
            )}
            {isSignUp && !campus && isEduEmail(email) && (
              <p className="text-sm text-gray-600">
                Your school isn't on CampusCirculate yet. You can still buy from {campuses.map((c) => c.name).join(", ")} students, but
                you can't sell.
              </p>
            )}
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
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="Enter code"
              aria-label="Verification code"
              className="field font-mono tracking-widest"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">
              {isSignUp ? "Verify and create account" : "Verify and sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
