import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { vocabWords } from "~/server/db/schema";
import { getAnthropic, TRANSLATION_MODEL } from "~/server/lib/anthropic";
import {
  exampleSentenceSchema,
  translationOptionSchema,
} from "~/server/lib/schemas/translation";
import type { ExampleSentenceInput } from "~/server/lib/schemas/translation";

const generateExamplesResponseSchema = z.object({
  examples: z.array(exampleSentenceSchema).min(1),
});

const reviewMeaningResponseSchema = z.object({
  is_valid: z.boolean(),
  feedback: z.string(),
  suggested_english: z.string(),
  suggested_meaning: z.string(),
});

function buildReviewMeaningPrompt(
  chinese: string,
  pinyin: string,
  english: string,
  meaning: string,
  userAnswer: string,
): string {
  return `You are a Chinese-English translation expert. Return ONLY valid JSON.

Chinese word: "${chinese}" (pinyin: ${pinyin})
Current stored english: "${english}"
Current stored meaning: "${meaning}"
User's answer: "${userAnswer}"

Decide whether the user's answer is a valid English translation of the Chinese word. Accept close synonyms, informal variants, and partial but correct renderings. Reject unrelated or clearly wrong answers.

If the answer is valid AND captures a nuance or synonym not already reflected in the stored english/meaning, propose an updated english and meaning that incorporates it (keep it concise — english is a short gloss, meaning is a slightly richer definition). Otherwise return the existing english and meaning unchanged.

JSON format:
{"is_valid": true|false, "feedback": "1-2 sentence explanation for the user", "suggested_english": "...", "suggested_meaning": "..."}`;
}

function buildExamplesPrompt(
  chinese: string,
  pinyin: string,
  meaning: string,
  existing: string[],
  count: number,
): string {
  const avoid = existing.length
    ? `\nDo NOT repeat any of these existing sentences (write new, different ones):\n${existing.map((s) => `- ${s}`).join("\n")}`
    : "";
  return `You are a Chinese language expert. Return ONLY valid JSON.

Generate ${count} new example sentence(s) that naturally use the Chinese word "${chinese}" (pinyin: ${pinyin}, meaning: ${meaning}). Vary the context, register, and grammar.${avoid}

JSON format:
{"examples":[{"chinese":"...","pinyin":"...","english":"...","words":[{"english":"short gloss","chinese":"word","pinyin_marks":"...","meaning":"...","topic":"...","hsk_level":1,"tags":["..."],"characters":[{"char":"X","pinyin":"...","tone":1,"meaning":"...","radical":"R","radical_pinyin":"...","radical_meaning":"...","radical_strokes":3,"total_strokes":8}]}]}]}
Rules: every meaningful Chinese word in the sentence (multi-char compounds like 早上 or 朋友 stay as one word; skip punctuation). For each word give a short english gloss (1-3 words), pinyin_marks, meaning, topic, hsk_level, 1-2 tags, and full characters breakdown with radical data. hsk_level: 1-9 based on difficulty. Keep strings short. JSON only.`;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const listInputSchema = z.object({
  topic: z.string().optional(),
  tone: z.number().int().min(1).max(5).optional(),
  masteryBucket: z.enum(["new", "learning", "reviewing", "mastered"]).optional(),
  hskLevel: z
    .enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "none"])
    .optional(),
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
      const toneMarks = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ";
      const toneBases = "aaaaeeeeiiiioooouuuuuuuuuAAAAEEEEIIIIOOOOUUUUUUUUU";
      const stripped = input.search.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const strippedPattern = `%${stripped}%`;
      conditions.push(
        or(
          ilike(vocabWords.english, pattern),
          ilike(vocabWords.chinese, pattern),
          ilike(vocabWords.pinyin, pattern),
          sql`translate(${vocabWords.pinyin}, ${toneMarks}, ${toneBases}) ILIKE ${strippedPattern}`,
          sql`EXISTS (
            SELECT 1 FROM unnest(${vocabWords.tags}) AS tag
            WHERE tag ILIKE ${pattern}
          )`,
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

    if (input.hskLevel === "none") {
      conditions.push(sql`${vocabWords.hskLevel} IS NULL`);
    } else if (input.hskLevel !== undefined) {
      conditions.push(eq(vocabWords.hskLevel, Number(input.hskLevel)));
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
            eq(vocabWords.chinese, translation.chinese),
            eq(vocabWords.pinyin, translation.pinyin_marks),
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

  updateDefinition: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        english: z.string().min(1),
        meaning: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(vocabWords)
        .set({
          english: input.english,
          meaning: input.meaning,
          updatedAt: new Date(),
        })
        .where(eq(vocabWords.id, input.id));
      return { ok: true };
    }),

  reviewMeaning: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        userAnswer: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [word] = await ctx.db
        .select({
          chinese: vocabWords.chinese,
          pinyin: vocabWords.pinyin,
          english: vocabWords.english,
          meaning: vocabWords.meaning,
        })
        .from(vocabWords)
        .where(eq(vocabWords.id, input.id))
        .limit(1);

      if (!word) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Word not found" });
      }

      const anthropic = getAnthropic();

      let response;
      try {
        response = await anthropic.messages.create({
          model: TRANSLATION_MODEL,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: buildReviewMeaningPrompt(
                word.chinese,
                word.pinyin,
                word.english,
                word.meaning ?? "",
                input.userAnswer,
              ),
            },
          ],
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Anthropic request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }

      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");

      const raw = extractJson(text);
      if (!raw) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not parse model output: ${text.slice(0, 200)}`,
        });
      }

      const parsed = reviewMeaningResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Model returned invalid shape: ${parsed.error.message}`,
        });
      }

      return {
        isValid: parsed.data.is_valid,
        feedback: parsed.data.feedback,
        suggestedEnglish: parsed.data.suggested_english,
        suggestedMeaning: parsed.data.suggested_meaning,
        currentEnglish: word.english,
        currentMeaning: word.meaning ?? "",
      };
    }),

  generateExamples: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        count: z.number().int().min(1).max(3).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [word] = await ctx.db
        .select({
          id: vocabWords.id,
          chinese: vocabWords.chinese,
          pinyin: vocabWords.pinyin,
          meaning: vocabWords.meaning,
          examples: vocabWords.examples,
        })
        .from(vocabWords)
        .where(eq(vocabWords.id, input.id))
        .limit(1);

      if (!word) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Word not found" });
      }

      const existing = (word.examples ?? []) as ExampleSentenceInput[];
      const anthropic = getAnthropic();

      let response;
      try {
        response = await anthropic.messages.create({
          model: TRANSLATION_MODEL,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: buildExamplesPrompt(
                word.chinese,
                word.pinyin,
                word.meaning ?? "",
                existing.map((e) => e.chinese),
                input.count,
              ),
            },
          ],
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Anthropic request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }

      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");

      const raw = extractJson(text);
      if (!raw) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not parse model output: ${text.slice(0, 200)}`,
        });
      }

      const parsed = generateExamplesResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Model returned invalid shape: ${parsed.error.message}`,
        });
      }

      const seen = new Set(existing.map((e) => e.chinese));
      const fresh = parsed.data.examples.filter((e) => !seen.has(e.chinese));
      if (fresh.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Model returned only duplicate examples, try again",
        });
      }

      const next = [...existing, ...fresh];

      await ctx.db
        .update(vocabWords)
        .set({ examples: next, updatedAt: new Date() })
        .where(eq(vocabWords.id, input.id));

      const innerSeen = new Set<string>();
      let addedWords = 0;
      for (const ex of fresh) {
        for (const w of ex.words) {
          if (!w.english || !w.chinese) continue;
          const key = `${w.chinese}|${w.pinyin_marks}`;
          if (innerSeen.has(key)) continue;
          innerSeen.add(key);

          const dup = await ctx.db
            .select({ id: vocabWords.id })
            .from(vocabWords)
            .where(
              and(
                eq(vocabWords.chinese, w.chinese),
                eq(vocabWords.pinyin, w.pinyin_marks),
              ),
            )
            .limit(1);

          if (dup.length > 0) continue;

          await ctx.db.insert(vocabWords).values({
            english: w.english,
            chinese: w.chinese,
            pinyin: w.pinyin_marks,
            meaning: w.meaning,
            literalMeaning: w.literal_meaning,
            context: w.context,
            topic: w.topic,
            hskLevel: w.hsk_level ?? null,
            tags: w.tags,
            characters: w.characters,
            examples: [],
          });
          addedWords++;
        }
      }

      return { added: fresh, addedWords, examples: next };
    }),
});
