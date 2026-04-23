"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MeaningReviewButton } from "~/components/flashcards/meaning-review-button";
import { MeaningTest } from "~/components/flashcards/meaning-test";
import { PinyinTest } from "~/components/flashcards/pinyin-test";
import { TestFeedback } from "~/components/flashcards/test-feedback";
import { ToneTest } from "~/components/flashcards/tone-test";
import { WritingTest } from "~/components/flashcards/writing-test";
import { ChineseText } from "~/components/shared/chinese-text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { mapGradeToResponse, type Grade } from "~/lib/flashcard-grading";
import { canonicalPinyin } from "~/lib/pinyin";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { CharacterData } from "~/server/db/types";
import type { VocabWord } from "~/server/db/schema";

type TestMode = "meaning" | "pinyin" | "tone" | "writing";

type Submitted =
  | { mode: "meaning"; grade: Grade; userAnswer: string }
  | { mode: "pinyin"; grade: Grade; userAnswer: string }
  | { mode: "tone"; grade: Grade; picks: number[] }
  | {
      mode: "writing";
      grade: Grade;
      totalMistakes: number;
      charsAttempted: number;
    };

const ALL_TEST_MODES: TestMode[] = ["meaning", "pinyin", "tone", "writing"];

const TEST_OPTIONS: {
  mode: TestMode;
  label: string;
  description: string;
  requiresChars: boolean;
}[] = [
  {
    mode: "writing",
    label: "Writing",
    description: "Draw each character stroke by stroke",
    requiresChars: true,
  },
  {
    mode: "tone",
    label: "Tones",
    description: "Pick the tone for each character",
    requiresChars: true,
  },
  {
    mode: "pinyin",
    label: "Pinyin",
    description: "Type the pronunciation",
    requiresChars: false,
  },
  {
    mode: "meaning",
    label: "Definition",
    description: "Translate to English",
    requiresChars: false,
  },
];

const SELECTED_TESTS_STORAGE_KEY = "flashcards:selected-tests";

function loadSelectedTests(): Set<TestMode> {
  const fallback = new Set<TestMode>(ALL_TEST_MODES);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SELECTED_TESTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const valid = parsed.filter((m): m is TestMode =>
      ALL_TEST_MODES.includes(m as TestMode),
    );
    return valid.length > 0 ? new Set(valid) : fallback;
  } catch {
    return fallback;
  }
}

function pickTestMode(word: VocabWord, allowed: Set<TestMode>): TestMode {
  const hasChars = (word.characters ?? []).length > 0;
  const base: TestMode[] = hasChars
    ? ["meaning", "pinyin", "tone", "writing"]
    : ["meaning", "pinyin"];
  const filtered = base.filter((m) => allowed.has(m));
  const pool = filtered.length > 0 ? filtered : base;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function formatCanonicalPinyinForDisplay(word: VocabWord): string {
  const chars = word.characters ?? [];
  if (!chars.length) return canonicalPinyin(word);
  return chars
    .map((c) => canonicalPinyin({ pinyin: "", characters: [c] }))
    .join(" ");
}

function normalizeTone(t: number): number {
  return t === 0 ? 5 : t;
}

function TonePicksRow({
  chars,
  picks,
  correctTones,
  showWrong,
}: {
  chars: CharacterData[];
  picks: number[];
  correctTones: number[];
  showWrong: boolean;
}) {
  if (!picks.length) {
    return <em className="text-text3">(skipped)</em>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {chars.map((c, i) => {
        const pick = picks[i];
        const isWrong = showWrong && pick !== undefined && pick !== correctTones[i];
        return (
          <span
            key={`${c.char}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1 py-0.5",
              isWrong && "bg-red/10 ring-1 ring-red/30",
            )}
          >
            <ChineseText as="span" className="text-sm font-bold">
              {c.char}
            </ChineseText>
            {pick !== undefined ? (
              <ToneBadgeWithSample tone={normalizeTone(pick)} />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function ToneCorrectRow({ chars }: { chars: CharacterData[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {chars.map((c, i) => (
        <span key={`${c.char}-${i}`} className="inline-flex items-center gap-1">
          <ChineseText as="span" className="text-sm font-bold">
            {c.char}
          </ChineseText>
          <ToneBadgeWithSample tone={normalizeTone(c.tone)} />
        </span>
      ))}
    </span>
  );
}

const TONE_SAMPLE: Record<number, string> = {
  1: "ˉ",
  2: "ˊ",
  3: "ˇ",
  4: "ˋ",
  5: "·",
};

const TONE_LABEL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "neutral",
};

const TONE_PILL_CLASSES: Record<number, string> = {
  1: "bg-[var(--tone-1-bg)] text-[var(--tone-1-fg)]",
  2: "bg-[var(--tone-2-bg)] text-[var(--tone-2-fg)]",
  3: "bg-[var(--tone-3-bg)] text-[var(--tone-3-fg)]",
  4: "bg-[var(--tone-4-bg)] text-[var(--tone-4-fg)]",
  5: "bg-[var(--tone-5-bg)] text-[var(--tone-5-fg)]",
};

function ToneBadgeWithSample({ tone }: { tone: number }) {
  const safe = TONE_PILL_CLASSES[tone] ? tone : 1;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-[7px] px-2 py-0.75 text-[9px] font-bold whitespace-nowrap",
        TONE_PILL_CLASSES[safe],
      )}
    >
      <span>
        {safe === 5 ? "neutral" : `${TONE_LABEL[safe]} tone`}
      </span>
      <span className="text-[11px] font-semibold opacity-80">
        ({TONE_SAMPLE[safe]})
      </span>
    </span>
  );
}

export function FlashcardsPanel() {
  const utils = api.useUtils();
  const dueQuery = api.vocab.getDueForReview.useQuery({ limit: 100 });
  const submitReview = api.review.submitReview.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<TestMode>("meaning");
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<TestMode>>(
    () => new Set<TestMode>(ALL_TEST_MODES),
  );
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setSelectedTests(loadSelectedTests());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SELECTED_TESTS_STORAGE_KEY,
        JSON.stringify(Array.from(selectedTests)),
      );
    } catch {
      // ignore quota/serialization errors
    }
  }, [selectedTests]);

  useEffect(() => {
    if (dueQuery.data) {
      setQueue(dueQuery.data);
      setIdx(0);
      setCorrect(0);
      setTotal(0);
      setSubmitted(null);
      setStarted(false);
    }
  }, [dueQuery.data]);

  const currentWord = queue[idx];

  const recordReview = (grade: Grade) => {
    if (!currentWord) return;
    const response = mapGradeToResponse(grade);
    setTotal((t) => t + 1);
    if (response !== "wrong") setCorrect((c) => c + 1);
    submitReview.mutate(
      { wordId: currentWord.id, response, testType: mode },
      {
        onSuccess: () => {
          void utils.vocab.list.invalidate();
          void utils.vocab.count.invalidate();
        },
      },
    );
  };

  const handleTextSubmit = (grade: Grade, userAnswer: string) => {
    if (!currentWord) return;
    if (mode !== "meaning" && mode !== "pinyin") return;
    recordReview(grade);
    setSubmitted({ mode, grade, userAnswer });
  };

  const handleToneSubmit = (grade: Grade, picks: number[]) => {
    if (!currentWord) return;
    recordReview(grade);
    setSubmitted({ mode: "tone", grade, picks });
  };

  const handleWritingSubmit = (
    grade: Grade,
    totalMistakes: number,
    charsAttempted: number,
  ) => {
    if (!currentWord) return;
    recordReview(grade);
    setSubmitted({ mode: "writing", grade, totalMistakes, charsAttempted });
  };

  const handleNext = () => {
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setSubmitted(null);
    const nextWord = queue[nextIdx];
    if (nextWord) setMode(pickTestMode(nextWord, selectedTests));
  };

  const handleStart = () => {
    if (selectedTests.size === 0) return;
    const firstWord = queue[0];
    if (!firstWord) return;
    setIdx(0);
    setCorrect(0);
    setTotal(0);
    setSubmitted(null);
    setMode(pickTestMode(firstWord, selectedTests));
    setStarted(true);
  };

  const toggleTest = (mode: TestMode) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  };

  const restart = () => {
    setStarted(false);
    void dueQuery.refetch();
  };

  if (dueQuery.isLoading) {
    return (
      <div className="text-text3 flex flex-col items-center gap-3 py-12">
        <Spinner className="text-red size-8" />
        <p className="text-[13px]">Loading flashcards…</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia>
            <span className="text-2xl">📚</span>
          </EmptyMedia>
          <EmptyTitle>No vocab yet</EmptyTitle>
          <EmptyDescription>Save some words first!</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const dueRemaining = Math.max(0, queue.length - idx);
  const hasAnyChars = queue.some((w) => (w.characters ?? []).length > 0);

  if (!started) {
    return (
      <div className="mx-auto max-w-[480px]">
        <Card className="bg-card rounded-2xl p-0 shadow-(--shadow-sm-app) ring-0">
          <CardContent className="flex flex-col gap-5 px-6 py-6">
            <div className="text-center">
              <h3 className="text-lg font-bold">Ready to review?</h3>
              <p className="text-text3 mt-1 text-[13px]">
                {queue.length} card{queue.length === 1 ? "" : "s"} due · pick
                which tests to include
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {TEST_OPTIONS.map((opt) => {
                const isSelected = selectedTests.has(opt.mode);
                const isDisabled = opt.requiresChars && !hasAnyChars;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => toggleTest(opt.mode)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                      isSelected
                        ? "border-red bg-red/10"
                        : "border-border bg-transparent hover:border-text3/40",
                      isDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {opt.label}
                      </span>
                      <span className="text-text3 text-[12px]">
                        {opt.description}
                        {isDisabled ? " · needs character data" : ""}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-md border",
                        isSelected
                          ? "border-red bg-red text-white"
                          : "border-text3/40 bg-transparent",
                      )}
                      aria-hidden
                    >
                      {isSelected ? (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="size-3.5"
                        >
                          <path
                            d="M3 8.5 6.5 12 13 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              onClick={handleStart}
              disabled={selectedTests.size === 0}
              className="bg-red hover:bg-red/90 h-11 rounded-[12px] text-sm font-semibold text-white"
            >
              Start review
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderFeedback = () => {
    if (!submitted || !currentWord) return null;
    if (submitted.mode === "meaning") {
      const meaningWord = currentWord;
      return (
        <TestFeedback
          grade={submitted.grade}
          userAnswer={submitted.userAnswer}
          correctAnswer={
            <span>
              {meaningWord.english}
              {meaningWord.meaning ? ` — ${meaningWord.meaning}` : ""}
            </span>
          }
          onNext={handleNext}
          reviewSlot={
            submitted.userAnswer.trim() ? (
              <MeaningReviewButton
                wordId={meaningWord.id}
                userAnswer={submitted.userAnswer}
                currentEnglish={meaningWord.english}
                currentMeaning={meaningWord.meaning ?? ""}
                onUpdated={(next) => {
                  setQueue((q) =>
                    q.map((w) =>
                      w.id === meaningWord.id
                        ? { ...w, english: next.english, meaning: next.meaning }
                        : w,
                    ),
                  );
                }}
              />
            ) : null
          }
        />
      );
    }
    if (submitted.mode === "pinyin") {
      const pinyinChars = currentWord.characters ?? [];
      return (
        <TestFeedback
          grade={submitted.grade}
          userAnswer={
            <span className="font-mono">{submitted.userAnswer || ""}</span>
          }
          correctAnswer={
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>
                <span className="font-mono">
                  {formatCanonicalPinyinForDisplay(currentWord)}
                </span>
                <span className="text-text3 ml-2">({currentWord.pinyin})</span>
              </span>
              {pinyinChars.length > 0 && (
                <ToneCorrectRow chars={pinyinChars} />
              )}
            </span>
          }
          onNext={handleNext}
        />
      );
    }
    if (submitted.mode === "tone") {
      const toneChars = currentWord.characters ?? [];
      const correctTones = toneChars.map((c) => normalizeTone(c.tone));
      return (
        <TestFeedback
          grade={submitted.grade}
          userAnswer={
            <TonePicksRow
              chars={toneChars}
              picks={submitted.picks}
              correctTones={correctTones}
              showWrong
            />
          }
          correctAnswer={<ToneCorrectRow chars={toneChars} />}
          onNext={handleNext}
        />
      );
    }
    const writingChars = currentWord.characters ?? [];
    const userAnswer =
      submitted.grade === "gave_up" ? (
        <em className="text-text3">(skipped)</em>
      ) : (
        <span>
          Drew {submitted.charsAttempted} character
          {submitted.charsAttempted === 1 ? "" : "s"} · {submitted.totalMistakes}{" "}
          mistake{submitted.totalMistakes === 1 ? "" : "s"}
        </span>
      );
    return (
      <TestFeedback
        grade={submitted.grade}
        userAnswer={userAnswer}
        correctAnswer={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ChineseText as="span" className="text-lg font-bold">
              {currentWord.chinese}
            </ChineseText>
            <span className="font-mono">
              {formatCanonicalPinyinForDisplay(currentWord)}
            </span>
            {writingChars.length > 0 && (
              <ToneCorrectRow chars={writingChars} />
            )}
          </span>
        }
        onNext={handleNext}
      />
    );
  };

  return (
    <div className="mx-auto max-w-[480px]">
      <div className="mb-5 flex justify-center gap-3">
        <Stat num={dueRemaining} label="Due" />
        <Stat num={correct} label="Correct" />
        <Stat num={total} label="Reviewed" />
      </div>

      {idx >= queue.length ? (
        <div className="py-12 text-center">
          <h3 className="mb-2 text-2xl font-bold">🎉 Done!</h3>
          <p className="text-text2 mb-4 text-sm">
            {correct}/{total} correct (
            {total ? Math.round((correct / total) * 100) : 0}%)
          </p>
          <Button
            type="button"
            onClick={restart}
            className="bg-red hover:bg-red/90 rounded-[12px] px-7 py-3 text-sm font-semibold text-white"
          >
            Review Again
          </Button>
        </div>
      ) : currentWord ? (
        submitted ? (
          renderFeedback()
        ) : mode === "meaning" ? (
          <MeaningTest word={currentWord} onSubmit={handleTextSubmit} />
        ) : mode === "pinyin" ? (
          <PinyinTest word={currentWord} onSubmit={handleTextSubmit} />
        ) : mode === "tone" ? (
          <ToneTest word={currentWord} onSubmit={handleToneSubmit} />
        ) : (
          <WritingTest word={currentWord} onSubmit={handleWritingSubmit} />
        )
      ) : null}
    </div>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <Card className="bg-card flex-1 rounded-xl p-0 shadow-(--shadow-sm-app) ring-0">
      <CardContent className="px-5 py-3 text-center">
        <div className="text-2xl font-bold">{num}</div>
        <div className="text-text3 text-[10px] font-semibold tracking-[1px] uppercase">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
