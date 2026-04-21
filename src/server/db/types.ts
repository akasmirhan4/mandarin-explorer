export interface CharacterData {
  char: string;
  pinyin: string;
  tone: number;
  meaning: string;
  radical: string;
  radical_pinyin: string;
  radical_meaning: string;
  radical_strokes: number;
  total_strokes: number;
}

export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
}
