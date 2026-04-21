"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type HanziWriterInstance = {
  cancelQuiz: () => void;
  hideCharacter: () => void;
  animateCharacter: (opts?: { onComplete?: () => void }) => void;
  quiz: (opts: {
    onMistake?: () => void;
    onCorrectStroke?: (data: {
      strokeNum: number;
      totalStrokes: number;
    }) => void;
    onComplete?: (data: { totalMistakes: number }) => void;
  }) => void;
};

export function StrokeOrderViewer({ character }: { character: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);
  const loopingRef = useRef(false);

  const [feedback, setFeedback] = useState<{
    text: string;
    variant: "correct" | "mistake" | "info" | "";
  }>({ text: "", variant: "" });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !character) return;

    let cancelled = false;

    void import("hanzi-writer").then(({ default: HanziWriter }) => {
      if (cancelled || !el) return;
      el.innerHTML = "";
      const size = el.offsetWidth || 280;
      const instance = HanziWriter.create(el, character, {
        width: size,
        height: size,
        padding: 18,
        showOutline: true,
        showCharacter: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        strokeColor: "#16161a",
        outlineColor: "#e0d8cc",
        highlightColor: "#d93025",
        drawingColor: "#16161a",
        drawingWidth: 6,
        showHintAfterMisses: 3,
        highlightOnComplete: true,
        charDataLoader: (ch, ok, er) => {
          fetch(
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(ch)}.json`,
          )
            .then((r) => r.json())
            .then(ok)
            .catch(er);
        },
      }) as unknown as HanziWriterInstance;
      writerRef.current = instance;
    });

    return () => {
      cancelled = true;
      loopingRef.current = false;
      if (el) el.innerHTML = "";
      writerRef.current = null;
    };
  }, [character]);

  const doLoop = () => {
    if (!loopingRef.current || !writerRef.current) return;
    writerRef.current.hideCharacter();
    setTimeout(() => {
      if (!loopingRef.current || !writerRef.current) return;
      writerRef.current.animateCharacter({
        onComplete: () => setTimeout(doLoop, 600),
      });
    }, 150);
  };

  const onAnimate = () => {
    if (!writerRef.current) return;
    loopingRef.current = false;
    setFeedback({ text: "", variant: "" });
    writerRef.current.cancelQuiz();
    writerRef.current.hideCharacter();
    setTimeout(() => writerRef.current?.animateCharacter(), 150);
  };

  const onLoop = () => {
    if (!writerRef.current) return;
    setFeedback({ text: "", variant: "" });
    writerRef.current.cancelQuiz();
    loopingRef.current = true;
    doLoop();
  };

  const onQuiz = () => {
    if (!writerRef.current) return;
    loopingRef.current = false;
    setFeedback({ text: "Draw each stroke!", variant: "info" });
    writerRef.current.hideCharacter();
    writerRef.current.quiz({
      onMistake: () => setFeedback({ text: "Try again!", variant: "mistake" }),
      onCorrectStroke: (d) =>
        setFeedback({
          text: `Stroke ${d.strokeNum + 1}/${d.totalStrokes}`,
          variant: "correct",
        }),
      onComplete: (d) =>
        setFeedback({
          text:
            d.totalMistakes === 0
              ? "Perfect!"
              : `Done! ${d.totalMistakes} mistake(s)`,
          variant: d.totalMistakes === 0 ? "correct" : "info",
        }),
    });
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="border-border mb-3.5 aspect-square w-full overflow-hidden rounded-xl border-2 bg-white"
      />
      <div className="flex gap-1.5">
        <WriterButton onClick={onAnimate}>Animate</WriterButton>
        <WriterButton onClick={onLoop}>Loop</WriterButton>
        <WriterButton onClick={onQuiz} variant="jade">
          Quiz Me
        </WriterButton>
      </div>
      <div
        className={cn(
          "mt-2.5 flex min-h-[34px] items-center justify-center rounded-[9px] px-3 py-2 text-xs font-semibold",
          feedback.variant === "correct" && "bg-jade-soft text-jade",
          feedback.variant === "mistake" && "bg-red-soft text-red",
          feedback.variant === "info" && "text-text2 bg-black/5",
        )}
      >
        {feedback.text}
      </div>
    </div>
  );
}

function WriterButton({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant?: "jade";
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "border-border text-ink h-auto flex-1 rounded-[9px] border-2 bg-white px-0 py-2.5 text-[11px] font-semibold",
        variant === "jade"
          ? "border-jade bg-jade hover:bg-jade/90 text-white"
          : "hover:bg-ink hover:border-ink hover:text-white",
      )}
    >
      {children}
    </Button>
  );
}
