"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChineseText } from "~/components/shared/chinese-text";
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
import type { TranslationOption } from "~/server/lib/schemas/translation";
import { api } from "~/trpc/react";

type Props = {
  word: TranslationOption;
  wordId?: string;
};

export function WordDetailView({ word, wordId }: Props) {
  const [charIdx, setCharIdx] = useState(0);
  const utils = api.useUtils();

  const generateExamples = api.vocab.generateExamples.useMutation({
    onSuccess: (data) => {
      const n = data.added.length;
      const w = data.addedWords;
      const wordSuffix =
        w > 0 ? ` · ${w} new word${w === 1 ? "" : "s"} saved` : "";
      toast.success(
        `Added ${n} example${n === 1 ? "" : "s"}${wordSuffix}`,
      );
      void utils.vocab.list.invalidate();
      void utils.vocab.count.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    setCharIdx(0);
  }, [word]);

  const activeChar = word.characters[charIdx];
  const isGenerating = generateExamples.isPending;

  return (
    <div className="grid grid-cols-2 gap-[18px] max-[740px]:grid-cols-1">
      <div className="flex flex-col gap-[18px]">
        <Panel title="Stroke Order" tone="red">
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {word.characters.map((c, i) => (
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

        <Panel
          title="Examples"
          tone="gold"
          action={
            wordId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating}
                onClick={() =>
                  generateExamples.mutate({ id: wordId, count: 1 })
                }
                className="border-border hover:border-gold hover:text-gold hover:bg-gold-soft h-auto rounded-[7px] border bg-white px-2.5 py-1 text-[10px] font-semibold"
              >
                {isGenerating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                {isGenerating ? "Generating..." : "Generate example"}
              </Button>
            ) : null
          }
        >
          <div className="flex flex-col gap-3">
            {word.examples.length === 0 && !isGenerating && (
              <Empty className="border-0 py-3">
                <EmptyDescription>No examples</EmptyDescription>
              </Empty>
            )}
            {word.examples.map((e, i) => (
              <div
                key={i}
                className="bg-background rounded-[9px] border-l-[3px] border-[var(--gold)] px-3.5 py-3"
              >
                <ChineseText as="div" className="mb-0.5 text-base font-bold">
                  {e.chinese}
                </ChineseText>
                <div className="text-red mb-px text-xs">{e.pinyin}</div>
                <div className="text-text2 text-xs">{e.english}</div>
              </div>
            ))}
            {isGenerating && (
              <div className="bg-background text-text3 flex items-center gap-2 rounded-[9px] border-l-[3px] border-[var(--gold)] px-3.5 py-3 text-xs">
                <Loader2 className="size-3 animate-spin" />
                Generating a new example...
              </div>
            )}
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
              {word.chinese}
            </ChineseText>
            <div className="text-red mt-1 text-[22px] font-bold">
              {word.pinyin_marks}
            </div>
            {word.literal_meaning && (
              <div className="text-text3 mt-1 text-xs">
                Literal: {word.literal_meaning}
              </div>
            )}
          </div>
          <Separator className="mb-3.5" />
          <div className="flex flex-col gap-2">
            {word.characters.map((c, i) => (
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
            {word.characters.length === 0 && (
              <Empty className="border-0 py-3">
                <EmptyDescription>No data</EmptyDescription>
              </Empty>
            )}
            {word.characters.map((c, i) =>
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
  );
}

function Panel({
  title,
  tone,
  children,
  action,
}: {
  title: string;
  tone: "red" | "jade" | "blue" | "gold";
  children: React.ReactNode;
  action?: React.ReactNode;
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
        {action}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
