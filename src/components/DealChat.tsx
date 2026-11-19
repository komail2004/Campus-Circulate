import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { MESSAGE_MAX } from "../data/rules/index.ts";
import { messagesForDeal } from "../data/selectors.ts";
import { useMe, useStore } from "../data/storeContext.ts";
import { messageWhen } from "../lib/time.ts";
import { useAction } from "../lib/useAction.ts";
import type { Deal } from "../types.ts";

// The thread: messages between buyer and seller, plus small gray lines for what happened.
export default function DealChat({ deal, otherName }: { deal: Deal; otherName: string }) {
  const store = useStore();
  const me = useMe();
  const [draft, setDraft] = useState("");
  const { run, error, busy } = useAction();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesForDeal(store, deal.id);
  const open = deal.status === "open" || deal.status === "held";

  // keep the newest message in view
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length]);

  return (
    <section className="panel flex flex-col">
      <h2 className="border-b border-line px-4 py-3 font-semibold">Messages</h2>
      <div ref={scrollRef} className="max-h-[60vh] min-h-64 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[14.5px]">
        {open && !messages.some((m) => m.kind === "text") && <p className="text-sm text-muted">Say hi to {otherName}. Questions about the item go here.</p>}
        {messages.map((m) =>
          m.kind === "event" ? (
            <p key={m.id} className="text-center text-xs text-muted">
              {m.text} <span className="whitespace-nowrap">{messageWhen(m.sentAt)}</span>
            </p>
          ) : (
            <div key={m.id} className={`flex max-w-[82%] flex-col gap-1 ${m.senderId === me.id ? "ml-auto items-end" : "items-start"}`}>
              <p
                className={`px-3 py-2 leading-snug break-words ${
                  m.senderId === me.id ? "rounded-[12px_12px_4px_12px] bg-brand-solid text-white" : "rounded-[12px_12px_12px_4px] bg-surface-2 text-ink"
                }`}
              >
                {m.text}
              </p>
              <span className="text-[11.5px] text-muted">
                {m.senderId === me.id ? "" : `${otherName}, `}
                {messageWhen(m.sentAt)}
              </span>
            </div>
          ),
        )}
      </div>
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim())
              void run(async () => {
                await store.sendMessage(deal.id, draft);
                setDraft("");
              });
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MESSAGE_MAX} placeholder={`Message ${otherName}`} className="field" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="btn btn-brand shrink-0 px-3.5">
            <PaperPlaneRightIcon size={19} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line px-4 py-3 text-sm text-muted">This conversation is closed.</p>
      )}
      {error && <p className="px-4 pb-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
