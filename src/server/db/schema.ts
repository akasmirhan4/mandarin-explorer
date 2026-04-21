import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { CharacterData, ExampleSentence } from "./types";

export const vocabWords = pgTable(
  "vocab_words",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    english: text("english").notNull(),
    chinese: text("chinese").notNull(),
    pinyin: text("pinyin").notNull(),
    meaning: text("meaning"),
    literalMeaning: text("literal_meaning"),
    context: text("context"),

    topic: text("topic").default("general"),
    hskLevel: integer("hsk_level"),
    tags: text("tags").array().default(sql`'{}'::text[]`),

    characters: jsonb("characters").$type<CharacterData[]>().default([]),
    examples: jsonb("examples").$type<ExampleSentence[]>().default([]),

    mastery: integer("mastery").default(0),
    timesReviewed: integer("times_reviewed").default(0),
    timesCorrect: integer("times_correct").default(0),
    lastReviewed: timestamp("last_reviewed", { withTimezone: true }),
    nextReview: timestamp("next_review", { withTimezone: true }).defaultNow(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    isStarred: boolean("is_starred").default(false),
  },
  (t) => [
    check("hsk_level_range", sql`${t.hskLevel} BETWEEN 1 AND 9`),
    check("mastery_range", sql`${t.mastery} BETWEEN 0 AND 5`),
    index("idx_vocab_topic").on(t.topic),
    index("idx_vocab_hsk").on(t.hskLevel),
    index("idx_vocab_mastery").on(t.mastery),
    index("idx_vocab_next_review").on(t.nextReview),
    index("idx_vocab_created").on(t.createdAt.desc()),
    index("idx_vocab_tags").using("gin", t.tags),
  ],
);

export const reviewLog = pgTable(
  "review_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wordId: uuid("word_id").references(() => vocabWords.id, {
      onDelete: "cascade",
    }),
    wasCorrect: boolean("was_correct").notNull(),
    responseTimeMs: integer("response_time_ms"),
    reviewMode: text("review_mode").default("flashcard"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("idx_review_word").on(t.wordId)],
);

export type VocabWord = typeof vocabWords.$inferSelect;
export type NewVocabWord = typeof vocabWords.$inferInsert;
export type ReviewLogEntry = typeof reviewLog.$inferSelect;
