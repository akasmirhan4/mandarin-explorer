"use client";

import { useLayoutEffect, useRef, useState } from "react";

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

type IndicatorRect = { left: number; width: number };

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

  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useLayoutEffect(() => {
    const trigger = triggerRefs.current.get(active);
    const list = listRef.current;
    if (!trigger || !list) return;
    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    setIndicator({
      left: triggerRect.left - listRect.left,
      width: triggerRect.width,
    });
  }, [active, vocabCount]);

  useLayoutEffect(() => {
    if (!indicator || hasAnimated) return;
    const id = requestAnimationFrame(() => setHasAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [indicator, hasAnimated]);

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as TabId)}
      className="flex-col gap-0"
    >
      <TabsList
        ref={listRef}
        className="bg-card border-border mb-7 relative flex h-auto w-full gap-1 rounded-xl border p-1"
        style={{ boxShadow: "var(--shadow-sm-app)" }}
      >
        {indicator && (
          <div
            aria-hidden
            className="bg-ink pointer-events-none absolute top-1 bottom-1 rounded-lg"
            style={{
              left: indicator.left,
              width: indicator.width,
              boxShadow: "var(--shadow-sm-app)",
              transition: hasAnimated
                ? "left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          />
        )}
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            ref={(el) => {
              if (el) triggerRefs.current.set(t.id, el);
              else triggerRefs.current.delete(t.id);
            }}
            className="group/tab text-text2 hover:text-ink data-active:bg-transparent data-active:text-white group-data-[variant=default]/tabs-list:data-active:shadow-none relative z-10 h-auto flex-1 cursor-pointer rounded-lg border-transparent bg-transparent px-4 py-3 text-center text-sm font-semibold transition-colors"
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
