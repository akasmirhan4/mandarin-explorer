"use client";

import { Volume2 } from "lucide-react";

import { HoverPopover } from "~/components/shared/hover-popover";
import type {
  CharacterDataInput,
  WordBreakdown,
} from "~/server/lib/schemas/translation";

const CHINESE_RE = /[一-鿿]/;

type CompoundInfo = {
  chinese: string;
  pinyin: string;
  english: string;
  characters: CharacterDataInput[];
};

type CharSlot = {
  char: string;
  isChinese: boolean;
  charData?: CharacterDataInput;
  compound?: CompoundInfo;
  groupId: string;
};

function buildCharSlots(
  sentence: string,
  words: WordBreakdown[],
  parentCharacters: CharacterDataInput[],
): CharSlot[] {
  const charMap = new Map<string, CharacterDataInput>();
  for (const c of parentCharacters) {
    if (!charMap.has(c.char)) charMap.set(c.char, c);
  }
  for (const w of words) {
    for (const c of w.characters) {
      if (!charMap.has(c.char)) charMap.set(c.char, c);
    }
  }

  const sortedWords = [...words]
    .filter((w) => w.chinese.length > 0)
    .sort((a, b) => b.chinese.length - a.chinese.length);

  const slots: CharSlot[] = [];
  let i = 0;
  let groupCounter = 0;
  while (i < sentence.length) {
    let matched = false;
    for (const w of sortedWords) {
      if (w.chinese.length > 1 && sentence.startsWith(w.chinese, i)) {
        const compound: CompoundInfo = {
          chinese: w.chinese,
          pinyin: w.pinyin_marks,
          english: w.english,
          characters: w.characters,
        };
        const gid = `g${groupCounter++}`;
        for (const ch of Array.from(w.chinese)) {
          slots.push({
            char: ch,
            isChinese: CHINESE_RE.test(ch),
            charData: charMap.get(ch),
            compound,
            groupId: gid,
          });
        }
        i += w.chinese.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = sentence[i] ?? "";
    slots.push({
      char: ch,
      isChinese: CHINESE_RE.test(ch),
      charData: charMap.get(ch),
      groupId: `s${groupCounter++}`,
    });
    i++;
  }
  return slots;
}

type SlotGroup = {
  groupId: string;
  slots: CharSlot[];
  compound?: CompoundInfo;
};

function groupSlots(slots: CharSlot[]): SlotGroup[] {
  const out: SlotGroup[] = [];
  for (const s of slots) {
    const last = out[out.length - 1];
    if (last && last.groupId === s.groupId) {
      last.slots.push(s);
    } else {
      out.push({ groupId: s.groupId, slots: [s], compound: s.compound });
    }
  }
  return out;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "by",
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "and",
  "or",
  "but",
]);

function normalizeEnglishWord(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
}

function buildEnglishLookup(words: WordBreakdown[]) {
  const map = new Map<string, WordBreakdown>();
  for (const w of words) {
    const tokens = w.english
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeEnglishWord)
      .filter((t) => t && !STOP_WORDS.has(t));
    for (const t of tokens) {
      if (!map.has(t)) map.set(t, w);
    }
  }
  return map;
}

type Props = {
  chinese: string;
  pinyin: string;
  english: string;
  words: WordBreakdown[];
  parentCharacters?: CharacterDataInput[];
  onSpeakChinese?: (text: string) => void;
};

export function AnnotatedExample({
  chinese,
  pinyin,
  english,
  words,
  parentCharacters = [],
  onSpeakChinese,
}: Props) {
  const slots = buildCharSlots(chinese, words, parentCharacters);
  const groups = groupSlots(slots);
  const englishLookup = buildEnglishLookup(words);
  const englishParts = english.split(/(\s+|[.,!?;:"()\[\]])/).filter(Boolean);

  return (
    <>
      <div className="font-chinese mb-1 text-base font-bold leading-relaxed">
        {groups.map((group, i) => (
          <ChineseGroup
            key={`${group.groupId}-${i}`}
            group={group}
            onSpeak={onSpeakChinese}
          />
        ))}
        {onSpeakChinese && (
          <button
            type="button"
            onClick={() => onSpeakChinese(chinese)}
            aria-label="Play sentence"
            className="hover:bg-gold-soft hover:text-gold text-text3 ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded align-middle transition-colors"
          >
            <Volume2 className="size-3.5" />
          </button>
        )}
      </div>
      <div className="text-red mb-px text-xs">{pinyin}</div>
      <div className="text-text2 text-xs leading-relaxed">
        {englishParts.map((part, i) => {
          const normalized = normalizeEnglishWord(part);
          const match = normalized ? englishLookup.get(normalized) : undefined;
          if (!match) return <span key={i}>{part}</span>;
          return <EnglishWordTooltip key={i} word={part} breakdown={match} />;
        })}
      </div>
    </>
  );
}

function ChineseGroup({
  group,
  onSpeak,
}: {
  group: SlotGroup;
  onSpeak?: (text: string) => void;
}) {
  const allChinese = group.slots.every((s) => s.isChinese);
  if (!allChinese && group.slots.length === 1) {
    return <span>{group.slots[0]!.char}</span>;
  }

  const speakTarget = group.compound
    ? group.compound.chinese
    : group.slots.map((s) => s.char).join("");
  const firstSlot = group.slots[0]!;
  const charData = firstSlot.charData;
  const hasContent = !!(group.compound || charData?.meaning || charData?.pinyin);

  if (!hasContent) {
    return (
      <span
        className="hover:text-red cursor-pointer transition-colors"
        onClick={onSpeak ? () => onSpeak(speakTarget) : undefined}
      >
        {group.slots.map((s) => s.char).join("")}
      </span>
    );
  }

  return (
    <HoverPopover
      triggerClassName="hover:text-red hover:bg-gold-soft cursor-pointer rounded-sm px-px transition-colors"
      onClick={onSpeak ? () => onSpeak(speakTarget) : undefined}
      content={<TooltipBody group={group} />}
    >
      {group.slots.map((s) => s.char).join("")}
    </HoverPopover>
  );
}

function TooltipBody({ group }: { group: SlotGroup }) {
  if (group.compound) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-chinese text-sm font-bold">
            {group.compound.chinese}
          </span>
          <span className="text-[10px] opacity-80">
            {group.compound.pinyin}
          </span>
        </div>
        <div className="text-[11px] font-medium leading-snug">
          {group.compound.english}
        </div>
        {group.compound.characters.length > 0 && (
          <div className="border-background/20 flex flex-col gap-0.5 border-t pt-1 text-[10px] opacity-70">
            {group.compound.characters.map((c, i) => (
              <div key={i}>
                <span className="font-chinese">{c.char}</span>
                {c.pinyin ? ` (${c.pinyin})` : ""} · {c.meaning}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  const charData = group.slots[0]?.charData;
  return (
    <div className="flex flex-col gap-0.5">
      {charData?.pinyin && (
        <div className="text-[10px] opacity-80">{charData.pinyin}</div>
      )}
      <div className="text-[11px] font-medium leading-snug">
        {charData?.meaning ?? group.slots[0]?.char}
      </div>
    </div>
  );
}

function EnglishWordTooltip({
  word,
  breakdown,
}: {
  word: string;
  breakdown: WordBreakdown;
}) {
  return (
    <HoverPopover
      triggerClassName="hover:text-ink decoration-text3 cursor-help underline decoration-dotted underline-offset-2 transition-colors"
      content={
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-chinese text-sm font-bold">
              {breakdown.chinese}
            </span>
            <span className="text-[10px] opacity-80">
              {breakdown.pinyin_marks}
            </span>
          </div>
          <div className="text-[11px] font-medium leading-snug">
            {breakdown.english}
          </div>
          {breakdown.meaning && breakdown.meaning !== breakdown.english && (
            <div className="border-background/20 border-t pt-1 text-[10px] leading-snug opacity-70">
              {breakdown.meaning}
            </div>
          )}
        </div>
      }
    >
      {word}
    </HoverPopover>
  );
}
