import {
  DIM_LABEL,
  TEST_TYPES,
  accuracyPercent,
  bucketColorClass,
  dimensionBucket,
  type DimensionStats,
} from "~/lib/dimension-stats";
import { cn } from "~/lib/utils";

type Props = {
  stats: DimensionStats;
  className?: string;
};

export function MasteryDimensionsBar({ stats, className }: Props) {
  return (
    <div
      className={cn(
        "bg-border grid h-1.5 w-[60px] grid-cols-4 gap-[1px] overflow-hidden rounded-[3px]",
        className,
      )}
    >
      {TEST_TYPES.map((dim) => {
        const stat = stats[dim];
        const bucket = dimensionBucket(stat);
        const pct = accuracyPercent(stat);
        const label =
          pct === null
            ? `${DIM_LABEL[dim]}: untested`
            : `${DIM_LABEL[dim]}: ${stat.correct}/${stat.reviewed} (${pct}%)`;
        return (
          <span
            key={dim}
            title={label}
            aria-label={label}
            className={cn("h-full", bucketColorClass(bucket))}
          />
        );
      })}
    </div>
  );
}
