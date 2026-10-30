# Foldable and Dual-screen Layout Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Responsive cover/inner display, split-screen, hinge, rotation and browser viewport resizing; progressive enhancements for viewport segments; preserve thumb controls, HUD and camera sightline across fold and ordinary phones.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-foldable-layout-adaptation-design.md](../specs/2026-10-31-foldable-layout-adaptation-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/foldable-layout-adaptation`
**Wave:** 2 · **TODO:** 4 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Mobile Controls/HUD merged first; reuse its saved orientation controls and HUD modes.

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

1. **Risk 1:** Window segments API optional, must degrade gracefully. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** Never infer GPU quality from UA or touch status. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Pointer capture may be lost on fold/rotation. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Hinge zone can cover race controls. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Keep normal mobile/desktop regression green. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Cover:** Given foldable is closed; When player starts race; Then phone controls and HUD fit safe visible area.
2. **Inner:** Given viewport expands; When player unfolds; Then car remains centered and controls remain reachable.
3. **Hinge:** Given viewport segment hinge exists; When Competitive C shows map; Then no essential touch control or widget straddles hinge.
4. **No API:** Given viewport segment API missing or pointerup lost; When screen rotates; Then fallback responsive layout works with no stuck steering.

## File responsibility map

- `src/touch-controls-ui.ts`: Task 1 ownership — Specify safe-area and hinge/viewport segment geometry with fallback when API unavailable; test `tests/responsive-browser.spec.js`.
- `src/control-settings.ts`: Task 2 ownership — Refactor pure responsive control placement to bound groups away from hinge and edge swipe zones; test `tests/custom-controls-browser.spec.js`.
- `src/style.css`: Task 3 ownership — Apply responsive portrait/landscape transitions without losing input or saved HUD mode; test `tests/touch-actions-browser.spec.js`.
- `src/App.vue`: Task 4 ownership — Verify cover/inner/split viewport emulation and real device acceptance where available; test `tests/device-quality-browser.spec.js`.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [foldable-layout-adaptation visual design prompt](../prompts/2026-10-31-foldable-layout-adaptation-visual-design.md).

**Scope:** hinge, cover/inner display and split-screen wireframe set. Only layout documentation/mockups; production uses CSS/viewport APIs, not decorative images.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

## TDD tasks (not started)

### Task 1: Specify safe-area and hinge/viewport segment geometry with fallback when API unavailable

**Files:**
- Modify (as needed): `src/touch-controls-ui.ts`
- Test: `tests/responsive-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/responsive-browser.spec.js`, add a regression named `scenario 1 — Cover`. Set up **Given** foldable is closed; trigger **When** player starts race; assert **Then** phone controls and HUD fit safe visible area. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/responsive-browser.spec.js` for `.test.js` or `npx playwright test tests/responsive-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Specify safe-area and hinge/viewport segment geometry with fallback when API unavailable** in `src/touch-controls-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/foldable-layout-adaptation`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Refactor pure responsive control placement to bound groups away from hinge and edge swipe zones

**Files:**
- Modify (as needed): `src/control-settings.ts`
- Test: `tests/custom-controls-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/custom-controls-browser.spec.js`, add a regression named `scenario 2 — Inner`. Set up **Given** viewport expands; trigger **When** player unfolds; assert **Then** car remains centered and controls remain reachable. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/custom-controls-browser.spec.js` for `.test.js` or `npx playwright test tests/custom-controls-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Refactor pure responsive control placement to bound groups away from hinge and edge swipe zones** in `src/control-settings.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/foldable-layout-adaptation`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Apply responsive portrait/landscape transitions without losing input or saved HUD mode

**Files:**
- Modify (as needed): `src/style.css`
- Test: `tests/touch-actions-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/touch-actions-browser.spec.js`, add a regression named `scenario 3 — Hinge`. Set up **Given** viewport segment hinge exists; trigger **When** Competitive C shows map; assert **Then** no essential touch control or widget straddles hinge. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/touch-actions-browser.spec.js` for `.test.js` or `npx playwright test tests/touch-actions-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Apply responsive portrait/landscape transitions without losing input or saved HUD mode** in `src/style.css`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/foldable-layout-adaptation`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Verify cover/inner/split viewport emulation and real device acceptance where available

**Files:**
- Modify (as needed): `src/App.vue`
- Test: `tests/device-quality-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/device-quality-browser.spec.js`, add a regression named `scenario 4 — No API`. Set up **Given** viewport segment API missing or pointerup lost; trigger **When** screen rotates; assert **Then** fallback responsive layout works with no stuck steering. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/device-quality-browser.spec.js` for `.test.js` or `npx playwright test tests/device-quality-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Verify cover/inner/split viewport emulation and real device acceptance where available** in `src/App.vue`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/foldable-layout-adaptation`; do not check any high-level TODO item until its full end-to-end acceptance is met.

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
