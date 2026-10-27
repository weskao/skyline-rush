# Incremental Vue / JS Type Checking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce redundant HUD updates and progressively migrate event-driven UI to Vue without changing gameplay.
**Architecture:** Preserve JS/WebGL hot path; add checked JS contracts; split imperative orchestration by feature, then migrate panels one by one.
**Tech Stack:** Vue 3, Vite 7, JavaScript, JSDoc, TypeScript compiler for `checkJs`, Node test runner, Playwright.
**Spec:** docs/superpowers/specs/2026-10-25-vue-refactor-design.md

## Global Constraints
- Node >=22.12; retain Vue 3 / Vite 7 / Three.js and existing ARIA/DOM hooks.
- Keep physics and per-frame rendering nonreactive; do not rewrite game.js/world.js to TypeScript.
- Use test-first, observed RED and GREEN, and exact-commit CI before TODO checkbox changes.
- Keep all ten tracks, modal focus/keyboard, locale switching and cloud-save behavior unchanged.

## Review Focus
1. Phone 320/390px modal focus and scroll position with keyboard.
2. Release dialog Escape and Enter never leaking to race controls.
3. Live locale switches update all displayed text, not stale cached strings.
4. End-of-race overlays remain clickable after all panel changes.
5. World Tour/WebGL frame cost and touch controls unchanged.

### Task 1 — Cached HUD DOM writes
**Files:** `src/main.js`, `src/hud-dom.js`, `tests/hud-dom.test.js`, `tests/hud-dom-browser.spec.js`
- [ ] RED: add a focused Node test proving unchanged text/hidden values do not mutate elements and changed values do.
- [ ] GREEN: extract the existing writer and cache UI nodes, switch steady-state fields to conditional writes.
- [ ] Verify: `npm test`; build; desktop and mobile HUD browser tests; record before/after browser counters.
- [ ] Exact commit CI `quality-gate` and layout checks where needed; check TODO Step 1 only when proved.

### Task 2 — Checked JavaScript contract
**Files:** `jsconfig.json`, `package.json`, `package-lock.json`, `Makefile`, `src/game.js`, `src/world.js`, `src/main.js`, tests
- [ ] RED: enforce a deliberately invalid typed contract in a narrow fixture (type checker must fail).
- [ ] GREEN: introduce `checkJs`, `tsc --noEmit`, shared JSDoc shapes; resolve diagnostics without global suppression.
- [ ] Verify: type check, unit/build/browser and CI; check TODO Step 2 only when green.

### Task 3 — Move-only feature modules
**Files:** `src/main.js`, focused `src/*-ui.js`, tests
- [ ] Move release, swipe, history/daily, garage, settings and tutorial handlers separately; preserve same exports, references and behavior.
- [ ] Each move: regression RED for behavior guard, then GREEN, tests and commit.
- [ ] Check TODO Step 3 only after all listed slices pass full gate.

### Task 4 — Vue event-driven panels
**Files:** `src/App.vue`, new `src/*Panel.vue`, `src/main.js`, tests
- [ ] Replace release, history, garage, settings, tutorial DOM construction one by one with Vue-owned components and an explicit public interface.
- [ ] Keep HUD hot path direct DOM; enforce keyboard, focus, aria and overlay clickability after each conversion.
- [ ] Check TODO Step 4 only after all five panels and exact-commit CI pass.
