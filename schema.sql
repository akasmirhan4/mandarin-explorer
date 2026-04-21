-- ============================================
-- MANDARIN EXPLORER - Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor (SQL > New Query)
-- after creating a new project.

-- 1. Main vocabulary table
CREATE TABLE vocab_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core translation
  english TEXT NOT NULL,
  chinese TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  meaning TEXT,
  literal_meaning TEXT,
  context TEXT,
  
  -- Classification
  topic TEXT DEFAULT 'general',           -- food, travel, business, greeting, nature, emotion, etc.
  hsk_level INT CHECK (hsk_level BETWEEN 1 AND 9),  -- HSK 1-9 (new HSK scale)
  tags TEXT[] DEFAULT '{}',               -- custom tags array e.g. {'daily', 'formal', 'slang'}
  
  -- Character-level data (stored as JSONB for flexibility)
  -- Each entry: {char, pinyin, tone, meaning, radical, radical_pinyin, radical_meaning, radical_strokes, total_strokes}
  characters JSONB DEFAULT '[]',
  
  -- Example sentences
  -- Each entry: {chinese, pinyin, english}
  examples JSONB DEFAULT '[]',
  
  -- Spaced repetition / review
  mastery INT DEFAULT 0 CHECK (mastery BETWEEN 0 AND 5),  -- 0=new, 1=learning, 2-3=reviewing, 4-5=mastered
  times_reviewed INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ DEFAULT NOW(),  -- when to show again (spaced repetition)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_starred BOOLEAN DEFAULT FALSE
);

-- 2. Review history log (for tracking progress over time)
CREATE TABLE review_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_id UUID REFERENCES vocab_words(id) ON DELETE CASCADE,
  was_correct BOOLEAN NOT NULL,
  response_time_ms INT,              -- how fast they answered
  review_mode TEXT DEFAULT 'flashcard',  -- flashcard, quiz, typing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast queries
CREATE INDEX idx_vocab_topic ON vocab_words(topic);
CREATE INDEX idx_vocab_hsk ON vocab_words(hsk_level);
CREATE INDEX idx_vocab_mastery ON vocab_words(mastery);
CREATE INDEX idx_vocab_next_review ON vocab_words(next_review);
CREATE INDEX idx_vocab_created ON vocab_words(created_at DESC);
CREATE INDEX idx_vocab_tags ON vocab_words USING GIN(tags);
CREATE INDEX idx_review_word ON review_log(word_id);

-- 4. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vocab_updated_at
  BEFORE UPDATE ON vocab_words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security (RLS)
-- Since this is a personal app using anon key, we'll keep it simple.
-- Enable RLS but allow all operations via anon key.
ALTER TABLE vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON vocab_words
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON review_log
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Useful views

-- Words due for review (spaced repetition)
CREATE VIEW words_due_for_review AS
SELECT * FROM vocab_words
WHERE next_review <= NOW()
ORDER BY mastery ASC, next_review ASC;

-- Stats by topic
CREATE VIEW topic_stats AS
SELECT 
  topic,
  COUNT(*) as total_words,
  ROUND(AVG(mastery), 1) as avg_mastery,
  COUNT(*) FILTER (WHERE mastery >= 4) as mastered,
  COUNT(*) FILTER (WHERE mastery = 0) as new_words
FROM vocab_words
GROUP BY topic
ORDER BY total_words DESC;

-- Tone distribution
CREATE VIEW tone_distribution AS
SELECT 
  tone_val::int as tone,
  COUNT(*) as count
FROM vocab_words,
  jsonb_array_elements(characters) as chars,
  jsonb_extract_path_text(chars, 'tone') as tone_val
GROUP BY tone_val
ORDER BY tone_val;
