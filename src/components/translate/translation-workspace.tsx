"use client";

import { ChineseText } from "~/components/shared/chinese-text";
import { TagPill } from "~/components/shared/tag-pill";
import { WordDetailView } from "~/components/shared/word-detail-view";
import { cn } from "~/lib/utils";
import type { TranslationResponse } from "~/server/lib/schemas/translation";

type Props = {
  data: TranslationResponse;
  selectedIdx: number;
  onSelect: (idx: number) => void;
};

export function TranslationWorkspace({ data, selectedIdx, onSelect }: Props) {
  const option = data.translations[selectedIdx];

  if (!option) return null;

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
              onClick={() => onSelect(i)}
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

      <WordDetailView word={option} />
    </div>
  );
}
