import { cn } from "~/lib/utils";

const TONE_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "neutral",
};

const TONE_CLASSES: Record<number, string> = {
  1: "bg-[var(--tone-1-bg)] text-[var(--tone-1-fg)]",
  2: "bg-[var(--tone-2-bg)] text-[var(--tone-2-fg)]",
  3: "bg-[var(--tone-3-bg)] text-[var(--tone-3-fg)]",
  4: "bg-[var(--tone-4-bg)] text-[var(--tone-4-fg)]",
  5: "bg-[var(--tone-5-bg)] text-[var(--tone-5-fg)]",
};

export function ToneBadge({ tone }: { tone: number }) {
  const safeTone = TONE_CLASSES[tone] ? tone : 1;
  return (
    <span
      className={cn(
        "rounded-[7px] px-2 py-[3px] text-[9px] font-bold whitespace-nowrap",
        TONE_CLASSES[safeTone],
      )}
    >
      {TONE_LABELS[safeTone]} tone
    </span>
  );
}
