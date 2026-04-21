import { z } from "zod";

export const characterDataSchema = z.object({
  char: z.string(),
  pinyin: z.string(),
  tone: z.number().int().min(0).max(5),
  meaning: z.string(),
  radical: z.string(),
  radical_pinyin: z.string(),
  radical_meaning: z.string(),
  radical_strokes: z.number().int(),
  total_strokes: z.number().int(),
});

export const exampleSentenceSchema = z.object({
  chinese: z.string(),
  pinyin: z.string(),
  english: z.string(),
});

export const translationOptionSchema = z.object({
  chinese: z.string(),
  pinyin_marks: z.string(),
  meaning: z.string(),
  context: z.string().optional().default(""),
  literal_meaning: z.string().optional().default(""),
  topic: z.string().default("general"),
  hsk_level: z.number().int().min(1).max(9).nullable().optional(),
  tags: z.array(z.string()).default([]),
  characters: z.array(characterDataSchema).default([]),
  examples: z.array(exampleSentenceSchema).default([]),
});

export const translationResponseSchema = z.object({
  word: z.string(),
  translations: z.array(translationOptionSchema).min(1),
});

export type CharacterDataInput = z.infer<typeof characterDataSchema>;
export type ExampleSentenceInput = z.infer<typeof exampleSentenceSchema>;
export type TranslationOption = z.infer<typeof translationOptionSchema>;
export type TranslationResponse = z.infer<typeof translationResponseSchema>;
