# Agent Guide — WriteQuran

## Read First

**This project uses Next.js 16 with React 19.** Both versions contain breaking changes from what most training data covers. Before writing any Next.js or React code:

1. Read the relevant guide in `node_modules/next/dist/docs/`.
2. Heed all deprecation notices in those docs — they are authoritative.
3. Do not assume App Router, Server Components, or hooks behave as they did in earlier versions without verifying.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript |
| Backend / Auth / DB | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Testing | Playwright |

---

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
    write/       # Core typing practice
    review/      # Mistake review
    memorize/    # Memorization test mode
    progress/    # User progress dashboard
    leaderboard/ # Public leaderboard
    settings/    # User settings
    auth/        # Auth-related routes
  components/    # Shared UI components
  lib/           # Supabase client setup and server utilities
  shared/        # Shared types and constants
  utils/         # Helper functions (text normalization, etc.)
  data/          # Static Quran data (see src/data/README.md)
  middleware.ts  # Auth middleware (Supabase session handling)
```

---

## Quran Data

- The Quran text lives in `src/data/quran-uthmani.json` (Tanzil Uthmani source).
- Read `src/data/README.md` before touching anything related to display text, check strings, or the Basmala/ayah-end marker logic.
- Do not modify the JSON file or the text pipeline without understanding the provenance and transformation layers documented there.

---

## Key Conventions

- **RTL/LTR:** The UI supports Arabic (RTL) and English (LTR). Always consider both directions when touching layout or text-rendering code.
- **Auth:** Authentication is handled by Supabase. Use the SSR-compatible client from `src/lib/`. Do not bypass `middleware.ts`.
- **Typing validation:** The `checkString` layer (diacritic-stripped, Alef-normalized) is used only for keystroke matching. Never display it to the user.
- **No unnecessary changes:** Only modify what is required for the task. Do not refactor, reformat, or "improve" unrelated code.

---

## Environment Variables

Supabase credentials are required at runtime. Expected variables (in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit `.env.local` or any file containing real credentials.

---

## Running Locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
npm run lint     # ESLint
npx playwright test  # end-to-end tests
```
