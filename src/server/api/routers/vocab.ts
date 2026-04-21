import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { vocabWords } from "~/server/db/schema";
import { translationOptionSchema } from "~/server/lib/schemas/translation";

const listInputSchema = z.object({
  topic: z.string().optional(),
  tone: z.number().int().min(1).max(5).optional(),
  masteryBucket: z.enum(["new", "learning", "reviewing", "mastered"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(200),
  offset: z.number().int().min(0).default(0),
});

export const vocabRouter = createTRPCRouter({
  list: publicProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const conditions = [] as ReturnType<typeof eq>[];

    if (input.topic) conditions.push(eq(vocabWords.topic, input.topic));

    if (input.masteryBucket === "new") {
      conditions.push(eq(vocabWords.mastery, 0));
    } else if (input.masteryBucket === "learning") {
      conditions.push(eq(vocabWords.mastery, 1));
    } else if (input.masteryBucket === "reviewing") {
      conditions.push(
        sql`${vocabWords.mastery} >= 2 AND ${vocabWords.mastery} < 4`,
      );
    } else if (input.masteryBucket === "mastered") {
      conditions.push(sql`${vocabWords.mastery} >= 4`);
    }

    if (input.search) {
      const pattern = `%${input.search}%`;
      conditions.push(
        or(
          ilike(vocabWords.english, pattern),
          ilike(vocabWords.chinese, pattern),
          ilike(vocabWords.pinyin, pattern),
        )!,
      );
    }

    if (input.tone !== undefined) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${vocabWords.characters}) AS c
          WHERE (c->>'tone')::int = ${input.tone}
        )`,
      );
    }

    const rows = await ctx.db
      .select()
      .from(vocabWords)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vocabWords.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return rows;
  }),

  count: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(vocabWords);
    return row?.count ?? 0;
  }),

  create: publicProcedure
    .input(
      z.object({
        english: z.string().min(1),
        translation: translationOptionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { english, translation } = input;

      const existing = await ctx.db
        .select({ id: vocabWords.id })
        .from(vocabWords)
        .where(
          and(
            eq(vocabWords.english, english),
            eq(vocabWords.chinese, translation.chinese),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return { id: existing[0]!.id, created: false };
      }

      const [row] = await ctx.db
        .insert(vocabWords)
        .values({
          english,
          chinese: translation.chinese,
          pinyin: translation.pinyin_marks,
          meaning: translation.meaning,
          literalMeaning: translation.literal_meaning,
          context: translation.context,
          topic: translation.topic,
          hskLevel: translation.hsk_level ?? null,
          tags: translation.tags,
          characters: translation.characters,
          examples: translation.examples,
        })
        .returning({ id: vocabWords.id });

      return { id: row!.id, created: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(vocabWords).where(eq(vocabWords.id, input.id));
      return { ok: true };
    }),

  getDueForReview: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(vocabWords)
        .orderBy(asc(vocabWords.mastery), asc(vocabWords.nextReview))
        .limit(input.limit);
      return rows;
    }),

  toggleStar: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(vocabWords)
        .set({ isStarred: sql`NOT ${vocabWords.isStarred}` })
        .where(eq(vocabWords.id, input.id));
      return { ok: true };
    }),
});
