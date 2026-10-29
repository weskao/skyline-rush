# Custom Presentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with test-driven-development.

**Goal:** Custom/Free cosmetic presets and compatible Custom best-run Ghosts without changing stored race identities.
**Architecture:** Existing session presentation boundary, `ghost-store.ts`/`race-results.ts`, typed selection controller and Vue selector; reuse the world renderer's sky/fog/exposure and bounded weather mesh.
**Tech Stack:** Vue 3, strict TypeScript, Three.js, Node tests and Playwright; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-10-27-custom-presentation-design.md`

## Global Constraints

- Work only in `feature/custom-race-presentation`; no changes to other worktrees.
- Preserve `race.config`, stable keys, Classic/Daily rules and controls.
- No frame-loop Vue writes, per-frame allocations, new shaders or light-count changes.
- The owner subsequently authorized a local checkpoint and main-into-feature merge. Do not push, merge into main or deploy; parent owns final gates.

## Review Focus

- Legacy mode Ghost keys remain readable after selecting weather.
- Custom stage replays record heat time, never aggregate time.
- Corrupt/blocked storage does not stop racing.
- Retry keeps the preset, track/Classic selection resets it.
- Photo mode restores the active race theme and original camera afterward.

### Task 1: RED

- [x] Add constructor regression showing presentation argument is honored without changing config.
- [x] Add browser regression for visible Custom theme controls and a seeded compatible Custom Ghost.
- [x] Run unchanged implementation and preserve expected failures (`constructor-red.log`, `browser-red.log`).

### Task 2: Shared boundaries

- [x] Extend `game.js:createRace` with an optional presentation argument, validated by existing race-session service.
- [x] Test-first Custom fastest-heat Ghost persistence. After the main merge, extend its `ghost-store.ts` and `race-results.ts` and remove the duplicate branch-only store.
- [x] Test-first typed visual-style application and reset; no repeated writes when unchanged.

### Task 3: UI and renderer

- [x] Add typed Vue preset component/controller and bilingual active-setting copy; wire selections through session presentation.
- [x] Reuse the merged typed Ghost store/settlement/selection boundaries; preserve retry/next-stage presentation.
- [x] Apply scene themes only when changed and reuse precipitation; retain photo overrides.
- [x] Fix the observed cancelled-swipe preset RED by keeping preview race creation pure; real short-drag browser regression passes.
- [x] Run focused units, strict typecheck, production build, feature browser/renderer regression and settled WebGL screenshots against integrated main.
- [ ] Parent full verification: inherited main failures, complete `make verify`, layout, exact-HEAD full CI and physical-device acceptance.

## Evidence after main integration

Artifacts: `artifacts/custom-presentation/`. Strict TypeScript/Vue/legacy checks pass. Focused Node suite passed 36/36; expanded lifecycle/scene/size suite passed 18/18. The combined browser run passed 30/31: only the inherited stylesheet golden failed; this branch leaves `src/style.css` identical to integrated main. Separate final actual-rain and cancelled-swipe browser checks passed 2/2; the settled rain capture passed again after waiting for the intro transition. Whole `npm test` reported 790 passed, 2 inherited main failures, 3 skipped (before the added settlement regression). Parent owns independent repair of `browser-timeouts.test.js`, `perf-overlay.test.js` and the accepted stylesheet golden.
