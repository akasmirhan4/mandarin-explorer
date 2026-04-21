"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { gradeWriting, type Grade } from "~/lib/flashcard-grading";
import { cn } from "~/lib/utils";
import type { VocabWord } from "~/server/db/schema";

type HanziWriterInstance = {
  cancelQuiz: () => void;
  hideCharacter: () => void;
  quiz: (opts: {
    onMistake?: () => void;
    onCorrectStroke?: (data: { strokeNum: number; totalStrokes: number }) => void;
    onComplete?: (data: { totalMistakes: number }) => void;
  }) => void;
};

type Props = {
  word: VocabWord;
  onSubmit: (
    grade: Grade,
    totalMistakes: number,
    charsAttempted: number,
  ) => void;
};

export function WritingTest({ word, onSubmit }: Props) {
  const chars = word.characters ?? [];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);

  const [charIdx, setCharIdx] = useState(0);
  const [mistakesPerChar, setMistakesPerChar] = useState<number[]>(() =>
    chars.map(() => 0),
  );
  const [strokesPerChar, setStrokesPerChar] = useState<number[]>(() =>
    chars.map(() => 0),
  );
  const [strokeProgress, setStrokeProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const charIdxRef = useRef(0);
  const mistakesRef = useRef<number[]>(chars.map(() => 0));
  const strokesRef = useRef<number[]>(chars.map(() => 0));
  const submittedRef = useRef(false);

  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    charIdxRef.current = 0;
    mistakesRef.current = chars.map(() => 0);
    strokesRef.current = chars.map(() => 0);
    submittedRef.current = false;
    setCharIdx(0);
    setMistakesPerChar(chars.map(() => 0));
    setStrokesPerChar(chars.map(() => 0));
    setStrokeProgress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  useEffect(() => {
    const el = containerRef.current;
    const targetChar = chars[charIdx]?.char;
    if (!el || !targetChar) return;

    let cancelled = false;

    void import("hanzi-writer").then(({ default: HanziWriter }) => {
      if (cancelled || !el) return;
      el.innerHTML = "";
      const size = el.offsetWidth || 260;
      const instance = HanziWriter.create(el, targetChar, {
        width: size,
        height: size,
        padding: 18,
        showOutline: false,
        showCharacter: false,
        strokeColor: "#16161a",
        outlineColor: "#e0d8cc",
        highlightColor: "#d93025",
        drawingColor: "#16161a",
        drawingWidth: 6,
        showHintAfterMisses: 3,
        charDataLoader: (ch, ok, er) => {
          fetch(
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(ch)}.json`,
          )
            .then((r) => r.json())
            .then(ok)
            .catch(er);
        },
      }) as unknown as HanziWriterInstance;
      writerRef.current = instance;

      instance.hideCharacter();
      instance.quiz({
        onMistake: () => {
          const i = charIdxRef.current;
          mistakesRef.current[i] = (mistakesRef.current[i] ?? 0) + 1;
          setMistakesPerChar([...mistakesRef.current]);
        },
        onCorrectStroke: (d) => {
          const i = charIdxRef.current;
          strokesRef.current[i] = d.totalStrokes;
          setStrokesPerChar([...strokesRef.current]);
          setStrokeProgress({ current: d.strokeNum + 1, total: d.totalStrokes });
        },
        onComplete: () => {
          if (submittedRef.current) return;
          const nextIdx = charIdxRef.current + 1;
          if (nextIdx < chars.length) {
            charIdxRef.current = nextIdx;
            setCharIdx(nextIdx);
            setStrokeProgress(null);
          } else {
            submittedRef.current = true;
            const totalMistakes = mistakesRef.current.reduce(
              (a, b) => a + b,
              0,
            );
            const totalStrokes = strokesRef.current.reduce((a, b) => a + b, 0);
            window.setTimeout(() => {
              onSubmitRef.current(
                gradeWriting(totalMistakes, totalStrokes),
                totalMistakes,
                chars.length,
              );
            }, 500);
          }
        },
      });
    });

    return () => {
      cancelled = true;
      writerRef.current?.cancelQuiz();
      if (el) el.innerHTML = "";
      writerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id, charIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      e.preventDefault();
      if (submittedRef.current) return;
      submittedRef.current = true;
      writerRef.current?.cancelQuiz();
      onSubmitRef.current("gave_up", 0, 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!chars.length) return null;

  const currentMistakes = mistakesPerChar[charIdx] ?? 0;

  return (
    <div className="space-y-4">
      <Card className="bg-card rounded-[18px] p-0 shadow-(--shadow-md-app) ring-0">
        <div className="flex min-h-45 flex-col items-center justify-center px-6 py-6 text-center">
          <div className="text-text3 mb-2 text-[10px] font-bold tracking-[2px] uppercase">
            Writing · Draw each character from memory
          </div>
          <div className="font-mono text-lg font-semibold">{word.pinyin}</div>
          <div className="text-jade mt-1 text-sm font-medium">
            {word.english}
            {word.meaning ? ` — ${word.meaning}` : ""}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2">
        <div className="text-text3 text-[11px] font-semibold tracking-[1px] uppercase">
          Character {charIdx + 1} of {chars.length}
        </div>
        <div className="flex gap-1">
          {chars.map((c, i) => {
            const done = i < charIdx;
            const active = i === charIdx;
            return (
              <span
                key={`${c.char}-${i}`}
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  done && "bg-jade-soft text-jade",
                  active && "bg-red text-white",
                  !done && !active && "bg-muted text-text3",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
            );
          })}
        </div>
      </div>

      <Card className="bg-card rounded-[18px] p-0 shadow-(--shadow-sm-app) ring-0">
        <div className="p-4">
          <div
            ref={containerRef}
            key={`${word.id}-${charIdx}`}
            className="border-border mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border-2 bg-white"
          />
        </div>
      </Card>

      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="text-text3">
          {strokeProgress
            ? `Stroke ${strokeProgress.current} / ${strokeProgress.total}`
            : "Draw the first stroke to start"}
        </span>
        <span className={cn("font-semibold", currentMistakes > 0 ? "text-red" : "text-text3")}>
          Mistakes: {currentMistakes}
        </span>
      </div>

      <div className="text-text3 text-center text-[11px]">
        Tip: hint appears after 3 mistakes on the same stroke · press{" "}
        <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
          Esc
        </kbd>{" "}
        to skip
      </div>

      <Button
        type="button"
        onClick={() => {
          if (submittedRef.current) return;
          submittedRef.current = true;
          writerRef.current?.cancelQuiz();
          onSubmit("gave_up", 0, 0);
        }}
        variant="ghost"
        className="bg-red-soft text-red hover:bg-red/10 w-full rounded-[12px] py-3 text-sm font-semibold"
      >
        I don&apos;t know
        <kbd className="bg-red/10 ring-red/20 ml-1 inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1">
          Esc
        </kbd>
      </Button>
    </div>
  );
}
