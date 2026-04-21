"use client";

import { useState } from "react";

import { useSpeechSynthesis } from "~/lib/hooks/use-speech-synthesis";
import { cn } from "~/lib/utils";

type Props = {
  children: string;
  as?: "div" | "span" | "p";
  className?: string;
  speakable?: boolean;
};

export function ChineseText({
  children,
  as: Tag = "span",
  className,
  speakable = true,
}: Props) {
  const { speak } = useSpeechSynthesis();
  const [pulsing, setPulsing] = useState(false);

  const hasChinese = /[\u4e00-\u9fff]/.test(children);
  const clickable = speakable && hasChinese;

  return (
    <Tag
      className={cn(
        "font-chinese transition-colors",
        clickable && "hover:text-red cursor-pointer",
        pulsing && "speaking-pulse",
        className,
      )}
      onClick={
        clickable
          ? () => {
              setPulsing(true);
              setTimeout(() => setPulsing(false), 500);
              speak(children);
            }
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
