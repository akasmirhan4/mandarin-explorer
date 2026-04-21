"use client";

import { useState } from "react";

import { FlashcardsPanel } from "~/components/flashcards/flashcards-panel";
import { LibraryPanel } from "~/components/library/library-panel";
import { TranslatePanel } from "~/components/translate/translate-panel";
import { cn } from "~/lib/utils";
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
    <>
      <nav
        className="bg-card border-border mb-7 flex gap-1 rounded-xl border p-1"
        style={{ boxShadow: "var(--shadow-sm-app)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              "flex-1 cursor-pointer rounded-[10px] px-4 py-3 text-center text-sm font-semibold transition-all",
              active === t.id
                ? "bg-ink text-white"
                : "text-text2 hover:text-ink bg-transparent",
            )}
            style={
              active === t.id ? { boxShadow: "var(--shadow-sm-app)" } : undefined
            }
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 inline-block rounded-lg px-1.5 py-px text-[11px] font-bold",
                  active === t.id
                    ? "bg-white/20 text-white"
                    : "bg-border text-text3",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="animate-fade-up">
        {active === "translate" && <TranslatePanel />}
        {active === "vocab" && <LibraryPanel />}
        {active === "flashcards" && <FlashcardsPanel />}
      </div>
    </>
  );
}
