---
paths:
  - "src/**/*.js"
  - "src/**/*.vue"
  - "src/**/*.ts"
  - "src/**/*.d.ts"
---

# UI architecture: Vue 3 + strict TypeScript by default

`src/main.js` mounts `App.vue` and then drives most of the UI imperatively (querySelector,
innerHTML, manual `hidden`). That keeps UI state in two places and is how overlays end up covering
controls. Move the event-driven UI to Vue gradually; keep the hot paths plain JS.

## Where code goes

- **Performance-sensitive game core may remain JS.** Existing physics/Three.js renderers,
  shader/scene/effect modules and frame-loop paths do not import Vue or manipulate panel state.
  Keep them JS only where it materially improves stability/performance or avoids a risky rewrite;
  document the exception and expose explicit TypeScript interfaces at their boundaries.
- **Vue 3 + TypeScript is the default for all new UI.** Every new/converted SFC uses
  `<script setup lang="ts">`. New UI controllers, state, services and business logic use `.ts`.
  Do not add more application logic to legacy `.js` or imperatively render Vue-owned DOM.
- **Existing panels migrate one per commit**, move-only first: release notes, history, garage,
  settings, tutorial. Each migration keeps its element ids or updates every test selector it
  breaks, and passes `make verify` on its own.
- **`src/main.js` does not grow.** A new feature lands in its own module; a fix inside `main.js`
  is fine. Splitting existing code out is move-only with no behavior change in the same commit.

## In-race HUD (per frame)

- Not Vue reactive state: a reactive write per frame re-renders every frame.
- Look up HUD elements once at startup, never `$()` / `querySelector` inside `updateUI` or any
  per-frame path.
- Write `textContent`, `hidden`, `dataset` only when the value changed.
- A HUD change follows `performance-review.md`: measure frame cost before and after.

## Types

- **Strict `tsconfig.json` is authoritative** for TypeScript sources and Vue scripts.
  `jsconfig.json` is a *temporary, narrow legacy-JS check*, not proof of TypeScript migration.
- Define shared interfaces in `src/game-types.ts`; use `import type`, typed Vue props/emits,
  typed state, and typed engine snapshots/adapters. New/changed TypeScript APIs cannot use
  unexamined `any` or `// @ts-ignore` to bypass type checking.
- Migrate existing `.js` UI/business modules incrementally, with RED → GREEN tests for each
  boundary; preserve plain-JS exceptions only for render/physics/hot loops with rationale.

## Verification

- TypeScript UI changes → `npm run typecheck` and a failing-before-fix regression test.
- Panel moved to Vue → `npm run test:browser` desktop and mobile, plus the overlay clickability
  checks in `ui-phase-interactions.md`; home-screen files → `npm run test:layout`.
- Panels that show sound/music controls keep their `src/audio.js` behavior unchanged.
