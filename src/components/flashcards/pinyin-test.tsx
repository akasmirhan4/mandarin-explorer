"use client";

import { useEffect, useRef, useState } from "react";

import { ChineseText } from "~/components/shared/chinese-text";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import type { Grade } from "~/lib/flashcard-grading";
import { gradePinyin } from "~/lib/pinyin";
import type { VocabWord } from "~/server/db/schema";

type Props = {
  word: VocabWord;
  onSubmit: (grade: Grade, userAnswer: string) => void;
};

export function PinyinTest({ word, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [word.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSubmitRef.current("gave_up", "");
        return;
      }
      if (e.key === "Tab" && !e.shiftKey && inputRef.current) {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          inputRef.current.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onSubmit("gave_up", "");
      return;
    }
    onSubmit(gradePinyin(trimmed, word), trimmed);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card rounded-[18px] p-0 shadow-(--shadow-md-app) ring-0">
        <div className="flex min-h-55 flex-col items-center justify-center px-8 py-10 text-center">
          <div className="text-text3 mb-3 text-[10px] font-bold tracking-[2px] uppercase">
            Pinyin · Type with tone numbers
          </div>
          <ChineseText
            as="div"
            className="mb-2 text-[56px] leading-tight font-black max-[740px]:text-[42px]"
          >
            {word.chinese}
          </ChineseText>
          <div className="text-jade text-base font-medium">
            {word.english}
            {word.meaning ? ` — ${word.meaning}` : ""}
          </div>
        </div>
      </Card>

      <div className="space-y-1.5">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="e.g. ni3 hao3"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-11 rounded-[12px] px-4 font-mono text-base tracking-wide"
        />
        <p className="text-text3 px-1 text-[11px]">
          Tones optional — tone numbers (1–4) give a perfect score, tones
          omitted counts as <span className="text-gold font-semibold">partial</span>.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onSubmit("gave_up", "")}
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
          onClick={submit}
          className="bg-red hover:bg-red/90 flex-2 rounded-[12px] py-3 text-sm font-semibold text-white"
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
