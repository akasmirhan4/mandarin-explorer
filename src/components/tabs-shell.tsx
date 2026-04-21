"use client";

import { useState } from "react";

import { FlashcardsPanel } from "~/components/flashcards/flashcards-panel";
import { LibraryPanel } from "~/components/library/library-panel";
import { TranslatePanel } from "~/components/translate/translate-panel";
import { Badge } from "~/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { api } from "~/trpc/react";

type TabId = "translate" | "vocab" | "flashcards";

export function TabsShell() {
  const [active, setActive] = useState<TabId>("translate");
  const { data: vocabCount } = api.vocab.count.useQuery(undefined, {
    staleTime: 30_000,
  });

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "translate", label: "Translate" },
    { id: "vocab", label: "My Vocab", count: vocabCount ?? 0 },
    { id: "flashcards", label: "Flashcards" },
  ];

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as TabId)}
      className="flex-col gap-0"
    >
      <TabsList
        className="bg-card border-border mb-7 flex h-auto w-full gap-1 rounded-xl border p-1"
        style={{ boxShadow: "var(--shadow-sm-app)" }}
      >
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="group/tab text-text2 hover:text-ink data-active:bg-ink data-active:text-white h-auto flex-1 cursor-pointer rounded-[10px] border-transparent bg-transparent px-4 py-3 text-center text-sm font-semibold transition-all data-active:shadow-(--shadow-sm-app)"
          >
            {t.label}
            {t.count !== undefined && (
              <Badge
                variant="secondary"
                className="bg-border text-text3 group-data-active/tab:bg-white/20 group-data-active/tab:text-white ml-1.5 h-auto rounded-lg border-transparent px-1.5 py-px text-[11px] font-bold"
              >
                {t.count}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="translate" className="animate-fade-up">
        <TranslatePanel />
      </TabsContent>
      <TabsContent value="vocab" className="animate-fade-up">
        <LibraryPanel />
      </TabsContent>
      <TabsContent value="flashcards" className="animate-fade-up">
        <FlashcardsPanel />
      </TabsContent>
    </Tabs>
  );
}
