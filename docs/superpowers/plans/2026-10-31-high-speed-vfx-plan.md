# Speed-Sensation NITRO and BOOST Effects Implementation Plan

> **Branch integration policy override (2026-10-31):** `develop` is the sole integration target, **not `main`**. Wave 1 Tutorial/Mobile HUD/Garage Studio were integrated at `a021044dff22f8dab3845d182794d7d397b56d06`; its [full develop CI](https://github.com/weskao/skyline-rush/actions/runs/41195915543) was pending when this note was written. Before feature coding, verify the latest actual develop HEAD full-regression CI is green; if it fails, stop and diagnose. Sync latest develop into this existing feature branch **non-destructively**, preserve docs/tests and only start once this branch's specific prerequisites are met. Do not auto-merge this work into develop, main, or open a PR; request user authorization after complete acceptance. Any historical references to `main` in this plan/spec are superseded by this note.


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

### Task V0: Optional GPT-created visual assets, transparency and asset fallback (SDD → BDD → TDD)

**Files:**
- Review: `src/icons.ts`, existing relevant Vue/Three.js modules and `public/icons/`.
- Spec/visual prompt: `docs/superpowers/prompts/2026-10-31-high-speed-vfx-visual-design.md`.
- Create **only if approved and needed**: original concept board under `docs/designs/high-speed-vfx/`, production files in an existing suitable `public/` asset location.
- Tests: add to the existing pertinent `tests/*.test.js` and Playwright `tests/*browser.spec.js` listed under File responsibility map.

**Decision contract:** Only optional transparent energy-ring/particle sprite where CPU/GPU profiling justifies it; main deliverable is storyboard and real Three.js FOV/particles/shader. No full-screen image blur.
**BDD example:** Given Low quality/Reduced Motion, When the real car activates BOOST or NITRO, Then a readable limited-cost cue remains and no generated storyboard becomes a live static overlay.

- [ ] **Step 1 — inspect and decide:** audit existing assets and record whether a new image adds actual visual value; choose existing SVG/CSS/Three.js first. Specify intended display pixel size, file count/budget, localization, alpha vs opaque and Low/Medium/High/Reduced Motion fallbacks. Do not generate a file just because this task exists.
- [ ] **Step 2 — write RED tests:** assert that missing/corrupt/late asset preserves readable controls, semantic text and correct game state; add relevant Alpha/UI hit-zone checks for a transparent overlay and mobile portrait/landscape. Observe RED only when code behavior is actually missing; pure visual mockup decisions do not require synthetic failing tests.
- [ ] **Step 3 — optional generation and GREEN:** if artwork justified, use **actual GPT image-generation tool** to create original assets; for independent icons/sprites require **true transparent RGBA / alpha, no white or checkerboard pixels, no watermark, no baked text**. For scene backdrops intentionally use opaque backgrounds. Verify the generated bytes are real and alpha is correct over dark/light/saturated backgrounds, optimize PNG → alpha WebP where appropriate. SVG icons must be genuinely authored SVG, not renamed raster. Integrate into Vue/CSS or real Three.js (not screenshot replacements), then prove GREEN.
- [ ] **Step 4 — refactor/perf:** deduplicate existing icons, enforce filename/source & provenance, skip unused bulky assets, handle VFX-off/Reduced Motion and quality-tier scaling without changing physics. Inspect actual running WebGL, console, CPU/GPU memory/network bytes, draw calls and p95 frame time, including Safari/Chrome on iPhone and Android in portrait/landscape.
- [ ] **Step 5 — commit/gate:** commit relevant original optimized assets + tests on this branch only after implementation approval, and attach real WebGL screenshots. Do not call concept art finished gameplay; only mark specific `TODO.md` item `- [x]` after full SDD/BDD/TDD, `make verify`, exact-HEAD CI and actual feature acceptance.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [high-speed-vfx visual design prompt](../prompts/2026-10-31-high-speed-vfx-visual-design.md).

**Scope:** speed-ramp storyboard for start/sustain/end and quality-tier VFX. Design references do not become static overlays; actual VFX stays in Three.js.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

### Task VF — enforce reference-locked visual fidelity (SDD → BDD → TDD)

**Required design:** [Visual Fidelity design and original reference map](https://github.com/weskao/skyline-rush/blob/feature/high-speed-vfx/docs/designs/high-speed-vfx/VISUAL-FIDELITY.md); shared policy: [Visual Fidelity Gate](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/docs/superpowers/specs/2026-10-31-visual-fidelity-gate.md).
**Prerequisite:** candidate AI design imagery is **not approved runtime art**. The original user reference crop ZIP is provided with the conversation but its PNG files are **not yet committed to GitHub**; attach the accepted real image bytes and record Git SHA before visual signoff. Simplified SVG icon/outline/wireframe is not equivalent to high-detail metallic 3D source art.

- [ ] **SDD / reference lock:** inspect real game source, current WebGL screenshots, original AI concept, saved wireframes and art assets. Specify component geometry, hierarchy, type/color/glow, camera/lighting, actual sprite/texture identities, breakpoints, animation timing, fallback, and approval status. Pending approval must block any claim of completed visual fidelity.
- [ ] **BDD / RED:** write failing real layout and state tests at 390×844, 844×390 and 1440×900 (also small-screen stress) for touch safety, no occlusion, English/Traditional Chinese copy, Low/Medium/High, Reduced Motion and missing art. Capture before screenshot of actual browser state; never screenshot an AI picture and call it game output.
- [ ] **TDD / GREEN:** implement the **approved** appearance using Vue 3 + strict TypeScript/CSS and shared Three.js renderer (true-alpha images only when needed). Preserve actual gameplay, entitlement, input, animation and GPU lifecycle; no flattened full-screen collages as interactive UI.
- [ ] **Refactor / Visual Gate:** compare the approved reference to the actual PNG and real 10–20s animation video side by side; log layout, car framing, materials, lights/glow, asset art, controls, motion, perf and accessibility as PASS/FAIL/APPROVED_DEVIATION/BLOCKED. Fix real disparities with new RED→GREEN cycles. **Do not invent a similarity percentage.**
- [ ] **Release:** only check completed TODO subitems `- [x]` after visual reviewer signoff + tested browser and Android/iOS orientations + full exact-HEAD CI. No auto PR, deployment or main merge.

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

### Independent artwork pre-production handoff — 2026-10-31

**Branch:** `feature/high-speed-vfx` · **Art-only status:** `reference-only-complete`. This status is distinct from feature implementation and final CI acceptance.

- [x] **Original standalone visual files created and committed** in [`e891bc8`](https://github.com/weskao/skyline-rush/commit/e891bc8069ccc603a0aaeaa626ef0ccd9cdb2316): `docs/designs/high-speed-vfx/sprint-vfx-storyboard.svg`.
- [x] **Asset manifest written:** [`docs/designs/high-speed-vfx/ASSET-MANIFEST.md`](https://github.com/weskao/skyline-rush/blob/feature/high-speed-vfx/docs/designs/high-speed-vfx/ASSET-MANIFEST.md). Files exist in this branch independently of Wave dependencies; they are not yet imported by runtime UI.
- [x] **Standalone artwork format selected:** one self-contained vector storyboard with intentionally opaque dark background (not an icon and not intended for game assets).

**Remaining dependency-gated work:** This is an OPAQUE concept board, not a runtime asset. Wait for mobile-controls-hud merge; implement speed-aware VFX using actual Three.js shaders/FOV/trails; only evaluate tiny transparent sprite after benchmarking. Compare actual WebGL frame time, shader compile, reduced-motion and Low/Medium/High. Do not use the static storyboard as an overlay.

- [ ] **Pending:** renderer/UI integration, missing-asset fallback tests where relevant, genuine BDD/TDD RED→GREEN, en/zh-TW, iOS/Android browser portrait/landscape, desktop, Low/Medium/High and reduced-motion/VFX-off as applicable.
- [ ] **Pending:** final exact feature-HEAD `quality-gate` evidence, TODO `- [x]` only for fully accepted feature requirements, and user-approved merge gate; **do not mark TODO items as completed from these assets alone**.
- [ ] **Integration rule:** preserve these existing asset paths when syncing newest `main`; do not regenerate equivalent icons unless the actual GUI or performance review rejects their suitability. Do not overwrite newer branch code/docs from parallel GPT chats.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
