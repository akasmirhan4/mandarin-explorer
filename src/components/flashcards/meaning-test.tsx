"use client";

import { useEffect, useRef, useState } from "react";

import { ChineseText } from "~/components/shared/chinese-text";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { gradeMeaning, type Grade } from "~/lib/flashcard-grading";
import type { VocabWord } from "~/server/db/schema";

type Props = {
  word: VocabWord;
  onSubmit: (grade: Grade, userAnswer: string) => void;
};

export function MeaningTest({ word, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [word.id]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onSubmit("gave_up", "");
      return;
    }
    onSubmit(gradeMeaning(trimmed, word), trimmed);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card rounded-[18px] p-0 shadow-(--shadow-md-app) ring-0">
        <div className="flex min-h-55 flex-col items-center justify-center px-8 py-10 text-center">
          <div className="text-text3 mb-3 text-[10px] font-bold tracking-[2px] uppercase">
            Meaning · Type the English
          </div>
          <ChineseText
            as="div"
            className="mb-2 text-[56px] leading-tight font-black max-[740px]:text-[42px]"
          >
            {word.chinese}
          </ChineseText>
          <div className="text-red text-xl font-semibold">{word.pinyin}</div>
        </div>
      </Card>

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
        placeholder="e.g. hello"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="h-11 rounded-[12px] px-4 text-base"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onSubmit("gave_up", "")}
          variant="ghost"
          className="bg-red-soft text-red hover:bg-red/10 flex-1 rounded-[12px] py-3 text-sm font-semibold"
        >
          I don&apos;t know
        </Button>
        <Button
          type="button"
          onClick={submit}
          className="bg-red hover:bg-red/90 flex-2 rounded-[12px] py-3 text-sm font-semibold text-white"
        >
          Check ↵
        </Button>
      </div>
    </div>
  );
}
