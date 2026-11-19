import { ClockIcon, MapPinIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { meetupSpots } from "../../data/campus.ts";
import { whyNotAcceptMeetup, whyNotProposeMeetup } from "../../data/rules/index.ts";
import { useStore } from "../../data/storeContext.ts";
import { meetupWhen } from "../../lib/time.ts";
import { useAction } from "../../lib/useAction.ts";
import type { Deal, Listing, User } from "../../types.ts";
import MeetupDialog from "../MeetupDialog.tsx";

// After payment: agree on a public spot and a time.
export default function MeetupPanel({ deal, listing, me, otherName }: { deal: Deal; listing: Listing; me: User; otherName: string }) {
  const store = useStore();
  const { run, error, busy } = useAction();
  const [suggesting, setSuggesting] = useState(false);
  const [now] = useState(() => new Date().toISOString()); // the rule re-checks the time on Accept anyway
  const meetup = deal.meetup;
  const canAccept = !whyNotAcceptMeetup(deal, me.id, now);
  const canPropose = !whyNotProposeMeetup(deal, me.id);

  let heading = "Plan the handoff";
  if (meetup?.agreed) heading = "Meetup agreed";
  else if (meetup) heading = meetup.proposedBy === me.id ? "You suggested a meetup" : `${otherName} suggested a meetup`;

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="font-semibold">{heading}</h2>
      {meetup ? (
        <div className="space-y-2 text-[15px]">
          <p className="flex items-center gap-2.5">
            <MapPinIcon size={18} className="text-muted" />
            {meetup.spot}
          </p>
          <p className="flex items-center gap-2.5">
            <ClockIcon size={18} className="text-muted" />
            {meetupWhen(meetup.time)}
          </p>
        </div>
      ) : (
        <p className="text-[15px] text-body">Pick a busy public spot and a time to meet.</p>
      )}
      {meetup && !meetup.agreed && meetup.proposedBy === me.id && <p className="text-sm text-muted">Waiting for {otherName} to accept.</p>}
      <div className="flex gap-2">
        {canAccept && (
          <button type="button" disabled={busy} onClick={() => run(() => store.acceptMeetup(deal.id))} className="btn btn-brand flex-1">
            Accept
          </button>
        )}
        {canPropose && (
          <button type="button" onClick={() => setSuggesting(true)} className="btn btn-outline flex-1">
            {meetup ? "Suggest another" : "Suggest a meetup"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {suggesting && <MeetupDialog spots={meetupSpots(listing)} onClose={() => setSuggesting(false)} onSubmit={(input) => store.proposeMeetup(deal.id, input)} />}
    </section>
  );
}
