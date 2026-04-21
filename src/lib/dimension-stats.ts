import { TEST_TYPES, type TestType } from "~/server/db/schema";

export { TEST_TYPES, type TestType };

export const DIM_LABEL: Record<TestType, string> = {
  meaning: "Meaning",
  pinyin: "Pinyin",
  tone: "Tone",
  writing: "Writing",
};

export type DimensionStat = { reviewed: number; correct: number };
export type DimensionStats = Record<TestType, DimensionStat>;
export type DimensionBucket = "untested" | "low" | "mid" | "high";

export function dimensionBucket(stat: DimensionStat): DimensionBucket {
  if (stat.reviewed === 0) return "untested";
  const pct = (stat.correct / stat.reviewed) * 100;
  if (pct < 50) return "low";
  if (pct < 80) return "mid";
  return "high";
}

export function bucketColorClass(bucket: DimensionBucket): string {
  switch (bucket) {
    case "untested":
      return "bg-border";
    case "low":
      return "bg-red";
    case "mid":
      return "bg-gold";
    case "high":
      return "bg-jade";
  }
}

export function accuracyPercent(stat: DimensionStat): number | null {
  if (stat.reviewed === 0) return null;
  return Math.round((stat.correct / stat.reviewed) * 100);
}

export function formatRelativeTime(d: Date | string | null | undefined): string {
  if (!d) return "never";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} wk${week === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr} yr${yr === 1 ? "" : "s"} ago`;
}
