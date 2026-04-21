import type { VocabWord } from "~/server/db/schema";

export type Grade = "exact" | "close" | "wrong" | "gave_up";
export type ReviewResponse = "wrong" | "hard" | "easy";

export function mapGradeToResponse(grade: Grade): ReviewResponse {
  if (grade === "exact") return "easy";
  if (grade === "close") return "hard";
  return "wrong";
}

function normalizeEnglish(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(to|a|an|the)\s+/, "")
    .trim();
}

function stripParentheticals(s: string): string {
  return s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function expandCandidates(word: Pick<VocabWord, "english" | "meaning">): string[] {
  const raw = [word.english, word.meaning ?? ""]
    .filter(Boolean)
    .flatMap((s) => s.split(/[,;/]/));
  const normalized = raw.flatMap((s) => {
    const full = normalizeEnglish(s);
    const stripped = normalizeEnglish(stripParentheticals(s));
    return [full, stripped];
  }).filter(Boolean);
  return Array.from(new Set(normalized));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost));
    }
    prev = curr;
  }
  return prev[b.length]!;
}

export function gradeMeaning(
  userInput: string,
  word: Pick<VocabWord, "english" | "meaning">,
): Grade {
  const user = normalizeEnglish(userInput);
  if (!user) return "wrong";
  const candidates = expandCandidates(word);
  if (candidates.some((c) => c === user)) return "exact";
  const tolerance = user.length <= 4 ? 1 : 2;
  if (candidates.some((c) => levenshtein(c, user) <= tolerance)) return "close";
  return "wrong";
}

export function gradeTone(
  userPicks: number[],
  word: Pick<VocabWord, "characters">,
): Grade {
  const chars = word.characters ?? [];
  if (!chars.length || userPicks.length !== chars.length) return "wrong";
  const normalize = (n: number) => (n === 0 ? 5 : n);
  const correct = chars.map((c) => normalize(c.tone));
  const picks = userPicks.map(normalize);
  const matches = correct.filter((t, i) => t === picks[i]).length;
  if (matches === correct.length) return "exact";
  if (matches > 0) return "close";
  return "wrong";
}

export function gradeWriting(totalMistakes: number, totalStrokes: number): Grade {
  if (totalMistakes === 0) return "exact";
  const closeThreshold = Math.max(2, Math.floor(totalStrokes * 0.2));
  if (totalMistakes <= closeThreshold) return "close";
  return "wrong";
}
