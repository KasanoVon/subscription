# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start auth API server (port 8787, required for auth/state persistence)
npm run server

# Start frontend dev server (port 5173, proxies /api to :8787)
npm run dev

# Build for production
npm run build
```

Both `npm run server` and `npm run dev` must be running simultaneously for full functionality.

## Architecture

Two-process architecture:

**Backend** (`server/index.js`) — Express + SQLite (Node ESM)
- Runs on `http://localhost:8787`
- SQLite DB at `server/subnote.db` (auto-created on first run)
- Tables: `users`, `sessions`, `user_states`
- Session tokens stored in `Authorization: Bearer <token>` header, 30-day expiry
- `/api/state` stores the entire `AppState` JSON blob per user (PUT = upsert, GET = restore)

**Frontend** (`src/`) — React + TypeScript + Vite
- Vite proxies `/api/*` to `:8787` (see `vite.config.ts`)
- Auth flow: `AuthContext` → token in `localStorage` → restored on mount via `/api/auth/session`
- App state flow: `AppContext` → loaded from `/api/state` on login, saved on every state change
- State is also mirrored to `localStorage` (key: `subnote_state_{userId}`) as offline fallback

**Context providers** (wrap order matters):
```
AuthProvider > BrowserRouter > AppProvider
```
`AppProvider` requires `userId` and `authToken` props — only mounted when user is authenticated.

## Key Design Decisions

- **State persistence**: `AppState` (subscriptions + currency settings) is stored as a single JSON blob in `user_states` table. No per-subscription rows in the DB.
- **Category migration**: `AppContext` has `CATEGORY_MIGRATION_MAP` to migrate old English category names to Japanese. Run `normalizeCategory()` when loading saved state.
- **Default data**: New users start with `DEFAULT_SUBSCRIPTIONS` from `src/types.ts` until they save their own state.
- **Currency**: JPY/USD with a configurable exchange rate (`DEFAULT_EXCHANGE_RATE` in `src/utils/currency.ts`). Display currency conversion happens at render time.
- **Styling**: Custom hand-drawn/pencil aesthetic via CSS variables in `src/styles/pencil.css` and an SVG `feTurbulence` filter (`id="pencil-sketch"`) injected in `App.tsx`.
