# Cup Session Recovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans, with test-driven-development and a fresh whole-branch review.

**Goal:** Resume interrupted Cups without losing or duplicating completed-heat standings.
**Architecture:** Existing immutable Cup rules validate a versioned local checkpoint; strict TypeScript owns persistence and a Vue component owns recovery controls.
**Tech Stack:** Existing Vue 3, TypeScript, Node tests, Playwright; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-10-27-cup-session-recovery-design.md`

## Global Constraints

- Isolated `feature/cup-session-recovery` from `origin/main`; preserve the dirty shared checkout.
- Strict TypeScript for new services and Vue SFC; no per-frame persistence or Vue writes.
- Existing Classic/Daily formats, progression, input, audio and tracks remain compatible.
- Keep TODO checkboxes evidence-based; no merge, PR, tag or deploy.

## Review Focus

- Corrupt or oversized saves fail closed without preventing racing.
- Access lost since saving cannot bypass track locks.
- Reload/retry cannot duplicate a completed heat or career reward.
- Storage denial preserves in-session racing.
- Keyboard/touch controls and locale updates work with actual browser clicks.

### Task 1: Recovery behavior RED

- [ ] Add `tests/cup-recovery-browser.spec.js`, seed a valid partial Cup, and assert visible Resume on the unchanged app.
- [ ] Run it against the production build and record expected visibility failure and before screenshot.

### Task 2: Validated persistence and retry

- [ ] Add `tests/cup-progress.test.js` and observe functional RED with minimal API stubs.
- [ ] Implement `src/cup-progress.ts`, reuse `championship-cup.ts` validation, and test corruption, size, locking, completion, retry and blocked storage.
- [ ] Run focused unit tests and the whole unit suite.

### Task 3: Vue recovery and race lifecycle

- [ ] Add `src/CupRecovery.vue` and `src/cup-recovery-ui.ts`; mount in `App.vue` with narrow callbacks from `main.js`.
- [ ] Add bilingual copy in `src/locales/ui.ts`, reuse existing control styles and UI cue.
- [ ] Cover desktop/touch recovery, live locale, discard, reload, locked/corrupt state and unchanged official progress.
- [ ] Run typecheck, full unit/browser/World Tour/layout checks, inspect screenshots, fresh review, push feature branch and inspect exact-HEAD CI.

## Remaining roadmap inventory

Separate branches after this stage: Custom Ghost/gameplay visual presets; mode-first setup and summary; expanded hazard schema and ten themed families; item-rule semantics and activation feedback; new pads/EMP/multiplier; challenge medals and results preset reuse; genuine circuit laps; streamed Endless Highway; Event Lab Lite. Existing Photo Studio, single-slot Shield/Magnet/Ghost/Freeze, basic hazard tiers and recent presets are reused, not rebuilt. Tutorial flow has a separate pending user question. Full checklist remains in `TODO.md`; this plan does not narrow the owner's overall request.
