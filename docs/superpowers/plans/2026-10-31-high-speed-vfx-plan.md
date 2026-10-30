# Speed-Sensation NITRO and BOOST Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed-cap-aware NITRO and BOOST activation/sustain/recovery VFX, subtle FOV adjustment, peripheral speed lines and bounded motion blur; Low/Medium/High plus Reduced Motion and full WebGL GPU profiling.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-high-speed-vfx-design.md](../specs/2026-10-31-high-speed-vfx-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/high-speed-vfx`
**Wave:** 2 · **TODO:** 10 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Mobile Controls/HUD merged first; honor its ability state and do not edit controls during independent VFX work.

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

1. **Risk 1:** NaN/Inf bloom shader can cause black full-frame. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** Late shader program compilation may stall WebKit. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** NITRO plus BOOST must not add unbounded effects. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Draw calls, triangles and mobile thermal are measurable gates. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Do not alter actual speed cap or game simulation. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Activation:** Given player has real NITRO charge; When NITRO activates once; Then short visual burst occurs, then sustained effect matches speed.
2. **BOOST vs NITRO:** Given BOOST starts without NITRO; When car accelerates; Then cleaner airflow differs from NITRO but physics unchanged.
3. **Comfort:** Given Reduced Motion or Low quality selected; When player sprints; Then readable lower-cost feedback with no heavy shake/blur remains.
4. **Recovery:** Given car slows, crashes, pauses or switches track; When effect intensity declines; Then camera returns smoothly with no black frame or VFX resource leak.

## File responsibility map

- `src/vfx-settings.ts`: Task 1 ownership — Define bounded pure intensity mapping from real speed/acceleration, cap and active BOOST/NITRO, plus comfort overrides; test `tests/aero-vfx.test.js`.
- `src/world.js`: Task 2 ownership — Reuse current FOV, lens, speed-line, afterimage and exhaust settings for distinct onset/sustain/ease-down phases; test `tests/effects.test.js`.
- `src/effects.js`: Task 3 ownership — Ensure warm-up/renderer disposal paths and Low/Medium/High costs without duplicated shaders or fullscreen glare; test `tests/nitro-fly-browser.spec.js`.
- `src/aero-vfx.js`: Task 4 ownership — Prove no black-frame/shader compile and compare real WebGL tracks/viewpoints/phone frame times; test `tests/black-frame-browser.spec.js`.

## TDD tasks (not started)

### Task 1: Define bounded pure intensity mapping from real speed/acceleration, cap and active BOOST/NITRO, plus comfort overrides

**Files:**
- Modify (as needed): `src/vfx-settings.ts`
- Test: `tests/aero-vfx.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/aero-vfx.test.js`, add a regression named `scenario 1 — Activation`. Set up **Given** player has real NITRO charge; trigger **When** NITRO activates once; assert **Then** short visual burst occurs, then sustained effect matches speed. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/aero-vfx.test.js` for `.test.js` or `npx playwright test tests/aero-vfx.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Define bounded pure intensity mapping from real speed/acceleration, cap and active BOOST/NITRO, plus comfort overrides** in `src/vfx-settings.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/high-speed-vfx`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Reuse current FOV, lens, speed-line, afterimage and exhaust settings for distinct onset/sustain/ease-down phases

**Files:**
- Modify (as needed): `src/world.js`
- Test: `tests/effects.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/effects.test.js`, add a regression named `scenario 2 — BOOST vs NITRO`. Set up **Given** BOOST starts without NITRO; trigger **When** car accelerates; assert **Then** cleaner airflow differs from NITRO but physics unchanged. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/effects.test.js` for `.test.js` or `npx playwright test tests/effects.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Reuse current FOV, lens, speed-line, afterimage and exhaust settings for distinct onset/sustain/ease-down phases** in `src/world.js`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/high-speed-vfx`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Ensure warm-up/renderer disposal paths and Low/Medium/High costs without duplicated shaders or fullscreen glare

**Files:**
- Modify (as needed): `src/effects.js`
- Test: `tests/nitro-fly-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/nitro-fly-browser.spec.js`, add a regression named `scenario 3 — Comfort`. Set up **Given** Reduced Motion or Low quality selected; trigger **When** player sprints; assert **Then** readable lower-cost feedback with no heavy shake/blur remains. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/nitro-fly-browser.spec.js` for `.test.js` or `npx playwright test tests/nitro-fly-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Ensure warm-up/renderer disposal paths and Low/Medium/High costs without duplicated shaders or fullscreen glare** in `src/effects.js`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/high-speed-vfx`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Prove no black-frame/shader compile and compare real WebGL tracks/viewpoints/phone frame times

**Files:**
- Modify (as needed): `src/aero-vfx.js`
- Test: `tests/black-frame-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/black-frame-browser.spec.js`, add a regression named `scenario 4 — Recovery`. Set up **Given** car slows, crashes, pauses or switches track; trigger **When** effect intensity declines; assert **Then** camera returns smoothly with no black frame or VFX resource leak. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/black-frame-browser.spec.js` for `.test.js` or `npx playwright test tests/black-frame-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Prove no black-frame/shader compile and compare real WebGL tracks/viewpoints/phone frame times** in `src/aero-vfx.js`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/high-speed-vfx`; do not check any high-level TODO item until its full end-to-end acceptance is met.

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
