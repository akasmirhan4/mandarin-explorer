"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ChineseText } from "~/components/shared/chinese-text";
import { TagPill } from "~/components/shared/tag-pill";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

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

const TONES = ["1", "2", "3", "4"];

type MasteryBucket = "new" | "learning" | "reviewing" | "mastered";

export function LibraryPanel() {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [masteryBucket, setMasteryBucket] = useState<string>("");

  const utils = api.useUtils();
  const listQuery = api.vocab.list.useQuery({
    search: search || undefined,
    topic: topic || undefined,
    tone: tone ? Number(tone) : undefined,
    masteryBucket: (masteryBucket as MasteryBucket) || undefined,
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
          options={TONES.map((t) => ({ value: t, label: `${t}${ord(t)} Tone` }))}
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

        {items.map((w) => {
          const m = w.mastery ?? 0;
          const created = w.createdAt
            ? new Date(w.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "";
          return (
            <Card
              key={w.id}
              className="bg-card grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-app border-2 border-transparent px-5 py-4 shadow-(--shadow-sm-app) ring-0 transition-all hover:border-border max-[740px]:grid-cols-[auto_1fr]"
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
                <div className="bg-border h-1.5 w-[60px] overflow-hidden rounded-[3px]">
                  <div className={cn("mastery-fill", `m${m}`)} />
                </div>
                <div className="text-text3 text-[10px]">{created}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
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
      <SelectTrigger className="border-border focus:border-red data-[placeholder]:text-ink w-auto min-w-[140px] rounded-[10px] border-2 bg-white px-3 py-2.5 text-[13px] shadow-none focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder={placeholder} />
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

function ord(n: string) {
  const map: Record<string, string> = { "1": "st", "2": "nd", "3": "rd" };
  return map[n] ?? "th";
}
