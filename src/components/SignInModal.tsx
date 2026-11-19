import { useState } from "react";
import { localMode } from "../config.ts";
import { campusForEmail, campuses, placesOnCampus } from "../data/campus.ts";
import { friendlyError, isEduEmail } from "../data/rules/index.ts";
import { sampleUsers } from "../data/sample.ts";
import { useStore } from "../data/storeContext.ts";
import { newCode } from "../lib/ids.ts";
import Modal from "./Modal.tsx";

type Mode = "signIn" | "signUp";

// Sign in or create an account: details first, then the 6-digit code from the school email.
// In local mode there's no email service, so the code is shown on screen.
export default function SignInModal({ onClose }: { onClose: () => void }) {
  const { users, signIn, signUp, signInAsSample } = useStore();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dorm, setDorm] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const isSignUp = mode === "signUp";
  const campus = campusForEmail(email);
  const dormOptions = campus ? placesOnCampus(campus.id) : [];
  const chosenDorm = dormOptions.some((p) => p.name === dorm) ? dorm : dormOptions[0]?.name;

  function switchMode() {
    setMode(isSignUp ? "signIn" : "signUp");
    setSentCode("");
    setCode("");
    setError("");
  }

  function sendCode() {
    const exists = users.some((u) => u.email === email.trim().toLowerCase());
    if (isSignUp && !name.trim()) setError("Enter your name.");
    else if (!isEduEmail(email)) setError("CampusCirculate is for students only. Use your .edu email.");
    else if (!isSignUp && !exists) setError("No account uses that email. Create one instead.");
    else if (isSignUp && exists) setError("There's already an account with that email. Sign in instead.");
    else {
      setError("");
      setSentCode(newCode(6));
    }
  }

  async function verify() {
    if (code !== sentCode) return setError("That code doesn't match.");
    try {
      if (isSignUp) await signUp({ name, email, dorm: chosenDorm });
      else await signIn(email);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal title={isSignUp ? "Create an account" : "Sign in"} onClose={onClose}>
      <p className="-mt-2 mb-5 text-sm text-muted">
        {isSignUp ? "Already have an account? " : "New to CampusCirculate? "}
        <button type="button" onClick={switchMode} className="link">
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>

      {!sentCode ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendCode();
          }}
          className="space-y-4"
        >
          {isSignUp && (
            <div>
              <label className="label" htmlFor="signin-name">
                Name
              </label>
              <input id="signin-name" autoFocus autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="signin-email">
              School email
            </label>
            <input
              id="signin-email"
              type="email"
              autoFocus={!isSignUp}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@school.edu"
              className="field"
            />
          </div>
          {isSignUp && campus && (
            <div>
              <label className="label" htmlFor="signin-dorm">
                Your hall at {campus.name}
              </label>
              <select id="signin-dorm" value={chosenDorm} onChange={(e) => setDorm(e.target.value)} className="field">
                {dormOptions.map((place) => (
                  <option key={place.name}>{place.name}</option>
                ))}
              </select>
            </div>
          )}
          {isSignUp && !campus && isEduEmail(email) && (
            <p className="text-sm text-muted">
              Your school isn't on CampusCirculate yet. You can buy from {campuses.map((c) => c.name).join(", ")} students, but you can't sell.
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={!email.trim()} className="btn btn-primary w-full">
            Send code
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-body">We sent a 6-digit code to {email}.</p>
          {localMode && (
            <p className="rounded-lg bg-surface-2 p-3 text-sm">
              Local mode, no email sent. Your code is <span className="font-mono font-medium">{sentCode}</span>
            </p>
          )}
          <div>
            <label className="label" htmlFor="signin-code">
              Code
            </label>
            <input
              id="signin-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              className="field font-mono tracking-[0.3em]"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={code.length !== 6} className="btn btn-primary w-full">
            {isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
      )}

      {localMode && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2 text-sm text-muted">Or try it as a sample student</p>
          <div className="grid grid-cols-2 gap-2">
            {sampleUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  await signInAsSample(u.id);
                  onClose();
                }}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
