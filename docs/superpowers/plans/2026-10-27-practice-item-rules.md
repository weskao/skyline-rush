# Practice Item Rules Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and test-driven-development; parent owns whole-branch review and complete local/CI gates.

**Goal:** Make Custom/Free item choices unambiguous and held powers usable on keyboard/touch.
**Architecture:** Existing race configuration and ring generator own rule semantics; a typed cached HUD adapter owns activation feedback; small Vue SFCs preserve existing selectors.
**Tech Stack:** Existing strict TypeScript, Vue 3, Node tests, Playwright; no dependencies added.
**Spec:** `docs/superpowers/specs/2026-10-27-practice-item-rules-design.md`

## Global Constraints

- Work only in `feature/practice-item-rules`; no merge/push/PR/deploy in worker.
- Preserve legacy Classic/Daily/default signatures and old supply-only settings.
- Main bootstrap shrinks; no per-frame Vue writes, storage or GPU allocation.
- Do not mark future pads/EMP or full physical-device acceptance complete.

## Review Focus

- Invalid/conflicting new rules fail at the strict request boundary.
- Filtering does not change mystery reward seed indices.
- Presets and old recent setups cannot retain a previous incompatible rule.
- Pause prevents activation and duplicate input cannot stack effects.
- HUD updates and cues occur only on state changes; labels work in both locales.

### Task 1: Engine rules

- [x] Add rule/legacy/strict/persistence regressions and observe functional RED.
- [x] Implement optional rule normalization and filtering in existing shared code.
- [x] Run focused mode/config/item tests (40 pass).

### Task 2: Input and HUD

- [x] Observe browser RED for absent four-way selector.
- [x] Add typed item HUD adapter and Vue rule/slot SFCs; replace equivalent existing checkbox test action while retaining assertions.
- [x] Verify pickup, Q/touch activation, pause, cooldown, locale and one-shot cues; final focused Node 11/11 and browser 4/4 passed.

### Task 3: Verification and handoff

- [x] Strict TS/Vue/JS checks, full unit suite (699 pass/0 fail/3 emulator skips), locked production build and focused browser regressions (31/31; final changed-source subset 4/4).
- [x] Record actual screenshots and results in TODO, leaving parent full gate, exact-HEAD CI and hardware gates open.
