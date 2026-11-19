import type { Deal } from "../../types.ts";

const STEPS = ["Paid", "Meetup", "Handoff"];

// Three segments: done ones in navy, the current one in cardinal.
export default function DealProgress({ deal }: { deal: Deal }) {
  const done = deal.status === "completed" ? 3 : deal.status === "held" ? (deal.meetup?.agreed ? 2 : 1) : 0;
  return (
    <ol aria-label="Progress" className="grid grid-cols-3 gap-1.5">
      {STEPS.map((step, i) => (
        <li
          key={step}
          aria-current={i === done ? "step" : undefined}
          className={`flex flex-col gap-2 text-[12.5px] ${i < done ? "font-semibold text-brand" : i === done ? "font-semibold text-accent-text" : "font-medium text-muted"}`}
        >
          <span className={`h-[3px] ${i < done ? "bg-brand" : i === done ? "bg-accent" : "bg-line-strong"}`} />
          {step}
        </li>
      ))}
    </ol>
  );
}
