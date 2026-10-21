# Skyline Rush — Interactive racing modes, Phase 1 design and implementation plan

**Date:** 2026-10-22
**Base:** main at 02814792b8b78ad8789fe3ed22927f7d6287b9e3
**Branch:** feature/game-modes-interactive-racing
**Source:** TODO.md §§9–13, Notion skyline-rush mode design.
**Scope:** This plan is Phase 1 of the much larger 119-item roadmap. It is not evidence of completion of all sections.

## Intent and trade-offs
Retain ten existing point-to-point races, physics, Daily and Classic progression, showpieces, saves and local-unlock safety. Add a compact configurable session UX instead of building a second renderer. Keep all course selection subject to existing access checks. Ship vertical slices with real gameplay, not empty mode buttons.

Approach A (chosen): a small pure session-normalization helper; optional settings object passed to existing createRace; game completion and UI adapt by mode; new mode-record key. This reuses the current game loop and scene renderer.
Approach B (rejected now): a new independent simulation engine per mode. Duplicates behavior and destabilizes existing physics.
Approach C (future): all modes implemented as a fully general event editor. Adds speculative complexity and unnecessary dependencies.

## Interface boundaries
- src/race-config.js: normalizeRaceConfig() with mode, rivals 0–3, traffic, difficulty and pickup rules, safe defaults.
- src/game.js: backward compatible createRace(id, dailyModifierOrRaceConfig) and explicit finish behavior for Free Drive; race.mode/race.config; AI acceleration and count.
- src/history.js: recordModeRace, loadModeBests with separate key, no campaign/Classic/Daily awards.
- src/App.vue + src/main.js + src/style.css: compact mode picker and contextual settings, localized labels, per-mode scoreboard/result and safe restart / return.
- src/locales/ui.js: English and zh-TW parity.
- tests/race-modes.test.js: deterministic input normalization, rivals/traffic and progression separation.

## Phase 1 tasks
1. RED: tests for normalization, classic compatibility, custom rivals/density, free/no auto-finish, solo Time Attack.
2. GREEN: session configuration and game wiring; no Classic behavior changes.
3. UI: add mode and options to existing homepage, dynamic labels, warnings and responsive layout.
4. Persistence/results: strictly isolate new mode results; don't award stars/unlocks or medals in custom modes.
5. Verification: npm test, npm run build, npm run test:browser in a checkout with dependencies. CI logs/screenshots are evidence only when verified; otherwise leave tasks unchecked.

## Later milestones (not in Phase 1)
Stunt score timer; Checkpoint gates; Cup; Gauntlet with visual and collision data; active-item inventory; themed obstacles on all 10 tracks; genuine loop circuits; Endless streaming; Event Lab editor; Photo Mode.

## QA acceptance
- Original createRace('coast') and createRace('coast','double-traffic') remain unchanged.
- No local storage unlock bypass or score contamination.
- Keep keyboard/touch control mapping and WebGL showpieces intact.
- Mode options are explicit and understandable; no claim that repeated point-to-point sessions are laps.
- Test mobile safe-area layouts and English/Traditional Chinese labels.

## Execution ledger
- Branch created from documented main commit.
- Phase 1 test cases authored first, implementation follows.
- Test execution in current agent runtime may be constrained if repository cannot be cloned. Do not mark unrun tests as passing or mark TODO [x] merely because code was committed.
