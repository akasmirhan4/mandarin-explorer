import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type Variant = "topic" | "hsk" | "custom";

const VARIANT_CLASSES: Record<Variant, string> = {
  topic: "bg-[var(--blue-soft)] text-blue border-transparent",
  hsk: "bg-[var(--gold-soft)] text-gold border-transparent",
  custom: "bg-background text-text2 border-border",
};

export function TagPill({
  children,
  variant = "custom",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <Badge
      variant={variant === "custom" ? "outline" : "secondary"}
      className={cn(
        "h-auto rounded-md border px-2 py-0.5 text-[9px] font-bold",
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </Badge>
  );
}
