import { useState } from "react";
import { campusForEmail, placesOnCampus } from "../data/campus.ts";
import { friendlyError, isEduEmail } from "../data/rules/index.ts";
import { sampleUsers } from "../data/sample.ts";
import { useStore } from "../data/storeContext.ts";
import Modal from "./Modal.tsx";

// Classroom simulation: no email sent and no genuine identity verification.
export default function SignInModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, signInAsSample } = useStore();
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dorm, setDorm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const campus = campusForEmail(email);
  const dorms = campus ? placesOnCampus(campus.id) : [];
  const chosenDorm = dorms.some(h => h.name === dorm) ? dorm : dorms[0]?.name;

  async function submit() {
    setError("");
    setBusy(true);
    try {
      if (create) await signUp({ name, email, dorm: chosenDorm });
      else await signIn(email);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function choose(id: string) {
    setError("");
    setBusy(true);
    try {
      await signInAsSample(id);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={create ? "Create your demo account" : "Welcome to CampusCirculate"} onClose={onClose}>
      <div className="mb-5 rounded-xl border border-line bg-surface-2 p-3 text-sm text-body">
        <p className="font-semibold text-ink">Classroom demonstration</p>
        <p className="mt-1">No real email or payments. Accounts, purchases and messages are simulated in this browser.</p>
      </div>
      {!create && (
        <section className="mb-5">
          <p className="mb-3 text-sm font-semibold">Jump into the demo</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sampleUsers.map(user => (
              <button key={user.id} type="button" disabled={busy}
                onClick={() => void choose(user.id)}
                className="btn btn-outline min-h-14 flex-col gap-0.5">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted">{user.id === "u2" ? "Seller account" : "Buyer account"}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4 border-t border-line pt-5">
        <h3 className="font-semibold">{create ? "Create a student profile" : "Sign in with a demo email"}</h3>
        {create && (
          <div>
            <label className="label" htmlFor="demo-name">Name</label>
            <input className="field" id="demo-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="demo-email">School email</label>
          <input className="field" id="demo-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="student@g.cofc.edu"/>
        </div>
        {create && campus && (
          <div>
            <label className="label" htmlFor="demo-hall">Residence hall</label>
            <select className="field" id="demo-hall" value={chosenDorm} onChange={e => setDorm(e.target.value)}>
              {dorms.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
            </select>
          </div>
        )}
        {create && !campus && isEduEmail(email) && <p className="text-sm text-muted">You can explore, but selling is currently limited to College of Charleston.</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy || !email.trim() || (create && !name.trim())} className="btn btn-primary w-full">
          {create ? "Create demo profile" : "Sign in locally"}
        </button>
        <button type="button" className="link block w-full text-center text-sm" onClick={() => { setCreate(!create); setError(""); }}>
          {create ? "Have a profile? Sign in" : "Need an account? Create a demo profile"}
        </button>
      </form>
    </Modal>
  );
}
