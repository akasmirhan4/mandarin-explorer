"use client";

import { useState } from "react";
import { toast } from "sonner";

import { TranslationWorkspace } from "~/components/translate/translation-workspace";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type {
  TranslationOption,
  TranslationResponse,
  WordBreakdown,
} from "~/server/lib/schemas/translation";

function isSentenceLike(english: string, chinese: string): boolean {
  if (/[。！？，、；：,.!?;:]/.test(chinese)) return true;
  const chineseChars = chinese.match(/[一-鿿]/g)?.length ?? 0;
  if (chineseChars > 6) return true;
  const englishWords = english.trim().split(/\s+/).filter(Boolean).length;
  if (englishWords > 3) return true;
  return false;
}

function wordToTranslationOption(w: WordBreakdown): TranslationOption {
  return {
    chinese: w.chinese,
    pinyin_marks: w.pinyin_marks,
    meaning: w.meaning,
    context: w.context ?? "",
    literal_meaning: w.literal_meaning ?? "",
    topic: w.topic ?? "general",
    hsk_level: w.hsk_level ?? null,
    tags: w.tags ?? [],
    characters: w.characters ?? [],
    examples: [],
  };
}

const HINT_WORDS = [
  "hello",
  "love",
  "water",
  "beautiful",
  "dragon",
  "mountain",
  "friend",
  "cat",
];

export function TranslatePanel() {
  const [word, setWord] = useState("");
  const [result, setResult] = useState<TranslationResponse | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const utils = api.useUtils();

  const translate = api.translate.translate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setSelectedIdx(0);

      type SavePayload = { english: string; translation: TranslationOption };
      const seen = new Set<string>();
      const queue: SavePayload[] = [];
      const enqueue = (english: string, t: TranslationOption) => {
        const key = `${t.chinese}|${t.pinyin_marks}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({ english, translation: t });
      };

      for (const t of data.translations) {
        if (!isSentenceLike(data.word, t.chinese)) {
          enqueue(data.word, t);
        }
        for (const ex of t.examples) {
          for (const w of ex.words) {
            if (!w.english || !w.chinese) continue;
            enqueue(w.english, wordToTranslationOption(w));
          }
        }
      }

      let createdCount = 0;
      let settled = 0;
      const total = queue.length;
      if (total === 0) return;

      for (const payload of queue) {
        createVocab.mutate(payload, {
          onSuccess: (res) => {
            if (res.created) {
              createdCount++;
              void utils.vocab.count.invalidate();
              void utils.vocab.list.invalidate();
            }
          },
          onSettled: () => {
            settled++;
            if (settled === total && createdCount > 0) {
              toast.success(
                `Saved ${createdCount} new word${createdCount === 1 ? "" : "s"} to your library`,
              );
            }
          },
        });
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const createVocab = api.vocab.create.useMutation();

  const doSearch = (w?: string) => {
    const query = (w ?? word).trim();
    if (!query) return;
    setWord(query);
    setResult(null);
    translate.mutate({ english: query });
  };

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-stretch gap-3">
          <div
            className={cn(
              "bg-card border-border focus-within:border-red flex flex-1 overflow-hidden rounded-2xl border-2 transition-colors",
            )}
            style={{ boxShadow: "var(--shadow-lg-app)" }}
          >
            <Input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
              placeholder="Type an English word..."
              className="text-ink placeholder:text-text3 h-full flex-1 rounded-none border-0 bg-transparent px-5 py-0 text-base font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            onClick={() => doSearch()}
            disabled={translate.isPending || !word.trim()}
            className="bg-red hover:bg-red/90 disabled:bg-mist h-12 rounded-2xl px-6 py-0 text-sm font-semibold text-white"
            style={{ boxShadow: "var(--shadow-lg-app)" }}
          >
            {translate.isPending ? "Translating…" : "Translate"}
          </Button>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {HINT_WORDS.map((h) => (
            <Button
              key={h}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWord(h);
                doSearch(h);
              }}
              className="bg-card border-border text-text2 hover:border-red hover:text-red h-auto rounded-full border px-3 py-1 text-[11px] font-medium transition-all"
            >
              {h}
            </Button>
          ))}
        </div>
      </div>

      {translate.isPending && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Spinner className="text-red size-8" />
          <p className="text-text3 text-[13px]">Translating...</p>
        </div>
      )}

      {result && !translate.isPending && (
        <TranslationWorkspace
          data={result}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
        />
      )}
    </div>
  );
}
