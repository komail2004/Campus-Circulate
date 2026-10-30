import { useEffect, useRef, useState } from "react";
import { useMe, useStore } from "../data/storeContext.ts";
import type { Deal } from "../types.ts";

// In-app messages between the buyer and seller, to plan the meetup.
export default function DealChat({ deal }: { deal: Deal }) {
  const { users, sendMessage } = useStore();
  const me = useMe();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // keep the newest message in view
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [deal.messages.length]);

  function send() {
    if (!draft.trim()) return;
    sendMessage(deal.id, draft);
    setDraft("");
  }

  return (
    <section className="card flex h-80 flex-col">
      <h2 className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">Messages</h2>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {deal.messages.length === 0 && <p className="text-gray-500">No messages yet. Agree on a public spot and a time.</p>}
        {deal.messages.map((message) => {
          const mine = message.senderId === me.id;
          const sender = users.find((u) => u.id === message.senderId);
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded px-3 py-2 ${mine ? "bg-cardinal text-white" : "bg-gray-100"}`}>
                {!mine && <p className="text-xs font-semibold">{sender?.name}</p>}
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-gray-200 p-2"
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" className="field" />
        <button type="submit" disabled={!draft.trim()} className="btn btn-cardinal">
          Send
        </button>
      </form>
    </section>
  );
}
