# Interactive Tutorial Stunts and NITRO UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AIR→ROAD CHAIN genuine trigger and tutorial; BARREL ROLL airborne left-right reversal with clean landing; NITRO tutorial must expose sustained controllable sprint before completion. Preserve no-autopilot player control and normal race physics.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-tutorial-ux-combos-design.md](../specs/2026-10-31-tutorial-ux-combos-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/tutorial-ux-combos`
**Wave:** 1 · **TODO:** 1, 2, 8, 9 · **Status:** IMPLEMENTED, FULL ACCEPTANCE PENDING
**Dependency:** None; agree on shared NITRO event semantics with HUD work, but do not edit HUD controller.

**Implementation checkpoint:** Ten steps, real engine event observer, bilingual coaching and keyboard/touch regression tests are committed; full browser, typecheck and performance gates still require a successful exact-HEAD CI. No TODO completion claims are justified yet.

## Global Constraints

- Baseline main commit: `bea47cf61c162b4341021fa6d24ca45850af7796`. Product requirements: [UX/UI source TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); **they have not yet been merged into main**. Before implementation reconcile this source into the working branch without overwriting newer main data.
- The original planning commit was documentation-only. This branch now includes implementation and regression tests, but full CI and real browser/WebGL/device checks remain required. No merge/PR/deploy.
- Read the current `CLAUDE.md`, `.claude/rules/ui-architecture.md`, `performance-review.md`, `device-quality.md`, `touch-input.md`, `ui-phase-interactions.md` and domain-specific rules; follow newer revisions when implementing.
- New UI: Vue 3 + strict TypeScript (SFC `<script setup lang="ts">`), typed adapters for necessary JS physics/Three.js render loop. No Vue reactive writes or DOM queries per frame.
- Android Chrome and iPhone Safari/Chrome portrait + landscape, tablet and desktop; `en`/`zh-TW`, Low/Medium/High, VFX off, Reduced Motion, muted audio; preserve critical controls/data at every tier.
- Performance first with before/after real WebGL evidence, FPS, p50/p95 frame-time, Draw Calls, Triangles, GPU uploads; screen overlays and touch controls must not block the game.
- TDD RED→GREEN→Refactor, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour/Cloud Save when relevant, `make verify`, exact-HEAD GitHub CI. Only mark `TODO.md` item `- [x]` after each *fully implemented and verified* requirement is complete; never mark for a plan.
- Each agent owns its feature branch and specific files; dependent implementation waits for prerequisites merged into `main` after user approval. If source TODO is absent on the branch, first integrate the approved spec using an explicit non-destructive merge/cherry-pick and do not copy stale contents over main.

## Review Focus

1. **Risk 1:** Current final NITRO step immediately increments tutorial index on valid nitro use. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** A tutorial step must never override steering or rewrite race physics. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Engine reward event edge must survive real pause/resume and no double payment. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Mobile touch and browser back-swipe can lose pointer release. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Tutorial HUD must not obscure forward road. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Practice NITRO:** Given player reaches NITRO lesson with one practice charge; When they activate NITRO; Then the real car remains controllable during sprint and lesson completes only after observed acceleration.
2. **Air-road chain:** Given player flies and triggers BOOST/NITRO while airborne; When they land cleanly under engine rules; Then actual AIR→ROAD CHAIN pays once and tutorial advances.
3. **Barrel roll:** Given the car is flying; When player quickly steers opposite directions and lands cleanly; Then real roll reward occurs and lesson passes once.
4. **Invalid maneuver:** Given player has no charge, lands hard, pauses or releases touch; When an attempted maneuver occurs; Then no false completion or stuck steering.

## File responsibility map

- `src/interactive-tutorial.ts`: Task 1 ownership — Introduce explicit tutorial event/phase observation for activation, in-progress and landing completion rather than a button-press shortcut; test `tests/interactive-tutorial.test.js`.
- `src/tutorial-ui.ts`: Task 2 ownership — Extend real sequence and localized coaching with barrel roll and air-road chain without steering authority changes; test `tests/tutorial-ui.test.js`.
- `src/tutorial-coach-state.ts`: Task 3 ownership — Make final NITRO lesson observe a real 1.5–2s target (validate actual lifetime) and avoid blocking active driving; test `tests/interactive-tutorial-browser.spec.js`.
- `src/locales/ui.ts`: Task 4 ownership — Cover real engine, keyboard/mobile gestures, failed landing, pause/reset, repeated inputs and locales; test `tests/phase1-flight-flow.test.js`.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [tutorial-ux-combos visual design prompt](../prompts/2026-10-31-tutorial-ux-combos-visual-design.md).

**Scope:** coaching overlay cards, compact maneuver pictograms and replay cues. Prefer SVG/live HUD; test real tutorial step result with keyboard, iOS/Android touch.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

## TDD tasks (not started)

### Task 1: Introduce explicit tutorial event/phase observation for activation, in-progress and landing completion rather than a button-press shortcut

**Files:**
- Modify (as needed): `src/interactive-tutorial.ts`
- Test: `tests/interactive-tutorial.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/interactive-tutorial.test.js`, add a regression named `scenario 1 — Practice NITRO`. Set up **Given** player reaches NITRO lesson with one practice charge; trigger **When** they activate NITRO; assert **Then** the real car remains controllable during sprint and lesson completes only after observed acceleration. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/interactive-tutorial.test.js` for `.test.js` or `npx playwright test tests/interactive-tutorial.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Introduce explicit tutorial event/phase observation for activation, in-progress and landing completion rather than a button-press shortcut** in `src/interactive-tutorial.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/tutorial-ux-combos`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Extend real sequence and localized coaching with barrel roll and air-road chain without steering authority changes

**Files:**
- Modify (as needed): `src/tutorial-ui.ts`
- Test: `tests/tutorial-ui.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/tutorial-ui.test.js`, add a regression named `scenario 2 — Air-road chain`. Set up **Given** player flies and triggers BOOST/NITRO while airborne; trigger **When** they land cleanly under engine rules; assert **Then** actual AIR→ROAD CHAIN pays once and tutorial advances. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/tutorial-ui.test.js` for `.test.js` or `npx playwright test tests/tutorial-ui.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Extend real sequence and localized coaching with barrel roll and air-road chain without steering authority changes** in `src/tutorial-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/tutorial-ux-combos`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Make final NITRO lesson observe a real 1.5–2s target (validate actual lifetime) and avoid blocking active driving

**Files:**
- Modify (as needed): `src/tutorial-coach-state.ts`
- Test: `tests/interactive-tutorial-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/interactive-tutorial-browser.spec.js`, add a regression named `scenario 3 — Barrel roll`. Set up **Given** the car is flying; trigger **When** player quickly steers opposite directions and lands cleanly; assert **Then** real roll reward occurs and lesson passes once. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/interactive-tutorial-browser.spec.js` for `.test.js` or `npx playwright test tests/interactive-tutorial-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Make final NITRO lesson observe a real 1.5–2s target (validate actual lifetime) and avoid blocking active driving** in `src/tutorial-coach-state.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/tutorial-ux-combos`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Cover real engine, keyboard/mobile gestures, failed landing, pause/reset, repeated inputs and locales

**Files:**
- Modify (as needed): `src/locales/ui.ts`
- Test: `tests/phase1-flight-flow.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/phase1-flight-flow.test.js`, add a regression named `scenario 4 — Invalid maneuver`. Set up **Given** player has no charge, lands hard, pauses or releases touch; trigger **When** an attempted maneuver occurs; assert **Then** no false completion or stuck steering. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/phase1-flight-flow.test.js` for `.test.js` or `npx playwright test tests/phase1-flight-flow.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Cover real engine, keyboard/mobile gestures, failed landing, pause/reset, repeated inputs and locales** in `src/locales/ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/tutorial-ux-combos`; do not check any high-level TODO item until its full end-to-end acceptance is met.

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

## 2026-10-31 Implementation / CI checkpoint

- Added `src/tutorial-maneuver-state.ts` and focused engine-event observer tests, while keeping physics and controls unchanged.
- Expanded tutorial from eight to ten real-engine steps and updated `src/tutorial-ui.ts`, `src/TutorialCoach.vue`, `src/locales/ui.ts`, unit and Playwright test cases.
- Exact feature HEAD `9184c16afc932d481471b8b59328249ba3507a66` had CI run [41130940770](https://github.com/weskao/skyline-rush/actions/runs/41130940770) **cancelled** before unit/browser/world-tour suites completed. Cloud Save succeeded; quality-gate failed with ENOENT because no browser-generated `render-performance-*` artifact directory existed after cancellation. This is *not* a green test run or proof of code failure.
- Re-ran the cancelled `unit-tests` job on that SHA; full-suite execution and WebGL/physical-device evidence are not yet confirmed. Do not check off TODO 1/2/8/9, bypass validation, or merge `main` until a successful exact-HEAD quality gate and required acceptance evidence exist.
