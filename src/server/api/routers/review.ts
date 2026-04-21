import { eq, sql, type AnyColumn } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  reviewLog,
  TEST_TYPES,
  vocabWords,
  type TestType,
} from "~/server/db/schema";
import { applyReview } from "~/server/lib/srs";

type DimMapping = {
  reviewedCol: AnyColumn;
  correctCol: AnyColumn;
  reviewedKey: "meaningReviewed" | "pinyinReviewed" | "toneReviewed" | "writingReviewed";
  correctKey: "meaningCorrect" | "pinyinCorrect" | "toneCorrect" | "writingCorrect";
  lastReviewedKey:
    | "meaningLastReviewed"
    | "pinyinLastReviewed"
    | "toneLastReviewed"
    | "writingLastReviewed";
};

const DIM_COLUMNS: Record<TestType, DimMapping> = {
  meaning: {
    reviewedCol: vocabWords.meaningReviewed,
    correctCol: vocabWords.meaningCorrect,
    reviewedKey: "meaningReviewed",
    correctKey: "meaningCorrect",
    lastReviewedKey: "meaningLastReviewed",
  },
  pinyin: {
    reviewedCol: vocabWords.pinyinReviewed,
    correctCol: vocabWords.pinyinCorrect,
    reviewedKey: "pinyinReviewed",
    correctKey: "pinyinCorrect",
    lastReviewedKey: "pinyinLastReviewed",
  },
  tone: {
    reviewedCol: vocabWords.toneReviewed,
    correctCol: vocabWords.toneCorrect,
    reviewedKey: "toneReviewed",
    correctKey: "toneCorrect",
    lastReviewedKey: "toneLastReviewed",
  },
  writing: {
    reviewedCol: vocabWords.writingReviewed,
    correctCol: vocabWords.writingCorrect,
    reviewedKey: "writingReviewed",
    correctKey: "writingCorrect",
    lastReviewedKey: "writingLastReviewed",
  },
};

export const reviewRouter = createTRPCRouter({
  submitReview: publicProcedure
    .input(
      z.object({
        wordId: z.string().uuid(),
        response: z.enum(["wrong", "hard", "easy"]),
        testType: z.enum(TEST_TYPES).optional(),
        responseTimeMs: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [word] = await ctx.db
        .select({ mastery: vocabWords.mastery })
        .from(vocabWords)
        .where(eq(vocabWords.id, input.wordId))
        .limit(1);

      if (!word) {
        throw new Error("Word not found");
      }

      const wasCorrect = input.response !== "wrong";
      const { mastery, nextReview } = applyReview(
        word.mastery ?? 0,
        input.response,
      );
      const now = new Date();

      const perDim = input.testType
        ? (() => {
            const m = DIM_COLUMNS[input.testType];
            return {
              [m.reviewedKey]: sql`${m.reviewedCol} + 1`,
              [m.correctKey]: sql`${m.correctCol} + ${wasCorrect ? 1 : 0}`,
              [m.lastReviewedKey]: now,
            };
          })()
        : {};

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(vocabWords)
          .set({
            mastery,
            timesReviewed: sql`COALESCE(${vocabWords.timesReviewed}, 0) + 1`,
            timesCorrect: sql`COALESCE(${vocabWords.timesCorrect}, 0) + ${
              wasCorrect ? 1 : 0
            }`,
            lastReviewed: now,
            nextReview,
            ...perDim,
          })
          .where(eq(vocabWords.id, input.wordId));

        await tx.insert(reviewLog).values({
          wordId: input.wordId,
          wasCorrect,
          responseTimeMs: input.responseTimeMs,
          reviewMode: "flashcard",
          testType: input.testType ?? null,
        });
      });

      return { ok: true, mastery, nextReview };
    }),
});
