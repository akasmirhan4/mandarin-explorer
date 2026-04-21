"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MeaningReviewButton } from "~/components/flashcards/meaning-review-button";
import { MeaningTest } from "~/components/flashcards/meaning-test";
import { PinyinTest } from "~/components/flashcards/pinyin-test";
import { TestFeedback } from "~/components/flashcards/test-feedback";
import { ToneTest } from "~/components/flashcards/tone-test";
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

type TestMode = "meaning" | "pinyin" | "tone";

type Submitted =
  | { mode: "meaning"; grade: Grade; userAnswer: string }
  | { mode: "pinyin"; grade: Grade; userAnswer: string }
  | { mode: "tone"; grade: Grade; picks: number[] };

function pickTestMode(word: VocabWord): TestMode {
  const hasChars = (word.characters ?? []).length > 0;
  const pool: TestMode[] = hasChars
    ? ["meaning", "pinyin", "tone"]
    : ["meaning", "pinyin"];
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

  useEffect(() => {
    if (dueQuery.data) {
      setQueue(dueQuery.data);
      setIdx(0);
      setCorrect(0);
      setTotal(0);
      setSubmitted(null);
      if (dueQuery.data[0]) setMode(pickTestMode(dueQuery.data[0]));
    }
  }, [dueQuery.data]);

  const currentWord = queue[idx];

  const recordReview = (grade: Grade) => {
    if (!currentWord) return;
    const response = mapGradeToResponse(grade);
    setTotal((t) => t + 1);
    if (response !== "wrong") setCorrect((c) => c + 1);
    submitReview.mutate(
      { wordId: currentWord.id, response },
      {
        onSuccess: () => {
          void utils.vocab.list.invalidate();
          void utils.vocab.count.invalidate();
        },
      },
    );
  };

  const handleTextSubmit = (grade: Grade, userAnswer: string) => {
    if (!currentWord || mode === "tone") return;
    recordReview(grade);
    setSubmitted({ mode, grade, userAnswer });
  };

  const handleToneSubmit = (grade: Grade, picks: number[]) => {
    if (!currentWord) return;
    recordReview(grade);
    setSubmitted({ mode: "tone", grade, picks });
  };

  const handleNext = () => {
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setSubmitted(null);
    const nextWord = queue[nextIdx];
    if (nextWord) setMode(pickTestMode(nextWord));
  };

  const restart = () => {
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
    const chars = currentWord.characters ?? [];
    const correctTones = chars.map((c) => normalizeTone(c.tone));
    return (
      <TestFeedback
        grade={submitted.grade}
        userAnswer={
          <TonePicksRow
            chars={chars}
            picks={submitted.picks}
            correctTones={correctTones}
            showWrong
          />
        }
        correctAnswer={<ToneCorrectRow chars={chars} />}
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
        ) : (
          <ToneTest word={currentWord} onSubmit={handleToneSubmit} />
        )
      ) : null}
    </div>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <Card className="bg-card rounded-xl p-0 shadow-(--shadow-sm-app) ring-0">
      <CardContent className="px-5 py-3 text-center">
        <div className="text-2xl font-bold">{num}</div>
        <div className="text-text3 text-[10px] font-semibold tracking-[1px] uppercase">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
