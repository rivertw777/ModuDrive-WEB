# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (fixed to port 3000, see Node/version notes below)
- `npm run build` — `tsc -b && vite build` (typecheck must pass before bundling)
- `npm run lint` — ESLint (flat config)
- `npm run format` — Prettier write
- `npx tsc -b` — typecheck only
- `npm run test` — Vitest in watch mode
- `npx vitest run` — Vitest single run
- `npx vitest run src/app/app.test.tsx` — run a single test file
- `npx vitest run -t "test name"` — run tests matching a name pattern

## Node version

Requires **Node 20.19+** (`engines.node` in `package.json`, `.nvmrc` tracks `lts/*`). Run `nvm use` before installing/building if your shell defaults to an older Node.

This project previously pinned Vite 5 / React Router 6 / Tailwind CSS 3 / Vitest 2 + jsdom 25 because the dev environment ran Node 18.19.1. All of those have since been upgraded to their latest majors (Vite 8, React Router 7, Tailwind CSS 4, Vitest 4 + jsdom 29) now that Node is 20+ — there is no longer a version ceiling tied to Node for these packages.

Tailwind CSS 4 config is CSS-first: there is no `tailwind.config.js`, `src/index.css` just has `@import 'tailwindcss';`, and PostCSS uses `@tailwindcss/postcss` (the standalone `autoprefixer` package is no longer needed — Tailwind 4 handles vendor prefixing itself).

## Architecture

Structure follows the **bulletproof-react** convention:

```
src/
  app/
    routes/          # landing, login, signup, app-layout (drive shell), drive, search, shared, notifications, not-found
    provider.tsx     # global providers (QueryClientProvider, ReactQueryDevtools in dev)
    router.tsx       # createBrowserRouter
  components/ui/     # shared UI primitives (button, dialog, icons, state, theme-toggle)
  config/
    env.ts           # validates import.meta.env via zod
  features/
    auth/            # login/signup forms, current-member query
    drive/            # file explorer, upload, search, sharing — the app's core feature
    notifications/    # in-app notification bell (header) + /notifications page, polls unread count
  lib/
    api-client.ts    # axios instance: unwraps ApiResponse, handles 401
    react-query.ts
  stores/             # zustand: auth-store (access token), theme-store (light/dark)
  testing/
    setup-tests.ts
  types/
    api.ts            # backend ApiResponse<T> shape
  utils/
    cn.ts              # clsx + tailwind-merge
```

**Feature boundary rule**: `features/*` modules may not import each other's internals. This is enforced in `eslint.config.js` via `no-restricted-imports` (pattern `@/features/*/*` is an error) — a feature must only be reached through its public barrel `@/features/<name>`, never a file inside it. No separate plugin is used for this; when adding a new feature, keep its public exports in the feature root (`index.ts`) so other features/routes can import it without violating the rule.

Path alias `@/` → `src/` is configured in both `tsconfig.app.json` and `vite.config.ts` — keep them in sync if it ever changes.

`/drive`, `/search`, and `/shared` all render inside `app-layout.tsx` (the authenticated shell: sidebar nav, search bar, theme toggle), and each route maps to a `features/drive` explorer component (`DriveExplorer`, `SearchExplorer`, `SharedWithMeExplorer`) that shares the same `FileEntry` type and file-list UI patterns.

## Backend integration (ModuDrive-API)

This is the frontend for a separate `ModuDrive-API` backend (microservices: gateway, auth, member, file, storage, notification).

- All API calls go through the gateway service. `VITE_API_BASE_URL` (in `.env`) points at the gateway, currently `http://localhost:10001`.
- The gateway's CORS config expects the frontend origin at `http://localhost:3000`, which is why `vite.config.ts` hardcodes `server.port = 3000` — do not change this without also updating the gateway's allowed origin.
- `src/types/api.ts` (`ApiResponse<T>`) mirrors `com.moduDrive.common.core.web.ApiResponse<T>` in the backend's `common:core` module exactly — keep them in sync if the backend shape changes.
- `src/lib/api-client.ts` is the single axios instance for all requests:
  - Request interceptor attaches `Authorization: Bearer <token>` from `localStorage` (key `modudrive.accessToken`, exported as `ACCESS_TOKEN_STORAGE_KEY`).
  - Response interceptor unwraps `response.data.data` — callers receive the unwrapped payload directly, not the `ApiResponse` envelope.
  - On a 401 response, the stored access token is cleared.
  - All rejected promises are normalized to `Error(message)` using the backend's `message` field when present.
- `notification-service` is live: `GET /api/v1/notifications` (Spring `Page`, `unreadOnly`/`page`/`size` params), `PATCH /api/v1/notifications/{id}/read`. No count endpoint (ask for `unreadOnly=true&size=1` and read `totalElements`) and no SSE/websocket — the bell polls. Rows are produced only on a file share to a registered member; `sharerName`/`sharerEmail` may be null (backend best-effort).
- There is no "list deleted files" endpoint (soft delete only sets a DELETED status, no filtered-list API) — a trash/bin screen isn't buildable until the backend adds one.

## State management

- **Server state**: TanStack Query (`src/lib/react-query.ts`), `retry: false`, `staleTime: 60s`. DevTools mounted only in dev (`import.meta.env.DEV`) inside `AppProvider`.
- **Client/global state**: Zustand. `auth-store.ts` holds the access token (persisted to `localStorage`, same key as `api-client.ts`). `theme-store.ts` toggles the `dark` class on `<html>` and persists the choice. Add a new store only when a real cross-cutting concern needs it.
- **Forms**: React Hook Form + Zod via `@hookform/resolvers`.
