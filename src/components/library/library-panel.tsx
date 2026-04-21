"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MasteryDimensionsBar } from "~/components/library/mastery-dimensions-bar";
import { ChineseText } from "~/components/shared/chinese-text";
import { TagPill } from "~/components/shared/tag-pill";
import { WordDetailView } from "~/components/shared/word-detail-view";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import type { VocabWord } from "~/server/db/schema";
import type { TranslationOption } from "~/server/lib/schemas/translation";
import { api } from "~/trpc/react";

function vocabToWord(row: VocabWord): TranslationOption {
  return {
    chinese: row.chinese,
    pinyin_marks: row.pinyin,
    meaning: row.meaning ?? "",
    context: row.context ?? "",
    literal_meaning: row.literalMeaning ?? "",
    topic: row.topic ?? "general",
    hsk_level: row.hskLevel ?? null,
    tags: row.tags ?? [],
    characters: row.characters ?? [],
    examples: (row.examples ?? []).map((e) => ({
      chinese: e.chinese,
      pinyin: e.pinyin,
      english: e.english,
      words: e.words ?? [],
    })),
  };
}

const TOPICS = [
  "general",
  "greeting",
  "food",
  "travel",
  "business",
  "nature",
  "emotion",
  "family",
  "number",
  "time",
  "body",
  "weather",
  "shopping",
  "education",
];

const TONES: { value: string; label: string }[] = [
  { value: "1", label: "1st (ā)" },
  { value: "2", label: "2nd (á)" },
  { value: "3", label: "3rd (ǎ)" },
  { value: "4", label: "4th (à)" },
];

const HSK_LEVELS: { value: string; label: string }[] = [
  { value: "1", label: "HSK 1" },
  { value: "2", label: "HSK 2" },
  { value: "3", label: "HSK 3" },
  { value: "4", label: "HSK 4" },
  { value: "5", label: "HSK 5" },
  { value: "6", label: "HSK 6" },
  { value: "7", label: "HSK 7" },
  { value: "8", label: "HSK 8" },
  { value: "9", label: "HSK 9" },
  { value: "none", label: "Unclassified" },
];

type MasteryBucket = "new" | "learning" | "reviewing" | "mastered";
type HskFilter =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "none";

export function LibraryPanel() {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [masteryBucket, setMasteryBucket] = useState<string>("");
  const [hskLevel, setHskLevel] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const utils = api.useUtils();
  const listQuery = api.vocab.list.useQuery({
    search: search || undefined,
    topic: topic || undefined,
    tone: tone ? Number(tone) : undefined,
    masteryBucket: (masteryBucket as MasteryBucket) || undefined,
    hskLevel: (hskLevel as HskFilter) || undefined,
    limit: 200,
    offset: 0,
  });

  const deleteVocab = api.vocab.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      void utils.vocab.list.invalidate();
      void utils.vocab.count.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = listQuery.data ?? [];
  const selected = selectedId
    ? (items.find((w) => w.id === selectedId) ?? null)
    : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 max-[740px]:flex-col">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vocab..."
          className="border-border focus-visible:border-red min-w-[160px] flex-1 rounded-[10px] border-2 bg-white px-4 py-2.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <FilterSelect
          value={topic}
          onChange={setTopic}
          placeholder="All Topics"
          options={TOPICS.map((t) => ({ value: t, label: cap(t) }))}
        />
        <FilterSelect
          value={tone}
          onChange={setTone}
          placeholder="All Tones"
          options={TONES}
        />
        <FilterSelect
          value={masteryBucket}
          onChange={setMasteryBucket}
          placeholder="All Levels"
          options={[
            { value: "new", label: "New" },
            { value: "learning", label: "Learning" },
            { value: "reviewing", label: "Reviewing" },
            { value: "mastered", label: "Mastered" },
          ]}
        />
        <FilterSelect
          value={hskLevel}
          onChange={setHskLevel}
          placeholder="All HSK"
          options={HSK_LEVELS}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {listQuery.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-21 w-full rounded-app" />
          ))}

        {!listQuery.isLoading && items.length === 0 && (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>No words yet</EmptyTitle>
              <EmptyDescription>
                Translate a word to build your vocab.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {/* detail dialog */}
        <Dialog
          open={!!selected}
          onOpenChange={(o) => {
            if (!o) setSelectedId(null);
          }}
        >
          {selected && (
            <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden px-0 py-3 sm:max-w-3xl">
              <DialogTitle className="sr-only">
                {selected.chinese} — {selected.english}
              </DialogTitle>
              <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-5 py-2">
                <div className="mb-5 flex items-start gap-5 pr-8">
                  <ChineseText
                    as="div"
                    className="min-w-18 text-center text-[44px] leading-none font-black"
                  >
                    {selected.chinese}
                  </ChineseText>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="text-red text-lg font-semibold">
                      {selected.pinyin}
                    </div>
                    <div className="text-text2 text-sm">
                      {selected.english}
                      {selected.meaning ? ` — ${selected.meaning}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {selected.topic && selected.topic !== "general" && (
                        <TagPill variant="topic">{selected.topic}</TagPill>
                      )}
                      {selected.hskLevel ? (
                        <TagPill variant="hsk">HSK {selected.hskLevel}</TagPill>
                      ) : null}
                      {(selected.tags ?? []).map((t, i) => (
                        <TagPill key={i} variant="custom">
                          {t}
                        </TagPill>
                      ))}
                    </div>
                  </div>
                </div>
                <WordDetailView
                  word={vocabToWord(selected)}
                  wordId={selected.id}
                  stats={{
                    meaning: {
                      reviewed: selected.meaningReviewed,
                      correct: selected.meaningCorrect,
                      lastReviewed: selected.meaningLastReviewed,
                    },
                    pinyin: {
                      reviewed: selected.pinyinReviewed,
                      correct: selected.pinyinCorrect,
                      lastReviewed: selected.pinyinLastReviewed,
                    },
                    tone: {
                      reviewed: selected.toneReviewed,
                      correct: selected.toneCorrect,
                      lastReviewed: selected.toneLastReviewed,
                    },
                    writing: {
                      reviewed: selected.writingReviewed,
                      correct: selected.writingCorrect,
                      lastReviewed: selected.writingLastReviewed,
                    },
                  }}
                />
              </div>
            </DialogContent>
          )}
        </Dialog>

        {items.map((w) => {
          const created = w.createdAt
            ? new Date(w.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "";
          return (
            <Card
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(w.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(w.id);
                }
              }}
              className="bg-card grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-app border-2 border-transparent px-5 py-4 shadow-(--shadow-sm-app) ring-0 transition-all hover:border-border focus-visible:border-red focus-visible:outline-none max-[740px]:grid-cols-[auto_1fr]"
            >
              <ChineseText
                as="div"
                className="min-w-[60px] text-center text-[28px] leading-none font-black"
              >
                {w.chinese}
              </ChineseText>
              <div className="flex flex-col gap-0.5">
                <div className="text-red text-sm font-semibold">
                  {w.pinyin}
                </div>
                <div className="text-text2 text-[13px]">
                  {w.english} — {w.meaning}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {w.topic && w.topic !== "general" && (
                    <TagPill variant="topic">{w.topic}</TagPill>
                  )}
                  {w.hskLevel ? (
                    <TagPill variant="hsk">HSK {w.hskLevel}</TagPill>
                  ) : null}
                  {(w.tags ?? []).map((t, i) => (
                    <TagPill key={i} variant="custom">
                      {t}
                    </TagPill>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <MasteryDimensionsBar
                  stats={{
                    meaning: {
                      reviewed: w.meaningReviewed,
                      correct: w.meaningCorrect,
                    },
                    pinyin: {
                      reviewed: w.pinyinReviewed,
                      correct: w.pinyinCorrect,
                    },
                    tone: {
                      reviewed: w.toneReviewed,
                      correct: w.toneCorrect,
                    },
                    writing: {
                      reviewed: w.writingReviewed,
                      correct: w.writingCorrect,
                    },
                  }}
                />
                <div className="text-text3 text-[10px]">{created}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete?")) {
                      deleteVocab.mutate({ id: w.id });
                    }
                  }}
                  className="border-border text-text3 hover:border-red hover:text-red hover:bg-red-soft h-auto rounded-[7px] border bg-white px-2.5 py-1 text-[10px] font-semibold"
                >
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value || "__all__"}
      onValueChange={(v) => onChange(!v || v === "__all__" ? "" : v)}
    >
      <SelectTrigger className="w-auto min-w-36">
        <SelectValue placeholder={placeholder}>
          {(v: string) =>
            !v || v === "__all__"
              ? placeholder
              : (options.find((o) => o.value === v)?.label ?? v)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

