---
paths:
  - "src/**/*.js"
  - "src/**/*.ts"
  - "src/**/*.vue"
---

# One module, one reason to change

`src/main.js` grew to 1,881 lines and `src/audio.js` to 403 because each new feature landed in
the file that already had the state it needed. Split by responsibility (SOLID's single
responsibility), not by line count alone.

## Limits (enforced by `tests/module-size.test.js`)

- **A source module stays at or below 400 lines.** Past that, split it before adding more.
- **Legacy files have a ratcheting ceiling** (`LEGACY_CEILINGS` in the test): they may never grow,
  and when one shrinks its ceiling is lowered in the same commit. Never raise a ceiling or add a
  new entry to get a change through; split instead. Translation catalogs are the only data
  exception.
- **A function stays under ~60 lines.** A long `if/else` chain over modes or phases becomes a
  lookup table or one small function per case (as `phaseText` result screens should be).

## Where the seams are

- **Pure logic vs. side effects.** Decide *what* happens in a pure, typed `.ts` function you can
  unit-test with a plain object; keep DOM, Web Audio, WebGL and storage writes in a thin caller.
  Examples: `race-audio-events.ts` (which sounds) vs. `audio.js` (how they sound);
  `music-tracks.ts` (song data) vs. the synthesizer.
- **Data vs. code.** Tables (songs, presets, catalogs, track configs) live in their own module.
- **One controller per screen area.** Event-driven UI goes in a `setupXxxUI(deps)` TypeScript
  controller (see `garage-ui.ts`, `track-swipe-ui.ts`). It receives what it needs as callbacks
  (`getRace()`, `showTracks()`), never imports `main.js` and never reaches for another
  controller's private variables (dependency inversion). It returns only the functions others
  must call.
- **Business rules out of UI.** Records, unlocks, rewards and sync merges are services with
  their own tests, called by the UI, not written inside a click handler or `phaseUI`.
- **Per-frame paths stay lean.** Splitting a hot path must not add allocations, reactive writes
  or DOM queries per frame: reuse objects, look elements up once (`ui-architecture.md`).

## Doing the split

- Move-only first: no behavior change in the same commit (`ui-architecture.md`).
- RED → GREEN: a test imports the new module (and asserts the old file no longer holds the moved
  code) and fails before the move; the existing suite stays green after it.
- Patterns are tools, not goals: no factory, interface or base class without a second real
  implementation. Two look-alike blocks that change for different reasons stay separate.
