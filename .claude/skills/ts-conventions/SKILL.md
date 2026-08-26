---
name: ts-conventions
description: TypeScript type-safety discipline for the ModuDrive-WEB frontend — no explicit `any`, type-only imports, no non-null assertions, no floating promises, plus this repo's feature-boundary/state-management conventions. Use this whenever writing, editing, or reviewing any .ts/.tsx file in this repo — adding a component, hook, API call, form, or test — even if the user doesn't say "conventions" or "type safety". Also use when asked about `any`, type errors, lint rules, or where new code should live in this project.
---

# ModuDrive-WEB TypeScript conventions

This repo's `tsconfig.app.json` has `strict: true`, which only blocks
*implicit* `any`. `eslint.config.js` now also errors on explicit `any`,
non-type-only imports of types, and non-null assertions
(`@typescript-eslint/no-explicit-any` / `consistent-type-imports` /
`no-non-null-assertion`) — so `npm run lint` will catch those three. Still
write code that satisfies them the first time rather than relying on lint
to bounce it back, and mind the one item lint can't catch yet:

## Type-safety checklist

- **No explicit `any`** (lint-enforced). If a type is genuinely unknown
  (e.g. a JSON blob before validation), use `unknown` and narrow it, or lean
  on `zod` to infer the type (this repo already uses zod for env validation
  and form schemas — extend that pattern for API payloads instead of typing
  them as `any`).
- **`import type` for type-only imports** (lint-enforced).
- **No non-null assertion (`!`)** (lint-enforced). Handle the
  `undefined`/`null` case explicitly (optional chaining, a guard, or a
  default) instead of asserting it away — a wrong `!` is a runtime crash
  with no type error to catch it.
- **No floating promises** (not lint-enforced — would need type-aware
  linting, not set up here). Every `async` call is `await`ed, returned, or
  explicitly discarded with `void somePromise() // reason`. This matters
  most in event handlers and `useEffect` bodies, where a dropped rejection
  silently disappears.

## Project-specific conventions (from CLAUDE.md — restated because they're easy to violate by accident)

- **Feature boundary**: reach a `features/*` module only through its public
  barrel (`@/features/<name>`), never a file inside it. ESLint enforces this
  (`no-restricted-imports`) but the lint error comes *after* you've written
  the import — write it correctly the first time.
- **Server state → TanStack Query, client state → Zustand.** Don't add a
  Zustand store for state a component could hold locally, and don't cache
  server data in Zustand — that's what `react-query` is for.
- **API client**: all requests go through the single axios instance in
  `src/lib/api-client.ts`. Its interceptor already unwraps
  `response.data.data`, so a caller's return type is the unwrapped payload,
  not `ApiResponse<T>` — don't re-unwrap it or re-type it as the envelope.
- **Forms**: React Hook Form + a `zod` schema via `@hookform/resolvers`, not
  hand-rolled validation.

## Before you consider the change done

Run `npx tsc -b` (typecheck) and `npm run lint`. A change that "looks right"
but fails either of these isn't finished — fix it before handing it back.
