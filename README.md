# 词语探索 — Mandarin Explorer (T3)

Next.js App Router + TypeScript + tRPC + Drizzle + Tailwind + shadcn/ui rebuild of the original single-file Mandarin learning app.

## Setup

### 1. Fill in `.env`

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

- `DATABASE_URL`: the **pooled** Supabase connection string (port 6543). Get it from Supabase dashboard → Project Settings → Database → Connection string (Transaction pooler).
- `ANTHROPIC_API_KEY`: server-side only (not prefixed with `NEXT_PUBLIC_`). It never reaches the browser.

### 2. Baseline the existing Supabase schema (one-time)

The `vocab_words` and `review_log` tables already exist in Supabase. Drizzle owns the schema going forward, but the initial migration must be marked applied so it doesn't try to recreate them.

```bash
npm run db:generate     # writes drizzle/0000_*.sql matching the live schema
```

Inspect the generated SQL to confirm it mirrors the existing tables. Then, in the **Supabase SQL editor**, run:

```sql
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);
-- Use the hash from drizzle/meta/_journal.json for migration 0000
INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
VALUES ('<hash>', <epoch-ms>);
```

From here on, `npm run db:migrate` is a no-op for 0000 and applies any future migrations cleanly. **Never run `db:push`** — that script has been removed from `package.json` to prevent accidental schema overwrites.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a new Drizzle migration from `schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:pull` | Introspect live DB into a throwaway schema (sanity check only) |
| `npm run db:studio` | Open Drizzle Studio to browse data |

## Architecture

```
src/
├── app/
│   ├── layout.tsx                  Fonts, providers, Toaster
│   ├── page.tsx                    RSC shell, hydrates tRPC cache
│   └── api/trpc/[trpc]/route.ts    tRPC handler
│
├── components/
│   ├── tabs-shell.tsx              Main tabs (Translate / Vocab / Flashcards)
│   ├── shared/                     ChineseText, ToneBadge, TagPill
│   ├── translate/                  TranslatePanel + workspace + StrokeOrderViewer
│   ├── library/                    LibraryPanel (filters, list, delete)
│   ├── flashcards/                 FlashcardsPanel (SRS session)
│   └── ui/                         shadcn/ui components
│
├── lib/
│   ├── hooks/use-speech-synthesis.ts
│   └── utils.ts                    shadcn cn() helper
│
├── server/
│   ├── db/
│   │   ├── schema.ts               vocabWords, reviewLog (with typed JSONB)
│   │   ├── types.ts                CharacterData, ExampleSentence
│   │   └── index.ts                Drizzle client
│   ├── lib/
│   │   ├── anthropic.ts            Server-only SDK client
│   │   ├── srs.ts                  Pure SRS interval logic
│   │   └── schemas/translation.ts  Zod schema for translation payload
│   └── api/
│       ├── root.ts                 appRouter
│       ├── trpc.ts                 context + middleware
│       └── routers/
│           ├── health.ts           DB connectivity check
│           ├── vocab.ts            list / count / create / delete / getDueForReview / toggleStar
│           ├── translate.ts        Anthropic Claude translation (server-only)
│           └── review.ts           submitReview (SRS update + review_log insert)
│
└── styles/globals.css              Design tokens ported from the original index.html
```

## Notes

- **Security**: the Anthropic API key lives server-side only. The old browser-direct call (`anthropic-dangerous-direct-browser-access`) is gone.
- **Client-only bits**: HanziWriter (dynamic `import()` inside `useEffect`) and `speechSynthesis` stay in Client Components.
- **Styling**: the original palette, fonts (Noto Serif SC + DM Sans), card shadows, and tone colors are preserved via CSS variables in `globals.css`. shadcn/ui primitives handle behavior/a11y; Tailwind utilities apply the app's visual tokens.
