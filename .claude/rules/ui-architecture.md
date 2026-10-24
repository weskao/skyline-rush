---
paths:
  - "src/**/*.js"
  - "src/**/*.vue"
---

# UI architecture: Vue panels, plain-JS game core

`src/main.js` mounts `App.vue` and then drives most of the UI imperatively (querySelector,
innerHTML, manual `hidden`). That keeps UI state in two places and is how overlays end up covering
controls. Move the event-driven UI to Vue gradually; keep the hot paths plain JS.

## Where code goes

- **Game core stays plain JS.** `game.js`, `world.js`, `effects.js`, `aero-vfx.js`, scene and
  scenery modules never import Vue or touch the DOM UI. They run per frame; reactivity there is
  pure overhead.
- **New event-driven UI is a Vue component.** A new dialog, panel, menu, settings section or
  results view is a `.vue` file, not new `$('#…')` / `innerHTML` code in `src/main.js`.
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

- No `.ts` rewrites of existing modules. Exported functions and shared shapes (`race`, `player`,
  rivals, track config) carry JSDoc types; `checkJs` will enforce them once `TODO.md` step 2 lands.
- New or touched exports get JSDoc in the same commit.

## Verification

- Panel moved to Vue → `npm run test:browser` desktop and mobile, plus the overlay clickability
  checks in `ui-phase-interactions.md`; home-screen files → `npm run test:layout`.
- Panels that show sound/music controls keep their `src/audio.js` behavior unchanged.
