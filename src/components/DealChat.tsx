import { useEffect, useRef, useState } from "react";
import { friendlyError, MESSAGE_MAX } from "../data/rules/index.ts";
import { messagesForDeal, nameOf } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import type { Deal } from "../types.ts";

// In-app messages between the buyer and seller, plus gray event lines ("Bob Smith paid $20").
export default function DealChat({ deal }: { deal: Deal }) {
  const store = useStore();
  const me = useMe();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesForDeal(store, deal.id);
  const canSend = deal.status === "open" || deal.status === "held";

  // keep the newest message in view
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length]);

  async function send() {
    if (!draft.trim()) return;
    try {
      await store.sendMessage(deal.id, draft);
      setDraft("");
      setError("");
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <section className="card flex h-80 flex-col">
      <h2 className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">Messages</h2>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {!messages.some((m) => m.kind === "text") && <p className="text-gray-500">No messages yet. Agree on a public spot and a time.</p>}
        {messages.map((message) => {
          if (message.kind === "event") {
            return (
              <p key={message.id} className="text-center text-xs text-gray-500">
                {message.text}
              </p>
            );
          }
          const mine = message.senderId === me.id;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded px-3 py-2 ${mine ? "bg-cardinal text-white" : "bg-gray-100"}`}>
                {!mine && <p className="text-xs font-semibold">{nameOf(store, message.senderId ?? "")}</p>}
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      {canSend && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex gap-2 border-t border-gray-200 p-2"
        >
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MESSAGE_MAX} placeholder="Write a message" aria-label="Message" className="field" />
          <button type="submit" disabled={!draft.trim()} className="btn btn-cardinal">
            Send
          </button>
        </form>
      )}
      {error && <p className="px-3 pb-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
