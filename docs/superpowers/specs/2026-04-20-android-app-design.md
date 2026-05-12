# WriteQuran Android App — Design Spec

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

A native Android application for [writequran.com](https://writequran.com) built in Flutter. Full feature parity with the web app. Same visual identity, same Supabase backend, offline-first. Pixel-faithful to the mobile web layout.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Flutter (Dart) |
| State management | flutter_riverpod |
| Local DB | Drift (SQLite) |
| Backend / Auth | supabase_flutter |
| Google Sign-In | google_sign_in |
| Navigation | go_router |
| Connectivity | connectivity_plus |
| Arabic fonts | KFGQPC_Uthman_Taha_Naskh (bundled) + Scheherazade New fallback |
| Quran data | Bundled JSON asset (same source as web) |

---

## Architecture

Clean Architecture with three layers:

**Presentation** — Flutter widgets + Riverpod providers. One feature folder per screen.

**Domain** — Pure Dart entities, use cases, repository interfaces. Zero Flutter/Supabase imports.

**Data** — Repository implementations backed by Drift (local) and supabase_flutter (remote). A `SyncManager` debounces writes and flushes queued upserts when connectivity is restored.

### Folder Structure

```
lib/
├── core/              # theme, fonts, constants, router
├── features/
│   ├── auth/
│   ├── write/         # core typing feature
│   ├── review/        # mistake review
│   ├── memorize/      # memorization test
│   ├── progress/      # stats + heatmap
│   ├── leaderboard/
│   └── settings/
├── data/
│   ├── local/         # Drift DB tables + DAOs
│   ├── remote/        # Supabase queries + RPCs
│   └── sync/          # SyncManager
└── domain/            # entities + repository interfaces
```

---

## UI Design

Pixel-faithful to writequran.com mobile layout. No new design language — match exactly.

**Color palette:**
- Primary accent: `#D6C19E` (light), `#B18E4E` (dark)
- Background: `#FDFBF7` (light), `#171717` (dark)
- Text: `#1a1a1a` (light), `#f0f0f0` (dark)
- Borders: `rgba(0,0,0,0.08)` (light), `rgba(255,255,255,0.06)` (dark)

**Typography:**
- UI: Inter
- Logo: Gabriela (Google Font — available via `google_fonts` package)
- Quranic text: KFGQPC_Uthman_Taha_Naskh (bundled, ~3MB)

**Write screen layout (top → bottom):**
1. Fixed header: hamburger → "Write Quran" (Gabriela) → surah selector pill (centered) → auth avatar
2. Page/Juz/Ayah nav pill (tappable, opens jump dialog)
3. Scrollable Mushaf text: RTL Arabic, gold for typed chars, red+underline for wrong, muted for pending, gold underline cursor
4. Bottom panel (slides up, always visible on mobile):
   - Toolbar row: progress % badge | visibility buttons (hide/ayah/all) | keyboard toggle | heatmap | rewrite-ayah | rewrite | mistake badge
   - Arabic keyboard: 3 rows (12 keys each) + backspace + space row

**Theme:** Dark/light toggle in hamburger drawer, persisted locally and synced to `user_preferences`.

---

## Features

All features match the web app:

| Feature | Description |
|---|---|
| Write | Letter-by-letter or word-mode typing with real-time validation, mistake tracking, progress persistence |
| Review | Spaced repetition of weak spots (highest difficulty first) |
| Memorize | Random ayah selection within user-defined surah range, hidden-text test |
| Progress | Hifz score, letter count, accuracy, streak, 30-day activity heatmap, per-surah grid |
| Leaderboard | Global rankings via `get_leaderboard()` RPC, period filter (all-time/monthly/weekly), user profiles |
| Settings | Display name, privacy toggles, theme, language (EN/AR), account reset |

**Navigation:** Bottom tab bar (Write · Review · Memorize · Progress · Leaderboard) + hamburger drawer for Settings, typing mode, memorization range, theme, language.

---

## Data Layer

### Local (Drift / SQLite)

Mirrors Supabase schema exactly:

| Table | Usage |
|---|---|
| `current_progress_state` | Resume position across app launches |
| `surah_progress` | Per-surah typed indices (JSONB → SQLite JSON column), completion, mistakes |
| `mistake_stats` | Granular mistake records per character index |
| `user_preferences` | Theme, language, visibility mode, keyboard preference |
| `user_profiles` | Read-only cache of own profile |
| `leaderboard_cache` | TTL-cached leaderboard results (5 min TTL) |

**Quran text** — loaded from bundled JSON asset at startup into memory. No network call required.

### Remote (Supabase)

Same RPCs as web:
- `get_leaderboard()`
- `get_leaderboard_by_period(period_key)`
- `get_leaderboard_profile(username)`
- `get_public_profile_meta(username)`
- `is_username_available(candidate)`

### SyncManager

- Debounced 3s for progress/mistake writes (matches web `debouncedSyncLocalToCloud`)
- `connectivity_plus` detects online state
- Queued upserts survive app kill (stored in Drift, flushed on next launch with connectivity)
- All Supabase writes use `upsert` on unique constraints — idempotent

---

## Auth

**Flow:**
1. App launch → `supabase_flutter` checks persisted session
2. If no session → Auth screen with two options: Email/password | Continue with Google
3. Google: `google_sign_in` → ID token → `supabase.auth.signInWithIdToken()`
4. On success → session auto-persisted and refreshed by `supabase_flutter`
5. Unauthenticated users can practice locally; on first login all queued local progress syncs up to Supabase immediately

---

## Error Handling

- Network errors are silent (local-first); a subtle sync status indicator shows pending/failed state
- Auth errors shown inline on auth screen
- Invalid input (surah/ayah out of range) validated locally before any network call
- Supabase RPC errors fall back to cached data where available

---

## Out of Scope

- iOS (can ship later — same Flutter codebase, zero extra effort)
- Push notifications
- In-app purchases
- Offline Quran audio
