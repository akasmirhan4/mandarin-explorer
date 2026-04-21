"use client";

import { useState } from "react";

import { ChineseText } from "~/components/shared/chinese-text";
import { TagPill } from "~/components/shared/tag-pill";
import { ToneBadge } from "~/components/shared/tone-badge";
import { StrokeOrderViewer } from "~/components/translate/stroke-order-viewer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Empty, EmptyDescription } from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import type { TranslationResponse } from "~/server/lib/schemas/translation";

type Props = {
  data: TranslationResponse;
  selectedIdx: number;
  onSelect: (idx: number) => void;
};

export function TranslationWorkspace({ data, selectedIdx, onSelect }: Props) {
  const option = data.translations[selectedIdx];
  const [charIdx, setCharIdx] = useState(0);

  if (!option) return null;
  const activeChar = option.characters[charIdx];

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="text-text3 text-[13px] font-semibold tracking-[2px] uppercase">
          {data.word}
        </span>
        <span className="text-text3 text-xs">
          {data.translations.length} translations
        </span>
      </div>

      <div className="mb-7 flex flex-col gap-3">
        {data.translations.map((t, i) => {
          const selected = i === selectedIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(i);
                setCharIdx(0);
              }}
              className={cn(
                "bg-card grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-app border-2 px-5 py-4 text-left transition-all",
                selected
                  ? "border-red"
                  : "hover:border-border border-transparent",
              )}
              style={{
                boxShadow: selected
                  ? "var(--shadow-md-app)"
                  : "var(--shadow-sm-app)",
              }}
            >
              <ChineseText
                as="div"
                className="min-w-[70px] text-center text-[32px] leading-none font-black max-[740px]:min-w-[55px] max-[740px]:text-[26px]"
                speakable={false}
              >
                {t.chinese}
              </ChineseText>
              <div className="flex flex-col gap-0.5">
                <div className="text-red text-[15px] font-semibold">
                  {t.pinyin_marks}
                </div>
                <div className="text-text2 text-[13px]">{t.meaning}</div>
                {t.context && (
                  <div className="text-text3 text-[11px] italic">
                    {t.context}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {t.topic && t.topic !== "general" && (
                  <TagPill variant="topic">{t.topic}</TagPill>
                )}
                {t.hsk_level ? (
                  <TagPill variant="hsk">HSK {t.hsk_level}</TagPill>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-[18px] max-[740px]:grid-cols-1">
        <div className="flex flex-col gap-[18px]">
          <Panel title="Stroke Order" tone="red">
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {option.characters.map((c, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  size="sm"
                  data-state={charIdx === i ? "active" : "inactive"}
                  onClick={() => setCharIdx(i)}
                  className={cn(
                    "font-chinese border-border text-ink h-auto rounded-[9px] border-2 bg-white px-3.5 py-1.5 text-lg font-bold transition-all",
                    charIdx === i
                      ? "bg-red border-red hover:bg-red text-white hover:text-white"
                      : "hover:border-red",
                  )}
                >
                  {c.char}
                </Button>
              ))}
            </div>
            {activeChar && <StrokeOrderViewer character={activeChar.char} />}
          </Panel>

          <Panel title="Examples" tone="gold">
            <div className="flex flex-col gap-3">
              {option.examples.length === 0 && (
                <Empty className="border-0 py-3">
                  <EmptyDescription>No examples</EmptyDescription>
                </Empty>
              )}
              {option.examples.map((e, i) => (
                <div
                  key={i}
                  className="bg-background rounded-[9px] border-l-[3px] border-[var(--gold)] px-3.5 py-3"
                >
                  <ChineseText
                    as="div"
                    className="mb-0.5 text-base font-bold"
                  >
                    {e.chinese}
                  </ChineseText>
                  <div className="text-red mb-px text-xs">{e.pinyin}</div>
                  <div className="text-text2 text-xs">{e.english}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-[18px]">
          <Panel title="Pronunciation" tone="blue">
            <div className="py-4 text-center">
              <ChineseText
                as="div"
                className="text-[42px] leading-none font-black"
              >
                {option.chinese}
              </ChineseText>
              <div className="text-red mt-1 text-[22px] font-bold">
                {option.pinyin_marks}
              </div>
              {option.literal_meaning && (
                <div className="text-text3 mt-1 text-xs">
                  Literal: {option.literal_meaning}
                </div>
              )}
            </div>
            <Separator className="mb-3.5" />
            <div className="flex flex-col gap-2">
              {option.characters.map((c, i) => (
                <div
                  key={i}
                  className="bg-background flex items-center gap-3 rounded-[9px] px-3 py-2"
                >
                  <ChineseText
                    as="div"
                    className="min-w-[36px] text-center text-2xl font-bold"
                  >
                    {c.char}
                  </ChineseText>
                  <div className="flex-1">
                    <div className="text-red text-sm font-semibold">
                      {c.pinyin}
                    </div>
                    <div className="text-text2 text-[11px]">{c.meaning}</div>
                  </div>
                  <ToneBadge tone={c.tone} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Radicals" tone="jade">
            <div className="flex flex-col gap-2.5">
              {option.characters.length === 0 && (
                <Empty className="border-0 py-3">
                  <EmptyDescription>No data</EmptyDescription>
                </Empty>
              )}
              {option.characters.map((c, i) =>
                !c.radical ? null : (
                  <div
                    key={i}
                    className="bg-background flex items-center gap-3.5 rounded-[9px] px-3.5 py-3"
                  >
                    <ChineseText
                      as="div"
                      className="min-w-[44px] text-center text-[32px] leading-none font-black"
                    >
                      {c.radical}
                    </ChineseText>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold">
                        {c.char} → {c.radical}
                      </div>
                      <div className="text-red text-xs">{c.radical_pinyin}</div>
                      <div className="text-text2 text-[11px]">
                        {c.radical_meaning}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-text3 h-auto rounded-md border-transparent bg-white px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap"
                    >
                      {c.radical_strokes || "?"} str
                    </Badge>
                  </div>
                ),
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "red" | "jade" | "blue" | "gold";
  children: React.ReactNode;
}) {
  const toneClass = {
    red: "text-red",
    jade: "text-jade",
    blue: "text-blue",
    gold: "text-gold",
  }[tone];

  return (
    <Card className="bg-card overflow-hidden rounded-app gap-0 p-0 py-0 shadow-(--shadow-sm-app) ring-0">
      <CardHeader className="border-border flex items-center justify-between border-b px-5 py-3.5">
        <CardTitle
          className={cn(
            "text-[10px] font-bold tracking-[2px] uppercase leading-normal",
            toneClass,
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
