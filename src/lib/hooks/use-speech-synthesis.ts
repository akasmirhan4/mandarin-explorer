"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechSynthesis() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [available, setAvailable] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setAvailable(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const zhCN = voices.find((v) => /zh[-_]CN/i.test(v.lang));
      const zhAny = voices.find((v) => /zh/i.test(v.lang));
      const chosen = zhCN ?? zhAny ?? null;
      voiceRef.current = chosen;
      setVoice(chosen);
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text)
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.85;
    if (voiceRef.current) utterance.voice = voiceRef.current;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, available, hasChineseVoice: voice !== null };
}
