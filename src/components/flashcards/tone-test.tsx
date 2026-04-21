"use client";

import { useEffect, useRef, useState } from "react";

import { ChineseText } from "~/components/shared/chinese-text";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { gradeTone, type Grade } from "~/lib/flashcard-grading";
import { stripTones } from "~/lib/pinyin";
import { cn } from "~/lib/utils";
import type { VocabWord } from "~/server/db/schema";

type Props = {
  word: VocabWord;
  onSubmit: (grade: Grade, userPicks: number[]) => void;
};

const TONE_OPTIONS: { value: number; mark: string; number: string }[] = [
  { value: 1, mark: "ˉ", number: "1" },
  { value: 2, mark: "ˊ", number: "2" },
  { value: 3, mark: "ˇ", number: "3" },
  { value: 4, mark: "ˋ", number: "4" },
  { value: 5, mark: "·", number: "5" },
];

const TONE_BG: Record<number, string> = {
  1: "bg-[var(--tone-1-bg)] text-[var(--tone-1-fg)]",
  2: "bg-[var(--tone-2-bg)] text-[var(--tone-2-fg)]",
  3: "bg-[var(--tone-3-bg)] text-[var(--tone-3-fg)]",
  4: "bg-[var(--tone-4-bg)] text-[var(--tone-4-fg)]",
  5: "bg-[var(--tone-5-bg)] text-[var(--tone-5-fg)]",
};

export function ToneTest({ word, onSubmit }: Props) {
  const chars = word.characters ?? [];
  const [picks, setPicks] = useState<(number | null)[]>(() => chars.map(() => null));
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);

  useEffect(() => {
    setPicks(chars.map(() => null));
    cursorRef.current = 0;
    setCursor(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  const advanceCursor = (from: number) => {
    const next = chars.length ? (from + 1) % chars.length : 0;
    cursorRef.current = next;
    setCursor(next);
  };

  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSubmitRef.current("gave_up", []);
        return;
      }
      if (chars.length === 0) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 5) return;
      e.preventDefault();
      const i = cursorRef.current;
      setPicks((prev) => prev.map((p, idx) => (idx === i ? n : p)));
      advanceCursor(i);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars.length]);

  const allFilled = picks.every((p) => p !== null);

  const submit = () => {
    if (!allFilled) return;
    const numericPicks = picks as number[];
    onSubmit(gradeTone(numericPicks, word), numericPicks);
  };

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      submitRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-card rounded-[18px] p-0 shadow-(--shadow-md-app) ring-0">
        <div className="flex min-h-55 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="text-text3 mb-3 text-[10px] font-bold tracking-[2px] uppercase">
            Tones · Pick the tone for each character
          </div>
          <ChineseText
            as="div"
            className="mb-2 text-[48px] leading-tight font-black max-[740px]:text-[38px]"
          >
            {word.chinese}
          </ChineseText>
          <div className="text-jade text-sm font-medium">
            {word.english}
            {word.meaning ? ` — ${word.meaning}` : ""}
          </div>
        </div>
      </Card>

      <div className="text-text3 text-center text-[11px]">
        Tip: press <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">1</kbd>–<kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">5</kbd> to fill in order
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {chars.map((c, i) => {
          const isCursor = i === cursor;
          return (
            <div
              key={`${c.char}-${i}`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[12px] p-2 transition-all",
                isCursor && "ring-red/40 bg-red/5 ring-2",
              )}
            >
              <ChineseText
                as="div"
                className="text-[30px] font-black leading-none"
              >
                {c.char}
              </ChineseText>
              <div className="text-text3 font-mono text-xs">{stripTones(c.pinyin)}</div>
              <div className="flex gap-1">
                {TONE_OPTIONS.map((opt) => {
                  const selected = picks[i] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPicks((prev) =>
                          prev.map((p, idx) => (idx === i ? opt.value : p)),
                        );
                        advanceCursor(i);
                      }}
                      className={cn(
                        "flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[8px] transition-all",
                        selected
                          ? TONE_BG[opt.value]
                          : "bg-muted text-text3 hover:bg-muted/70",
                      )}
                      aria-label={`Tone ${opt.number}`}
                    >
                      <span className="text-lg leading-none font-semibold">
                        {opt.mark}
                      </span>
                      <span className="text-[9px] leading-none opacity-70">
                        {opt.number}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onSubmit("gave_up", [])}
          variant="ghost"
          className="bg-red-soft text-red hover:bg-red/10 flex-1 rounded-[12px] py-3 text-sm font-semibold"
        >
          I don&apos;t know
          <kbd className="bg-red/10 ring-red/20 ml-1 inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1">
            Esc
          </kbd>
        </Button>
        <Button
          type="button"
          disabled={!allFilled}
          onClick={submit}
          className="bg-red hover:bg-red/90 flex-2 rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Check
          <kbd className="ml-1 inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1 ring-white/30">
            Enter
          </kbd>
        </Button>
      </div>
    </div>
  );
}
