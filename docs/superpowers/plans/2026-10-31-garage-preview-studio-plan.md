# Full-screen Garage Preview Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Garage Home → independent full-screen Preview Studio → Inventory/Collection navigation; current paint preview with full-car orbit, long press/drag, zoom/reset and touch/keyboard access. Future Skin hooks only.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-garage-preview-studio-design.md](../specs/2026-10-31-garage-preview-studio-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/garage-preview-studio`
**Wave:** 1 · **TODO:** 5.2, 5.4 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** None; retain existing PAINTS and ownership; do not invent Skins or Shop implementations.

## Global Constraints

- Baseline main commit: `bea47cf61c162b4341021fa6d24ca45850af7796`. Product requirements: [UX/UI source TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); **they have not yet been merged into main**. Before implementation reconcile this source into the working branch without overwriting newer main data.
- Planning-only commit. No source edits, no tests run, no merge/PR/deploy. Product spec and BDD are intended implementation contracts, not proof of behavior.
- Read the current `CLAUDE.md`, `.claude/rules/ui-architecture.md`, `performance-review.md`, `device-quality.md`, `touch-input.md`, `ui-phase-interactions.md` and domain-specific rules; follow newer revisions when implementing.
- New UI: Vue 3 + strict TypeScript (SFC `<script setup lang="ts">`), typed adapters for necessary JS physics/Three.js render loop. No Vue reactive writes or DOM queries per frame.
- Android Chrome and iPhone Safari/Chrome portrait + landscape, tablet and desktop; `en`/`zh-TW`, Low/Medium/High, VFX off, Reduced Motion, muted audio; preserve critical controls/data at every tier.
- Performance first with before/after real WebGL evidence, FPS, p50/p95 frame-time, Draw Calls, Triangles, GPU uploads; screen overlays and touch controls must not block the game.
- TDD RED→GREEN→Refactor, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour/Cloud Save when relevant, `make verify`, exact-HEAD GitHub CI. Only mark `TODO.md` item `- [x]` after each *fully implemented and verified* requirement is complete; never mark for a plan.
- Each agent owns its feature branch and specific files; dependent implementation waits for prerequisites merged into `main` after user approval. If source TODO is absent on the branch, first integrate the approved spec using an explicit non-destructive merge/cherry-pick and do not copy stale contents over main.

## Review Focus

1. **Risk 1:** Existing Garage uses dialog and PAINTS star unlocks. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** Preview canvas should reuse renderer rather than creating competing WebGL context. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** WebKit touch camera gestures may conflict with browser navigation. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Wheel/pinch bounds must prevent clipping of car or VFX. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Shop and new VFX not in this branch. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Full-screen entry:** Given player opens Garage; When they select Preview Studio; Then complete car preview fills safe viewport, not a small dialog.
2. **Orbit:** Given preview car is visible; When player drags, holds, pinches or uses keyboard buttons; Then car rotates and remains within safe zoom bounds.
3. **Paint migration:** Given user already owns a legacy PAINTS finish; When Garage is opened and closed; Then paint entitlement and selection remain valid.
4. **Navigation:** Given user leaves studio for a race; When render state and overlay exit; Then no stale touch capture, blocked control or shader resource leak.

## File responsibility map

- `src/GaragePanel.vue`: Task 1 ownership — Define Vue/TypeScript navigation states and preview camera contract without changing paint ownership; test `tests/garage-ui.test.js`.
- `src/garage-ui.ts`: Task 2 ownership — Implement reusable full-screen studio presentation with orbit, view presets, zoom bounds and reset semantics; test `tests/garage-view-state.test.js`.
- `src/garage-view-state.ts`: Task 3 ownership — Keep existing renderer/canvas ownership and accessible Garage Home/Collection entry points; test `tests/showcase-camera-browser.spec.js`.
- `src/App.vue`: Task 4 ownership — Test portrait/landscape and desktop camera gestures, history/back, focus and return to race; test `tests/close-button-browser.spec.js`.

## TDD tasks (not started)

### Task 1: Define Vue/TypeScript navigation states and preview camera contract without changing paint ownership

**Files:**
- Modify (as needed): `src/GaragePanel.vue`
- Test: `tests/garage-ui.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-ui.test.js`, add a regression named `scenario 1 — Full-screen entry`. Set up **Given** player opens Garage; trigger **When** they select Preview Studio; assert **Then** complete car preview fills safe viewport, not a small dialog. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-ui.test.js` for `.test.js` or `npx playwright test tests/garage-ui.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Define Vue/TypeScript navigation states and preview camera contract without changing paint ownership** in `src/GaragePanel.vue`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-preview-studio`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Implement reusable full-screen studio presentation with orbit, view presets, zoom bounds and reset semantics

**Files:**
- Modify (as needed): `src/garage-ui.ts`
- Test: `tests/garage-view-state.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-view-state.test.js`, add a regression named `scenario 2 — Orbit`. Set up **Given** preview car is visible; trigger **When** player drags, holds, pinches or uses keyboard buttons; assert **Then** car rotates and remains within safe zoom bounds. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-view-state.test.js` for `.test.js` or `npx playwright test tests/garage-view-state.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Implement reusable full-screen studio presentation with orbit, view presets, zoom bounds and reset semantics** in `src/garage-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-preview-studio`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Keep existing renderer/canvas ownership and accessible Garage Home/Collection entry points

**Files:**
- Modify (as needed): `src/garage-view-state.ts`
- Test: `tests/showcase-camera-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/showcase-camera-browser.spec.js`, add a regression named `scenario 3 — Paint migration`. Set up **Given** user already owns a legacy PAINTS finish; trigger **When** Garage is opened and closed; assert **Then** paint entitlement and selection remain valid. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/showcase-camera-browser.spec.js` for `.test.js` or `npx playwright test tests/showcase-camera-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Keep existing renderer/canvas ownership and accessible Garage Home/Collection entry points** in `src/garage-view-state.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-preview-studio`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Test portrait/landscape and desktop camera gestures, history/back, focus and return to race

**Files:**
- Modify (as needed): `src/App.vue`
- Test: `tests/close-button-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/close-button-browser.spec.js`, add a regression named `scenario 4 — Navigation`. Set up **Given** user leaves studio for a race; trigger **When** render state and overlay exit; assert **Then** no stale touch capture, blocked control or shader resource leak. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/close-button-browser.spec.js` for `.test.js` or `npx playwright test tests/close-button-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Test portrait/landscape and desktop camera gestures, history/back, focus and return to race** in `src/App.vue`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-preview-studio`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 5: Cross-platform, integration and final branch gate

**Files:** test files listed above, any mode-specific browser specs; verification notes in the owning branch's `TODO.md` after product TODO integration.

**Interfaces:** Consumes the integrated Tasks 1–4 and emits verification evidence only, not new game code unless a failing regression requires a new RED→GREEN cycle.

- [ ] **Step 1:** Expand automated browser coverage for Android/iOS representative portrait+landscape, desktop, `en`/`zh-TW`, all three Quality tiers, VFX disabled and Reduced Motion; prove all BDD scenarios and negative paths. Simulators do not substitute for an actual-device claim.
- [ ] **Step 2:** Inspect actual WebGL gameplay/preview screenshots and control clickability; compare baseline/after Draw Calls, Triangles, FPS, p50/p95 frame time and CPU/GPU loads under matching conditions. Record untested hardware.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify` and World Tour/Cloud Save gate as applicable. Every failure must be fixed and rechecked.
- [ ] **Step 4:** Update branch from latest `main` only when dependencies are merged; resolve conflicts with both sides' features; rerun all relevant tests and inspect **exact-HEAD** GitHub CI `quality-gate`.
- [ ] **Step 5:** Only after all BDD and TDD acceptance passes, change completed corresponding requirement(s) to `- [x]` in the approved full `TODO.md`, retaining unchecked partial requirements and recording evidence. **Important:** the planning TODO exists on `feature/ux-ui-combo-mobile-controls`, not base `main`. Coordinate integration before marking; never overwrite newer TODO. Commit progress evidence, request explicit permission before a direct main merge; do not create PR.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
