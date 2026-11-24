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
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  const isSignUp = mode === "signUp";
  const campus = campusForEmail(email);
  const dormOptions = campus ? placesOnCampus(campus.id) : [];
  const chosenDorm = dormOptions.some((p) => p.name === dorm) ? dorm : dormOptions[0]?.name;

  function switchMode() {
    setMode(isSignUp ? "signIn" : "signUp");
    setSentCode("");
    setCode("");
    setError("");
    setPassword("");
    setNotice("");
  }

  async function submitFirebase() {
    setError("");
    try {
      if (isSignUp) {
        await signUp({ name, email, dorm: chosenDorm }, password);
        setNotice("Your account was created. Check your school email for the Firebase verification link. After verifying, return here and sign in.");
      } else {
        await signIn(email, password);
        onClose();
      }
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as {code: unknown}).code) : "";
      if (code === "auth/email-already-in-use") setError("An account already uses that email. Sign in instead.");
      else if (code === "auth/invalid-credential" || code === "auth/wrong-password") setError("Invalid email or password.");
      else if (code === "auth/too-many-requests") setError("Too many attempts. Please try again later.");
      else if (code === "auth/weak-password") setError("Choose a stronger password.");
      else setError(friendlyError(err));
    }
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


      {!localMode ? (
        notice ? (
          <div className="space-y-4">
            <p role="status" className="rounded-lg bg-surface-2 p-4 text-sm text-body">{notice}</p>
            <button type="button" onClick={() => { setNotice(""); setMode("signIn"); setPassword(""); }} className="btn btn-primary w-full">
              Return to sign in
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submitFirebase(); }}>
            {isSignUp && (
              <div>
                <label htmlFor="real-signin-name" className="label">Full name</label>
                <input id="real-signin-name" className="field" autoComplete="name" maxLength={60} required value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="real-signin-email" className="label">School email</label>
              <input id="real-signin-email" type="email" className="field" autoComplete="email" required
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@school.edu" />
            </div>
            {isSignUp && campus && (
              <div>
                <label htmlFor="real-signin-dorm" className="label">Your residence hall</label>
                <select id="real-signin-dorm" className="field" value={chosenDorm} onChange={e => setDorm(e.target.value)}>
                  {dormOptions.map(place => <option key={place.name} value={place.name}>{place.name}</option>)}
                </select>
              </div>
            )}
            {isSignUp && !campus && isEduEmail(email) && (
              <p className="text-sm text-muted">Your school isn't listed yet. You can browse, but only students at supported campuses can post listings.</p>
            )}
            <div>
              <label htmlFor="real-signin-password" className="label">Password</label>
              <input id="real-signin-password" type="password" className="field"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
              {isSignUp && <p className="mt-1 text-xs text-muted">At least 8 characters. A verification email is required before selling.</p>}
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={!email.trim() || password.length < 8} className="btn btn-primary w-full">
              {isSignUp ? "Create account and send verification" : "Sign in"}
            </button>
          </form>
        )
      ) : !sentCode ? (
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
