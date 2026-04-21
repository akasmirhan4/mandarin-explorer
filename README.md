# 词语探索 — Mandarin Explorer

A Mandarin Chinese learning tool that translates English words, shows stroke order animations, radical breakdowns, pronunciation with tone guides, and saves everything to a personal vocabulary tracker with flashcard review.

## Features

- **Translate** — Type any English word, get Chinese translations with pinyin, meaning, and context
- **Stroke Order** — Interactive stroke animations and quizzing via [HanziWriter](https://hanziwriter.org/)
- **Pronunciation** — Click any Chinese text to hear it spoken (Web Speech API)
- **Radical Breakdown** — See the building blocks of each character
- **Auto-save Vocab** — Every translation auto-saves to Supabase with AI-assigned topic, HSK level, and tags
- **Vocab Library** — Filter by topic, tone, mastery level, or search
- **Flashcards** — Spaced repetition review with mastery tracking

## Tech Stack

- Vanilla HTML/CSS/JS (single file)
- [HanziWriter](https://hanziwriter.org/) — stroke order animations
- [Supabase](https://supabase.com/) — vocab database
- [Anthropic Claude API](https://docs.anthropic.com/) — translation + auto-tagging
- Web Speech API — pronunciation

## Setup

### 1. Clone and open in VS Code

```bash
cd mandarin-explorer
code .
```

### 2. Add your API keys

Copy the example config and add your keys:

```bash
cp config.example.js config.js
```

Edit `config.js`:

```js
const CONFIG = {
  ANTHROPIC_API_KEY: "sk-ant-api03-...",  // from console.anthropic.com
  SUPABASE_URL: "https://ocbnvtiywohkxzbvtcqg.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

> `config.js` is gitignored — your keys stay local.

### 3. Set up Supabase (if not already done)

Run the SQL in `schema.sql` in your Supabase project's SQL Editor.

### 4. Run locally

```bash
npm run dev
```

This starts a local server at `http://localhost:3000` with hot reload.

Alternatively, use the VS Code **Live Server** extension — right-click `index.html` → "Open with Live Server".

## Project Structure

```
mandarin-explorer/
├── index.html          # The entire app (HTML + CSS + JS)
├── config.js           # Your API keys (gitignored)
├── config.example.js   # Template for config
├── schema.sql          # Supabase database schema
├── package.json        # Dev server script
├── .gitignore
└── README.md
```

## Notes

- The Anthropic API is called directly from the browser using `anthropic-dangerous-direct-browser-access` header. This is fine for personal use. For production, route through a backend proxy.
- The Supabase anon key is safe for client-side use — it's designed for that. RLS policies control access.
- Pronunciation quality depends on your browser/OS Chinese voice. Chrome on macOS/Windows typically has good Mandarin voices.
