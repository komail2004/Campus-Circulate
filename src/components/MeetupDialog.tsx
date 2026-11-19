import { useState } from "react";
import { MEETUP_WINDOW_DAYS, type MeetupInput } from "../data/rules/index.ts";
import { addDays, fromLocalInput, toLocalInput } from "../lib/time.ts";
import { useAction } from "../lib/useAction.ts";
import Modal from "./Modal.tsx";

// Suggest a public spot and a time in the next two weeks.
export default function MeetupDialog({ spots, onSubmit, onClose }: { spots: string[]; onSubmit: (input: MeetupInput) => Promise<unknown>; onClose: () => void }) {
  const [now] = useState(() => new Date().toISOString()); // read the clock once, not on every render
  const [spot, setSpot] = useState(spots[0] ?? "");
  const [when, setWhen] = useState(() => toLocalInput(addDays(now, 1)).slice(0, 14) + "00"); // tomorrow, on the hour
  const { run, error, busy } = useAction();

  return (
    <Modal title="Suggest a meetup" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await onSubmit({ spot, time: fromLocalInput(when) });
            onClose();
          });
        }}
      >
        <div>
          <label className="label" htmlFor="meetup-spot">
            Where
          </label>
          <select id="meetup-spot" value={spot} onChange={(e) => setSpot(e.target.value)} className="field">
            {spots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-muted">Busy, public places only.</p>
        </div>
        <div>
          <label className="label" htmlFor="meetup-time">
            When
          </label>
          <input
            id="meetup-time"
            type="datetime-local"
            required
            value={when}
            min={toLocalInput(now)}
            max={toLocalInput(addDays(now, MEETUP_WINDOW_DAYS))}
            onChange={(e) => setWhen(e.target.value)}
            className="field"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy || !when} className="btn btn-brand w-full">
          Suggest this time
        </button>
      </form>
    </Modal>
  );
}
