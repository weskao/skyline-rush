# Immersive Hybrid HUD and Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default immersive Hybrid A+B with opt-in Competitive C from Settings; adjustable safe-area thumb controls, NITRO READY/charging/active/disabled and compact notices. Both iPhone/Android portrait/landscape and desktop.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-mobile-controls-hud-design.md](../specs/2026-10-31-mobile-controls-hud-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/mobile-controls-hud`
**Wave:** 1 · **TODO:** 3, 6, 7 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** None; share read-only NITRO status contract with tutorial/VFX workers; own HUD and controls, not world.js.

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

1. **Risk 1:** Topbar z-index and invisible overlays can intercept results/camera controls. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** Per-frame HUD must not use Vue reactive writes or repeated DOM queries. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** WebKit may miss pointerup/cancel on back swipe. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** READY must be based on actual usable charge not animation alone. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Compact C must not obscure obstacles on narrow landscape. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Default:** Given HUD preference absent; When race is opened; Then Hybrid A+B displays essentials without central occlusion.
2. **Competitive C:** Given user chooses C in Settings; When they rotate/reload; Then fuller info displays with saved preference and safe control bounds.
3. **READY:** Given NITRO crosses actionable threshold; When subsequent frames render; Then one cue plays and persistent visible READY state remains.
4. **Touch editing:** Given player drags controls in edit mode; When they save layout; Then no ability fires, controls remain in safe areas, reset works.

## File responsibility map

- `src/race-hud.ts`: Task 1 ownership — Define typed HUD display-mode preference and correct ability readiness transitions with one-shot audio cue; test `tests/race-hud.test.js`.
- `src/touch-controls-ui.ts`: Task 2 ownership — Extend control-layout settings to keep independent portrait/landscape safe-zone group positions and reset; test `tests/control-settings.test.js`.
- `src/control-settings.ts`: Task 3 ownership — Build Settings A+B/C selector and mode-specific readable hierarchy without per-frame Vue reactivity; test `tests/custom-controls-browser.spec.js`.
- `src/SettingsPanel.vue`: Task 4 ownership — Verify real touch and desktop controls, occlusion, finish actions, persistence and quality-tier parity; test `tests/responsive-browser.spec.js`.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [mobile-controls-hud visual design prompt](../prompts/2026-10-31-mobile-controls-hud-visual-design.md).

**Scope:** Hybrid A+B and Competitive C layouts and precise 4-state NITRO button icons. Use live Vue/CSS text/controls, existing SVG icons; avoid image-based touch buttons.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

### Task VF — enforce reference-locked visual fidelity (SDD → BDD → TDD)

**Required design:** [Visual Fidelity design and original reference map](https://github.com/weskao/skyline-rush/blob/feature/mobile-controls-hud/docs/designs/mobile-controls-hud/VISUAL-FIDELITY.md); shared policy: [Visual Fidelity Gate](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/docs/superpowers/specs/2026-10-31-visual-fidelity-gate.md).
**Prerequisite:** candidate AI design imagery is **not approved runtime art**. The original user reference crop ZIP is provided with the conversation but its PNG files are **not yet committed to GitHub**; attach the accepted real image bytes and record Git SHA before visual signoff. Simplified SVG icon/outline/wireframe is not equivalent to high-detail metallic 3D source art.

- [ ] **SDD / reference lock:** inspect real game source, current WebGL screenshots, original AI concept, saved wireframes and art assets. Specify component geometry, hierarchy, type/color/glow, camera/lighting, actual sprite/texture identities, breakpoints, animation timing, fallback, and approval status. Pending approval must block any claim of completed visual fidelity.
- [ ] **BDD / RED:** write failing real layout and state tests at 390×844, 844×390 and 1440×900 (also small-screen stress) for touch safety, no occlusion, English/Traditional Chinese copy, Low/Medium/High, Reduced Motion and missing art. Capture before screenshot of actual browser state; never screenshot an AI picture and call it game output.
- [ ] **TDD / GREEN:** implement the **approved** appearance using Vue 3 + strict TypeScript/CSS and shared Three.js renderer (true-alpha images only when needed). Preserve actual gameplay, entitlement, input, animation and GPU lifecycle; no flattened full-screen collages as interactive UI.
- [ ] **Refactor / Visual Gate:** compare the approved reference to the actual PNG and real 10–20s animation video side by side; log layout, car framing, materials, lights/glow, asset art, controls, motion, perf and accessibility as PASS/FAIL/APPROVED_DEVIATION/BLOCKED. Fix real disparities with new RED→GREEN cycles. **Do not invent a similarity percentage.**
- [ ] **Release:** only check completed TODO subitems `- [x]` after visual reviewer signoff + tested browser and Android/iOS orientations + full exact-HEAD CI. No auto PR, deployment or main merge.

## TDD tasks (not started)

### Task 1: Define typed HUD display-mode preference and correct ability readiness transitions with one-shot audio cue

**Files:**
- Modify (as needed): `src/race-hud.ts`
- Test: `tests/race-hud.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/race-hud.test.js`, add a regression named `scenario 1 — Default`. Set up **Given** HUD preference absent; trigger **When** race is opened; assert **Then** Hybrid A+B displays essentials without central occlusion. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/race-hud.test.js` for `.test.js` or `npx playwright test tests/race-hud.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Define typed HUD display-mode preference and correct ability readiness transitions with one-shot audio cue** in `src/race-hud.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/mobile-controls-hud`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Extend control-layout settings to keep independent portrait/landscape safe-zone group positions and reset

**Files:**
- Modify (as needed): `src/touch-controls-ui.ts`
- Test: `tests/control-settings.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/control-settings.test.js`, add a regression named `scenario 2 — Competitive C`. Set up **Given** user chooses C in Settings; trigger **When** they rotate/reload; assert **Then** fuller info displays with saved preference and safe control bounds. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/control-settings.test.js` for `.test.js` or `npx playwright test tests/control-settings.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Extend control-layout settings to keep independent portrait/landscape safe-zone group positions and reset** in `src/touch-controls-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/mobile-controls-hud`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Build Settings A+B/C selector and mode-specific readable hierarchy without per-frame Vue reactivity

**Files:**
- Modify (as needed): `src/control-settings.ts`
- Test: `tests/custom-controls-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/custom-controls-browser.spec.js`, add a regression named `scenario 3 — READY`. Set up **Given** NITRO crosses actionable threshold; trigger **When** subsequent frames render; assert **Then** one cue plays and persistent visible READY state remains. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/custom-controls-browser.spec.js` for `.test.js` or `npx playwright test tests/custom-controls-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Build Settings A+B/C selector and mode-specific readable hierarchy without per-frame Vue reactivity** in `src/control-settings.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/mobile-controls-hud`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Verify real touch and desktop controls, occlusion, finish actions, persistence and quality-tier parity

**Files:**
- Modify (as needed): `src/SettingsPanel.vue`
- Test: `tests/responsive-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/responsive-browser.spec.js`, add a regression named `scenario 4 — Touch editing`. Set up **Given** player drags controls in edit mode; trigger **When** they save layout; assert **Then** no ability fires, controls remain in safe areas, reset works. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/responsive-browser.spec.js` for `.test.js` or `npx playwright test tests/responsive-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Verify real touch and desktop controls, occlusion, finish actions, persistence and quality-tier parity** in `src/SettingsPanel.vue`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/mobile-controls-hud`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 5: Cross-platform, integration and final branch gate

**Files:** test files listed above, any mode-specific browser specs; verification notes in the owning branch's `TODO.md` after product TODO integration.

**Interfaces:** Consumes the integrated Tasks 1–4 and emits verification evidence only, not new game code unless a failing regression requires a new RED→GREEN cycle.

- [ ] **Step 1:** Expand automated browser coverage for Android/iOS representative portrait+landscape, desktop, `en`/`zh-TW`, all three Quality tiers, VFX disabled and Reduced Motion; prove all BDD scenarios and negative paths. Simulators do not substitute for an actual-device claim.
- [ ] **Step 2:** Inspect actual WebGL gameplay/preview screenshots and control clickability; compare baseline/after Draw Calls, Triangles, FPS, p50/p95 frame time and CPU/GPU loads under matching conditions. Record untested hardware.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify` and World Tour/Cloud Save gate as applicable. Every failure must be fixed and rechecked.
- [ ] **Step 4:** Update branch from latest `main` only when dependencies are merged; resolve conflicts with both sides' features; rerun all relevant tests and inspect **exact-HEAD** GitHub CI `quality-gate`.
- [ ] **Step 5:** Only after all BDD and TDD acceptance passes, change completed corresponding requirement(s) to `- [x]` in the approved full `TODO.md`, retaining unchecked partial requirements and recording evidence. **Important:** the planning TODO exists on `feature/ux-ui-combo-mobile-controls`, not base `main`. Coordinate integration before marking; never overwrite newer TODO. Commit progress evidence, request explicit permission before a direct main merge; do not create PR.

### Candidate 3× Raster Asset Delivery / 1× CSS Display Contract — 2026-10-31

**Detailed 3× file manifest:** [RASTER-ASSET-HANDOFF.md](https://github.com/weskao/skyline-rush/blob/feature/mobile-controls-hud/docs/designs/mobile-controls-hud/RASTER-ASSET-HANDOFF.md). This lists exact filenames, per-item CSS sizes, archive SHA-256 and reproducible import commands. PNG/WebP binaries are **not in GitHub** and runtime use is **not yet completed**. Some HUD button raster samples contain baked English labels and are **design references only**, not production controls.


**Asset archive:** `skyline-rush-3x-mobile-controls-hud.zip`, delivered in the originating GPT conversation, **NOT yet uploaded into this GitHub branch**. This branch has not yet imported the raster assets. Existing SVG assets and prior plans remain intact.

**Candidate images:** 18 independent, true-alpha PNG images and matching compressed WebP variants (36 image files). Generated by extracting objects from the original AI-produced raster showcase and scaling with Lanczos to exactly **3×** the intended CSS size. These are **NOT native-resolution 3× AI-generated originals**; check black/white background matte and cropped/glowing borders before adopting any image.

**Target display:** 72×72 CSS px HUD/misc icons plus six 144×52 CSS px button design samples. General sizes: `96×96 CSS px ↔ 288×288 raster px`; `72×72 CSS px ↔ 216×216 raster px`; `144×52 CSS px ↔ 432×156 raster px`. Bind `width`/`height` HTML attributes or CSS to **1×** size and set `object-fit: contain`; high DPR does not imply a larger UI hit region. Keep multi-resolution/fallback strategy in consideration rather than blindly loading 3× textures on Low-end devices.

**Implementation rules:** Do NOT use images containing baked labels as production interactive controls. Vue/HTML buttons remain semantic and translated text editable; the raster can only serve as visually approved background/detail, with real state rendering. Keep 44×44 CSS px hit targets.

- [x] Candidate 3× images and 1× CSS-size demonstration **locally created, zipped, and checked** for physical dimensions and true transparent alpha channel; source provenance and image matte limitations documented.
- [ ] Review actual images, reject ring/image clips, dark/checkerboard halos and unintended source lettering; get explicit visual signoff before production import.
- [ ] **Import actual binary PNG/WebP files** from conversation ZIP to this branch's `public/feature-assets/mobile-controls-hud/raster/`; retain source SHA, optimize sizes and remove unused variants. Do not claim those files are in GitHub before verifying with `git ls-tree`.
- [ ] TDD first for actual component integration: test 1× layout at 390×844/844×390/1440×900, object fit, missing/slow image fallback, en/zh-TW, reduced motion, Low/Medium/High and screen reader semantics; then Vue/CSS/Three.js code.
- [ ] Compare real WebGL/UI screenshots with approved AI visual reference; record visual fidelity, actual fps/p95 and branch-HEAD CI. Only after feature and visual gate passed may relevant TODO be marked `- [x]`.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
