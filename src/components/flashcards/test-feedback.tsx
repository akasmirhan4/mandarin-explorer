"use client";

import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { Grade } from "~/lib/flashcard-grading";

type Props = {
  grade: Grade;
  correctAnswer: React.ReactNode;
  userAnswer?: React.ReactNode;
  onNext: () => void;
};

const GRADE_META: Record<Grade, { label: string; accent: string; ring: string }> = {
  exact: {
    label: "✓ Correct — Easy",
    accent: "text-jade",
    ring: "bg-jade-soft",
  },
  close: {
    label: "≈ Almost — Hard",
    accent: "text-gold",
    ring: "bg-gold-soft",
  },
  wrong: {
    label: "✖ Wrong",
    accent: "text-red",
    ring: "bg-red-soft",
  },
  gave_up: {
    label: "Skipped — Wrong",
    accent: "text-red",
    ring: "bg-red-soft",
  },
};

export function TestFeedback({ grade, correctAnswer, userAnswer, onNext }: Props) {
  const meta = GRADE_META[grade];

  useEffect(() => {
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 150);
    const handler = (e: KeyboardEvent) => {
      if (!armed) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.clearTimeout(armTimer);
      window.removeEventListener("keydown", handler);
    };
  }, [onNext]);

  return (
    <div className="space-y-3">
      <Card className={cn("rounded-[14px] p-0 shadow-(--shadow-sm-app) ring-0", meta.ring)}>
        <CardContent className="space-y-2 px-5 py-4">
          <div className={cn("text-[11px] font-bold tracking-[1.5px] uppercase", meta.accent)}>
            {meta.label}
          </div>
          {userAnswer !== undefined && (
            <div className="text-text3 text-xs">
              <span className="mr-1 font-semibold">Your answer:</span>
              <span>{userAnswer || <em className="text-text3">(empty)</em>}</span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-text3 mr-1 text-xs font-semibold">Correct:</span>
            <span className="font-medium">{correctAnswer}</span>
          </div>
        </CardContent>
      </Card>
      <Button
        type="button"
        onClick={onNext}
        className="bg-red hover:bg-red/90 w-full rounded-[12px] py-3 text-sm font-semibold text-white"
      >
        Next ↵
      </Button>
    </div>
  );
}
