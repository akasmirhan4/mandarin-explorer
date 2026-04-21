"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChineseText } from "~/components/shared/chinese-text";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { VocabWord } from "~/server/db/schema";

type Response = "wrong" | "hard" | "easy";

export function FlashcardsPanel() {
  const utils = api.useUtils();
  const dueQuery = api.vocab.getDueForReview.useQuery({ limit: 100 });
  const submitReview = api.review.submitReview.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (dueQuery.data) {
      setQueue(dueQuery.data);
      setIdx(0);
      setCorrect(0);
      setTotal(0);
      setRevealed(false);
    }
  }, [dueQuery.data]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!revealed) return;
      if (e.key === "1") handleResponse("wrong");
      else if (e.key === "2") handleResponse("hard");
      else if (e.key === "3") handleResponse("easy");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, idx, queue]);

  const currentWord = queue[idx];

  const handleResponse = (response: Response) => {
    if (!currentWord) return;
    const wasCorrect = response !== "wrong";
    setTotal((t) => t + 1);
    if (wasCorrect) setCorrect((c) => c + 1);

    submitReview.mutate(
      { wordId: currentWord.id, response },
      {
        onSuccess: () => {
          void utils.vocab.list.invalidate();
          void utils.vocab.count.invalidate();
        },
      },
    );

    setIdx((i) => i + 1);
    setRevealed(false);
  };

  const restart = () => {
    void dueQuery.refetch();
  };

  if (dueQuery.isLoading) {
    return (
      <p className="text-text3 py-12 text-center">Loading flashcards…</p>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="text-text3 py-12 text-center">
        <p className="mb-2 text-base">📚 No vocab yet</p>
        <p className="text-sm">Save some words first!</p>
      </div>
    );
  }

  const dueRemaining = Math.max(0, queue.length - idx);

  return (
    <div className="mx-auto max-w-[480px]">
      <div className="mb-5 flex justify-center gap-3">
        <Stat num={dueRemaining} label="Due" />
        <Stat num={correct} label="Correct" />
        <Stat num={total} label="Reviewed" />
      </div>

      {idx >= queue.length ? (
        <div className="py-12 text-center">
          <h3 className="mb-2 text-2xl font-bold">🎉 Done!</h3>
          <p className="text-text2 mb-4 text-sm">
            {correct}/{total} correct (
            {total ? Math.round((correct / total) * 100) : 0}%)
          </p>
          <Button
            type="button"
            onClick={restart}
            className="bg-red hover:bg-red/90 rounded-[12px] px-7 py-3 text-sm font-semibold text-white"
          >
            Review Again
          </Button>
        </div>
      ) : currentWord ? (
        <>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className={cn(
              "bg-card mb-4 flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-[18px] px-8 py-10 text-center transition-transform hover:-translate-y-0.5",
            )}
            style={{ boxShadow: "var(--shadow-md-app)" }}
          >
            <div className="text-text3 mb-3 text-[10px] font-bold tracking-[2px] uppercase">
              What does this mean?
            </div>
            <ChineseText
              as="div"
              className="mb-2 text-[56px] leading-tight font-black max-[740px]:text-[42px]"
              speakable={false}
            >
              {currentWord.chinese}
            </ChineseText>
            <div className="text-red text-xl font-semibold">
              {currentWord.pinyin}
            </div>
            <div
              className={cn(
                "text-jade mt-4 text-lg font-medium transition-opacity",
                revealed ? "opacity-100" : "opacity-0",
              )}
            >
              {currentWord.english} — {currentWord.meaning}
            </div>
            {!revealed && (
              <div className="text-text3 mt-3 text-xs">Tap to reveal</div>
            )}
          </button>

          <div className="flex gap-2">
            <RespBtn
              show={revealed}
              onClick={() => handleResponse("wrong")}
              className="bg-red-soft text-red hover:bg-red hover:text-white"
              label="✖ Wrong"
            />
            <RespBtn
              show={revealed}
              onClick={() => handleResponse("hard")}
              className="bg-gold-soft text-gold hover:bg-gold hover:text-white"
              label="❓ Hard"
            />
            <RespBtn
              show={revealed}
              onClick={() => handleResponse("easy")}
              className="bg-jade-soft text-jade hover:bg-jade hover:text-white"
              label="✔ Easy"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <div
      className="bg-card rounded-xl px-5 py-3 text-center"
      style={{ boxShadow: "var(--shadow-sm-app)" }}
    >
      <div className="text-2xl font-bold">{num}</div>
      <div className="text-text3 text-[10px] font-semibold tracking-[1px] uppercase">
        {label}
      </div>
    </div>
  );
}

function RespBtn({
  show,
  onClick,
  className,
  label,
}: {
  show: boolean;
  onClick: () => void;
  className: string;
  label: string;
}) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 cursor-pointer rounded-[12px] px-0 py-3.5 text-sm font-semibold transition-all",
        className,
      )}
    >
      {label}
    </button>
  );
}
