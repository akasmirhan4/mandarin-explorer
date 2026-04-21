export type ReviewResponse = "wrong" | "hard" | "easy";

export interface SrsUpdate {
  mastery: number;
  nextReview: Date;
}

export function applyReview(
  currentMastery: number,
  response: ReviewResponse,
): SrsUpdate {
  const m = currentMastery ?? 0;
  const nextReview = new Date();
  let mastery = m;

  if (response === "easy") {
    mastery = Math.min(5, m + 1);
    nextReview.setDate(nextReview.getDate() + Math.pow(2, mastery));
  } else if (response === "hard") {
    nextReview.setDate(nextReview.getDate() + 1);
  } else {
    mastery = Math.max(0, m - 1);
    nextReview.setHours(nextReview.getHours() + 1);
  }

  return { mastery, nextReview };
}
