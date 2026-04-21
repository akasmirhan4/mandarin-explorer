import type { VocabWord } from "~/server/db/schema";

const MACRON = "̄";
const ACUTE = "́";
const CARON = "̌";
const GRAVE = "̀";
const COMBINING_RANGE_G = /[̀-ͯ]/g;
const HAS_COMBINING = /[̀-ͯ]/;

const TONE_BY_COMBINING: Record<string, number> = {
  [MACRON]: 1,
  [ACUTE]: 2,
  [CARON]: 3,
  [GRAVE]: 4,
};

export function toneMarkToNumber(pinyin: string): string {
  return pinyin
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((syllable) => {
      const decomposed = syllable.normalize("NFD");
      let base = "";
      let tone = 0;
      for (const ch of decomposed) {
        const marked = TONE_BY_COMBINING[ch];
        if (marked) tone = marked;
        else base += ch;
      }
      const cleaned = base.toLowerCase();
      return tone > 0 ? `${cleaned}${tone}` : cleaned;
    })
    .join(" ");
}

export function normalizePinyinAnswer(input: string): string {
  let s = input.trim().toLowerCase();
  if (HAS_COMBINING.test(s.normalize("NFD"))) {
    s = toneMarkToNumber(s);
  }
  return s.replace(/[^a-z0-9]/g, "").replace(/[05]/g, "");
}

export function canonicalPinyin(word: Pick<VocabWord, "pinyin" | "characters">): string {
  const chars = word.characters ?? [];
  if (chars.length > 0) {
    return chars
      .map((c) => {
        const base = c.pinyin.normalize("NFD").replace(COMBINING_RANGE_G, "").toLowerCase();
        const cleaned = base.replace(/[^a-z]/g, "");
        return c.tone > 0 && c.tone < 5 ? `${cleaned}${c.tone}` : cleaned;
      })
      .join("");
  }
  return normalizePinyinAnswer(word.pinyin);
}

export function stripTones(pinyin: string): string {
  return pinyin.normalize("NFD").replace(COMBINING_RANGE_G, "");
}

export type PinyinGrade = "exact" | "close" | "wrong";

export function gradePinyin(
  userInput: string,
  word: Pick<VocabWord, "pinyin" | "characters">,
): PinyinGrade {
  const user = normalizePinyinAnswer(userInput);
  const target = canonicalPinyin(word);
  if (!user) return "wrong";
  if (user === target) return "exact";
  const userNoTones = user.replace(/[1-4]/g, "");
  const targetNoTones = target.replace(/[1-4]/g, "");
  if (userNoTones && userNoTones === targetNoTones) return "close";
  return "wrong";
}
