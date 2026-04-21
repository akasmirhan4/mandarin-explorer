import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAnthropic, TRANSLATION_MODEL } from "~/server/lib/anthropic";
import { translationResponseSchema } from "~/server/lib/schemas/translation";

function buildPrompt(word: string): string {
  return `You are a Chinese language expert. Return ONLY valid JSON.

Translate "${word}" to simplified Chinese. JSON format:
{"word":"${word}","translations":[{"chinese":"...","pinyin_marks":"nǐ hǎo","meaning":"...","context":"brief","literal_meaning":"char-by-char","topic":"one of: greeting,food,travel,business,nature,emotion,family,number,time,body,weather,shopping,education,general","hsk_level":1,"tags":["daily","formal"],"characters":[{"char":"X","pinyin":"xī","tone":1,"meaning":"...","radical":"R","radical_pinyin":"...","radical_meaning":"...","radical_strokes":3,"total_strokes":8}],"examples":[{"chinese":"...","pinyin":"...","english":"...","words":[{"english":"short gloss","chinese":"word","pinyin_marks":"...","meaning":"...","topic":"...","hsk_level":1,"tags":["..."],"characters":[{"char":"X","pinyin":"...","tone":1,"meaning":"...","radical":"R","radical_pinyin":"...","radical_meaning":"...","radical_strokes":3,"total_strokes":8}]}]}]}]}
Rules: 2 translations, 1 example each. Each example must include "words": every meaningful Chinese word in the sentence (multi-char compounds like 早上 or 朋友 stay as one word; skip punctuation). For each word give a short english gloss (1-3 words), pinyin_marks, meaning, topic, hsk_level, 1-2 tags, and full characters breakdown with radical data. hsk_level: 1-9 based on difficulty. topic: pick the best fit. tags: 2-4 descriptive tags like usage, register, domain. Keep strings short. JSON only.`;
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

export const translateRouter = createTRPCRouter({
  translate: publicProcedure
    .input(z.object({ english: z.string().trim().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const anthropic = getAnthropic();

      let response;
      try {
        response = await anthropic.messages.create({
          model: TRANSLATION_MODEL,
          max_tokens: 8192,
          messages: [{ role: "user", content: buildPrompt(input.english) }],
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

      const parsed = translationResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Model returned invalid shape: ${parsed.error.message}`,
        });
      }

      return parsed.data;
    }),
});
