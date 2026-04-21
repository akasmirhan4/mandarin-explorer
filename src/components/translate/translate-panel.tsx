"use client";

import { useState } from "react";
import { toast } from "sonner";

import { TranslationWorkspace } from "~/components/translate/translation-workspace";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { TranslationResponse } from "~/server/lib/schemas/translation";

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

      for (const t of data.translations) {
        createVocab.mutate(
          { english: data.word, translation: t },
          {
            onSuccess: (res) => {
              if (res.created) {
                void utils.vocab.count.invalidate();
                void utils.vocab.list.invalidate();
              }
            },
          },
        );
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
        <div
          className={cn(
            "bg-card border-border flex overflow-hidden rounded-2xl border-2 transition-colors focus-within:border-[var(--red)]",
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
            className="text-ink placeholder:text-text3 flex-1 rounded-none border-0 bg-transparent px-5 py-4 text-base font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
          />
          <Button
            type="button"
            onClick={() => doSearch()}
            disabled={translate.isPending || !word.trim()}
            className="bg-red hover:bg-red/90 disabled:bg-mist rounded-none px-6 py-4 text-sm font-semibold text-white"
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
