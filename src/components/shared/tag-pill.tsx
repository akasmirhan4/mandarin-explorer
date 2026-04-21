import { cn } from "~/lib/utils";

type Variant = "topic" | "hsk" | "custom";

const VARIANTS: Record<Variant, string> = {
  topic: "bg-[var(--blue-soft)] text-blue",
  hsk: "bg-[var(--gold-soft)] text-gold",
  custom: "bg-background text-text2 border border-border",
};

export function TagPill({
  children,
  variant = "custom",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[9px] font-bold",
        VARIANTS[variant],
      )}
    >
      {children}
    </span>
  );
}
