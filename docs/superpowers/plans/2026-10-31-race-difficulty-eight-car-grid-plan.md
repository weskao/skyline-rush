# AI Difficulty, Eight-Car Field and Reverse Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fixed competitive modes target 8 total racers (1 player+7 unique AI); Custom supports 2–8 total; solo modes exempt; actual reverse-grid subsequent Cup/Sprint heats, last finisher pole and winner rear; fair AI difficulty and legacy 4-car records.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-race-difficulty-eight-car-grid-design.md](../specs/2026-10-31-race-difficulty-eight-car-grid-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/race-difficulty-eight-car-grid`
**Wave:** 2 · **TODO:** 11, 12 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Tutorial implementation integrated and retested if it touches src/game.js; use newest main and version historic race signatures.

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

1. **Risk 1:** src/race-config.ts currently uses rivals 0–3. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** src/game.js only has NOVA/ORBIT/APEX. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Cup fixed four IDs/points and exactly three rivals. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Sprint position validator only accepts 1–4. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Track bottlenecks and cloud/ghost rule signatures must be preserved. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Classic:** Given new classic race starts; When countdown completes; Then one player plus seven AI appear without overlap.
2. **Custom:** Given player selects 2 or 8 total participants; When they start race; Then real field and HUD total match selection.
3. **Reverse grid:** Given previous heat finishes from first through eighth; When next race grid is placed; Then previous eighth starts first and first starts eighth.
4. **Legacy/solo:** Given old four-car cup or solo mode loads; When game enters; Then old results stay readable and solo modes stay solo.

## File responsibility map

- `src/race-config.ts`: Task 1 ownership — Version a typed race participant contract with 1–7 rivals in competitive requests and stable historic migration; test `tests/race-modes.test.js`.
- `src/game.js`: Task 2 ownership — Render/simulate seven unique deterministic AI with fair spacing, bounds, collision and normal/hard profiles; test `tests/game.test.js`.
- `src/championship-cup.ts`: Task 3 ownership — Generalize Cup/Sprint score, order and physical reversed next-heat grid including ties/DNF rules; test `tests/championship-cup.test.js`.
- `src/sprint-series.ts`: Task 4 ownership — Verify all mode scoreboards, legacy four-car records/ghosts, long-run racing and 8-car performance; test `tests/sprint-series.test.js`.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [race-difficulty-eight-car-grid visual design prompt](../prompts/2026-10-31-race-difficulty-eight-car-grid-visual-design.md).

**Scope:** 8-car starting-grid/leaderboard UI and reverse-order explanatory SVG. Use actual spawn positions and live car meshes; SVG may explain rank but cannot fake physics.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

## TDD tasks (not started)

### Task 1: Version a typed race participant contract with 1–7 rivals in competitive requests and stable historic migration

**Files:**
- Modify (as needed): `src/race-config.ts`
- Test: `tests/race-modes.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/race-modes.test.js`, add a regression named `scenario 1 — Classic`. Set up **Given** new classic race starts; trigger **When** countdown completes; assert **Then** one player plus seven AI appear without overlap. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/race-modes.test.js` for `.test.js` or `npx playwright test tests/race-modes.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Version a typed race participant contract with 1–7 rivals in competitive requests and stable historic migration** in `src/race-config.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/race-difficulty-eight-car-grid`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Render/simulate seven unique deterministic AI with fair spacing, bounds, collision and normal/hard profiles

**Files:**
- Modify (as needed): `src/game.js`
- Test: `tests/game.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/game.test.js`, add a regression named `scenario 2 — Custom`. Set up **Given** player selects 2 or 8 total participants; trigger **When** they start race; assert **Then** real field and HUD total match selection. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/game.test.js` for `.test.js` or `npx playwright test tests/game.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Render/simulate seven unique deterministic AI with fair spacing, bounds, collision and normal/hard profiles** in `src/game.js`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/race-difficulty-eight-car-grid`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Generalize Cup/Sprint score, order and physical reversed next-heat grid including ties/DNF rules

**Files:**
- Modify (as needed): `src/championship-cup.ts`
- Test: `tests/championship-cup.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/championship-cup.test.js`, add a regression named `scenario 3 — Reverse grid`. Set up **Given** previous heat finishes from first through eighth; trigger **When** next race grid is placed; assert **Then** previous eighth starts first and first starts eighth. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/championship-cup.test.js` for `.test.js` or `npx playwright test tests/championship-cup.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Generalize Cup/Sprint score, order and physical reversed next-heat grid including ties/DNF rules** in `src/championship-cup.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/race-difficulty-eight-car-grid`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Verify all mode scoreboards, legacy four-car records/ghosts, long-run racing and 8-car performance

**Files:**
- Modify (as needed): `src/sprint-series.ts`
- Test: `tests/sprint-series.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/sprint-series.test.js`, add a regression named `scenario 4 — Legacy/solo`. Set up **Given** old four-car cup or solo mode loads; trigger **When** game enters; assert **Then** old results stay readable and solo modes stay solo. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/sprint-series.test.js` for `.test.js` or `npx playwright test tests/sprint-series.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Verify all mode scoreboards, legacy four-car records/ghosts, long-run racing and 8-car performance** in `src/sprint-series.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/race-difficulty-eight-car-grid`; do not check any high-level TODO item until its full end-to-end acceptance is met.

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
