import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reviewLog, vocabWords } from "~/server/db/schema";
import { applyReview } from "~/server/lib/srs";

export const reviewRouter = createTRPCRouter({
  submitReview: publicProcedure
    .input(
      z.object({
        wordId: z.string().uuid(),
        response: z.enum(["wrong", "hard", "easy"]),
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

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(vocabWords)
          .set({
            mastery,
            timesReviewed: sql`COALESCE(${vocabWords.timesReviewed}, 0) + 1`,
            timesCorrect: sql`COALESCE(${vocabWords.timesCorrect}, 0) + ${
              wasCorrect ? 1 : 0
            }`,
            lastReviewed: new Date(),
            nextReview,
          })
          .where(eq(vocabWords.id, input.wordId));

        await tx.insert(reviewLog).values({
          wordId: input.wordId,
          wasCorrect,
          responseTimeMs: input.responseTimeMs,
          reviewMode: "flashcard",
        });
      });

      return { ok: true, mastery, nextReview };
    }),
});
