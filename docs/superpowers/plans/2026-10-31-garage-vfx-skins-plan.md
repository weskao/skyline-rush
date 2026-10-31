# Garage VFX Cosmetic Skins and Free Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curated Thruster/Airflow/NITRO/Launch skins preview/equip; initially all new cosmetics are trial-usable, never permanently owned by trial; feature flag expiry fallback; no stat changes, currency or store.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-garage-vfx-skins-design.md](../specs/2026-10-31-garage-vfx-skins-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/garage-vfx-skins`
**Wave:** 2 · **TODO:** 5.1, 5.3, 5.6, 5.8, 5.9 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Garage Preview Studio AND High-speed VFX merged first; stable VFX binding and camera contract.

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

1. **Risk 1:** Never write trial as owned into Firebase Cloud Save. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** New GPU variants require shader warmup and bounded allocation. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Existing PAINTS stars must remain correct. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Preview differs from in-race effect if separate render paths diverge. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** No currency before economy work. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Trial equip:** Given new skin is trial-enabled and not owned; When player equips and previews; Then VFX changes, but profile ownership remains false.
2. **Trial expiry:** Given unowned trial skin is equipped; When flag turns off; Then default cosmetic is restored without corrupting saved paints.
3. **Legitimate paint:** Given player has existing star-unlocked PAINTS finish; When new catalog loads; Then prior paint selection is still valid.
4. **Quality:** Given Low/Medium/High or Reduced Motion set; When skin preview plays; Then identity stays recognizable and expensive effects scale or disable.

## File responsibility map

- `src/garage-ui.ts`: Task 1 ownership — Create stable typed catalog + entitlement resolver with distinct owned/trial/preview/equipped states; test `tests/garage-ui.test.js`.
- `src/appearance.ts`: Task 2 ownership — Implement initial curated cosmetic presets in Garage UI with real Preview Studio VFX triggers; test `tests/garage-view-state.test.js`.
- `src/vfx-settings.ts`: Task 3 ownership — Apply cosmetic VFX through existing renderer/quality and safe fallback when trial access expires; test `tests/aero-vfx.test.js`.
- `src/aero-vfx.js`: Task 4 ownership — Test account switch, existing paint ownership, Low/Medium/High and render/asset cleanup; test `tests/airflow-wake-browser.spec.js`.

### Task V0: Optional GPT-created visual assets, transparency and asset fallback (SDD → BDD → TDD)

**Files:**
- Review: `src/icons.ts`, existing relevant Vue/Three.js modules and `public/icons/`.
- Spec/visual prompt: `docs/superpowers/prompts/2026-10-31-garage-vfx-skins-visual-design.md`.
- Create **only if approved and needed**: original concept board under `docs/designs/garage-vfx-skins/`, production files in an existing suitable `public/` asset location.
- Tests: add to the existing pertinent `tests/*.test.js` and Playwright `tests/*browser.spec.js` listed under File responsibility map.

**Decision contract:** Potential transparent PNG/WebP card thumbnails and 4 original category icons; separately an opaque Studio background if necessary. Animated cosmetics remain real-time Three.js; free trial never means owned.
**BDD example:** Given a new trial-only item and missing thumbnail, When Garage renders on Low/Medium/High, Then real preview/entitlement labels remain correct and icon fallback appears; item image never grants ownership.

- [ ] **Step 1 — inspect and decide:** audit existing assets and record whether a new image adds actual visual value; choose existing SVG/CSS/Three.js first. Specify intended display pixel size, file count/budget, localization, alpha vs opaque and Low/Medium/High/Reduced Motion fallbacks. Do not generate a file just because this task exists.
- [ ] **Step 2 — write RED tests:** assert that missing/corrupt/late asset preserves readable controls, semantic text and correct game state; add relevant Alpha/UI hit-zone checks for a transparent overlay and mobile portrait/landscape. Observe RED only when code behavior is actually missing; pure visual mockup decisions do not require synthetic failing tests.
- [ ] **Step 3 — optional generation and GREEN:** if artwork justified, use **actual GPT image-generation tool** to create original assets; for independent icons/sprites require **true transparent RGBA / alpha, no white or checkerboard pixels, no watermark, no baked text**. For scene backdrops intentionally use opaque backgrounds. Verify the generated bytes are real and alpha is correct over dark/light/saturated backgrounds, optimize PNG → alpha WebP where appropriate. SVG icons must be genuinely authored SVG, not renamed raster. Integrate into Vue/CSS or real Three.js (not screenshot replacements), then prove GREEN.
- [ ] **Step 4 — refactor/perf:** deduplicate existing icons, enforce filename/source & provenance, skip unused bulky assets, handle VFX-off/Reduced Motion and quality-tier scaling without changing physics. Inspect actual running WebGL, console, CPU/GPU memory/network bytes, draw calls and p95 frame time, including Safari/Chrome on iPhone and Android in portrait/landscape.
- [ ] **Step 5 — commit/gate:** commit relevant original optimized assets + tests on this branch only after implementation approval, and attach real WebGL screenshots. Do not call concept art finished gameplay; only mark specific `TODO.md` item `- [x]` after full SDD/BDD/TDD, `make verify`, exact-HEAD CI and actual feature acceptance.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [garage-vfx-skins visual design prompt](../prompts/2026-10-31-garage-vfx-skins-visual-design.md).

**Scope:** four-category catalog icon set and curated skin preview thumbnails. Prefer SVG/WebP catalog art and real preview VFX with trial vs owned badges; no permanent inventory grant.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

### Task VF — reference-locked visual fidelity / honest no-art exception

**Source:** [Feature visual design contract](https://github.com/weskao/skyline-rush/blob/feature/garage-vfx-skins/docs/designs/garage-vfx-skins/VISUAL-FIDELITY.md); [Shared Visual Fidelity Gate](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/docs/superpowers/specs/2026-10-31-visual-fidelity-gate.md).

- [ ] **Inspect:** candidate high-resolution AI reference sheets (not real game captures) with source hashes in the feature contract; delivered `skyline-rush-design-reference-crops.zip` is available in the conversation, **not yet uploaded to GitHub**. Check current icon/asset files and gameplay code for the actual scope. Data-only branches need no new art.
- [ ] **SDD signoff:** identify selected image and commit approved file bytes to `docs/designs/garage-vfx-skins/references/`, record SHA plus the real UI/3D element/camera/motion geometry and appearance. Do not infer approval from source file existence. Do not substitute simplified 96px vector icons for the original polished 3D art without approval.
- [ ] **BDD RED:** add browser state/layout tests for actual affected screens, phone portrait 390×844, landscape 844×390, desktop 1440×900, quality Low/Medium/High, reduced motion, bilingual labels, missing-asset fallback. Capture the current live UI as RED visual baseline; do not invent browser screenshots.
- [ ] **GREEN:** implement only after prerequisites and design approval: Vue 3 strict TS/CSS for interactive UI, shared Three.js for 3D/glow/trails, true-alpha PNG/WebP/real SVG when needed. Preserve game mechanics/performance and shared renderer lifecycle.
- [ ] **Final visual gate:** compare real WebGL screenshots and recorded animation to approved reference side by side; record layout, materials, glow, icon identity, motion, device viewports and performance as PASS / FAIL / BLOCKED / APPROVED_DEVIATION with reviewer and evidence. A green CI cannot waive design signoff.
- [ ] **TODO:** check `- [x]` only after actual feature + BDD/TDD + approved visual acceptance and exact HEAD CI; no automatic PR/merge/deployment. If this is a nonvisual economy foundation, document an explicit `NOT_APPLICABLE` visual exception instead of creating speculative art.

## TDD tasks (not started)

### Task 1: Create stable typed catalog + entitlement resolver with distinct owned/trial/preview/equipped states

**Files:**
- Modify (as needed): `src/garage-ui.ts`
- Test: `tests/garage-ui.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-ui.test.js`, add a regression named `scenario 1 — Trial equip`. Set up **Given** new skin is trial-enabled and not owned; trigger **When** player equips and previews; assert **Then** VFX changes, but profile ownership remains false. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-ui.test.js` for `.test.js` or `npx playwright test tests/garage-ui.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Create stable typed catalog + entitlement resolver with distinct owned/trial/preview/equipped states** in `src/garage-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-vfx-skins`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Implement initial curated cosmetic presets in Garage UI with real Preview Studio VFX triggers

**Files:**
- Modify (as needed): `src/appearance.ts`
- Test: `tests/garage-view-state.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-view-state.test.js`, add a regression named `scenario 2 — Trial expiry`. Set up **Given** unowned trial skin is equipped; trigger **When** flag turns off; assert **Then** default cosmetic is restored without corrupting saved paints. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-view-state.test.js` for `.test.js` or `npx playwright test tests/garage-view-state.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Implement initial curated cosmetic presets in Garage UI with real Preview Studio VFX triggers** in `src/appearance.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-vfx-skins`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Apply cosmetic VFX through existing renderer/quality and safe fallback when trial access expires

**Files:**
- Modify (as needed): `src/vfx-settings.ts`
- Test: `tests/aero-vfx.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/aero-vfx.test.js`, add a regression named `scenario 3 — Legitimate paint`. Set up **Given** player has existing star-unlocked PAINTS finish; trigger **When** new catalog loads; assert **Then** prior paint selection is still valid. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/aero-vfx.test.js` for `.test.js` or `npx playwright test tests/aero-vfx.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Apply cosmetic VFX through existing renderer/quality and safe fallback when trial access expires** in `src/vfx-settings.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-vfx-skins`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Test account switch, existing paint ownership, Low/Medium/High and render/asset cleanup

**Files:**
- Modify (as needed): `src/aero-vfx.js`
- Test: `tests/airflow-wake-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/airflow-wake-browser.spec.js`, add a regression named `scenario 4 — Quality`. Set up **Given** Low/Medium/High or Reduced Motion set; trigger **When** skin preview plays; assert **Then** identity stays recognizable and expensive effects scale or disable. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/airflow-wake-browser.spec.js` for `.test.js` or `npx playwright test tests/airflow-wake-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Test account switch, existing paint ownership, Low/Medium/High and render/asset cleanup** in `src/aero-vfx.js`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-vfx-skins`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 5: Cross-platform, integration and final branch gate

**Files:** test files listed above, any mode-specific browser specs; verification notes in the owning branch's `TODO.md` after product TODO integration.

**Interfaces:** Consumes the integrated Tasks 1–4 and emits verification evidence only, not new game code unless a failing regression requires a new RED→GREEN cycle.

- [ ] **Step 1:** Expand automated browser coverage for Android/iOS representative portrait+landscape, desktop, `en`/`zh-TW`, all three Quality tiers, VFX disabled and Reduced Motion; prove all BDD scenarios and negative paths. Simulators do not substitute for an actual-device claim.
- [ ] **Step 2:** Inspect actual WebGL gameplay/preview screenshots and control clickability; compare baseline/after Draw Calls, Triangles, FPS, p50/p95 frame time and CPU/GPU loads under matching conditions. Record untested hardware.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify` and World Tour/Cloud Save gate as applicable. Every failure must be fixed and rechecked.
- [ ] **Step 4:** Update branch from latest `main` only when dependencies are merged; resolve conflicts with both sides' features; rerun all relevant tests and inspect **exact-HEAD** GitHub CI `quality-gate`.
- [ ] **Step 5:** Only after all BDD and TDD acceptance passes, change completed corresponding requirement(s) to `- [x]` in the approved full `TODO.md`, retaining unchecked partial requirements and recording evidence. **Important:** the planning TODO exists on `feature/ux-ui-combo-mobile-controls`, not base `main`. Coordinate integration before marking; never overwrite newer TODO. Commit progress evidence, request explicit permission before a direct main merge; do not create PR.

### Independent artwork pre-production handoff — 2026-10-31

**Branch:** `feature/garage-vfx-skins` · **Art-only status:** `independent-icons-complete`. This status is distinct from feature implementation and final CI acceptance.

- [x] **Original standalone visual files created and committed** in [`45f0649`](https://github.com/weskao/skyline-rush/commit/45f0649e9c07fc39f2432659322addd995c021bd): `public/feature-assets/garage-vfx-skins/thruster.svg`, `public/feature-assets/garage-vfx-skins/airflow.svg`, `public/feature-assets/garage-vfx-skins/nitro-trail.svg`, `public/feature-assets/garage-vfx-skins/launch-flare.svg`.
- [x] **Asset manifest written:** [`public/feature-assets/garage-vfx-skins/ASSET-MANIFEST.md`](https://github.com/weskao/skyline-rush/blob/feature/garage-vfx-skins/public/feature-assets/garage-vfx-skins/ASSET-MANIFEST.md). Files exist in this branch independently of Wave dependencies; they are not yet imported by runtime UI.
- [x] **Standalone artwork format selected:** original self-contained 96×96 SVG icons with transparent root backgrounds, no scripts, external fonts, baked text or painted checkerboard; no raster RGBA/PNG is claimed.

**Remaining dependency-gated work:** Do NOT imply finished Skins. Wait for Garage Studio + High-speed VFX merged and verified. Then decide product catalog IDs and trial/owned/equipped state, use actual car renderer, connect Vue category displays to these icon URLs, test missing icon fallback, validate portrait/landscape/desktop and Low/Medium/High, and verify exact-HEAD CI. New thumbnails/background and per-skin effect variants remain optional and dependency-gated.

- [ ] **Pending:** renderer/UI integration, missing-asset fallback tests where relevant, genuine BDD/TDD RED→GREEN, en/zh-TW, iOS/Android browser portrait/landscape, desktop, Low/Medium/High and reduced-motion/VFX-off as applicable.
- [ ] **Pending:** final exact feature-HEAD `quality-gate` evidence, TODO `- [x]` only for fully accepted feature requirements, and user-approved merge gate; **do not mark TODO items as completed from these assets alone**.
- [ ] **Integration rule:** preserve these existing asset paths when syncing newest `main`; do not regenerate equivalent icons unless the actual GUI or performance review rejects their suitability. Do not overwrite newer branch code/docs from parallel GPT chats.

### Candidate 3× Raster Asset Delivery / 1× CSS Display Contract — 2026-10-31

**Asset archive:** `skyline-rush-3x-garage-vfx-skins.zip`, delivered in the originating GPT conversation, **NOT yet uploaded into this GitHub branch**. This branch has not yet imported the raster assets. Existing SVG assets and prior plans remain intact.

**Candidate images:** 27 independent, true-alpha PNG images and matching compressed WebP variants (54 image files). Generated by extracting objects from the original AI-produced raster showcase and scaling with Lanczos to exactly **3×** the intended CSS size. These are **NOT native-resolution 3× AI-generated originals**; check black/white background matte and cropped/glowing borders before adopting any image.

**Target display:** 96×96 CSS px categories, thrusters, trails, flares and badges; some badges are only style trials. General sizes: `96×96 CSS px ↔ 288×288 raster px`; `72×72 CSS px ↔ 216×216 raster px`; `144×52 CSS px ↔ 432×156 raster px`. Bind `width`/`height` HTML attributes or CSS to **1×** size and set `object-fit: contain`; high DPR does not imply a larger UI hit region. Keep multi-resolution/fallback strategy in consideration rather than blindly loading 3× textures on Low-end devices.

**Implementation rules:** Do NOT turn 3× sprites into actual Three.js thruster/trail effects until Garage Studio and High-speed VFX dependencies pass. Existing 96px SVG category icons remain valid lightweight fallbacks. Art cards only after reference approval.

- [x] Candidate 3× images and 1× CSS-size demonstration **locally created, zipped, and checked** for physical dimensions and true transparent alpha channel; source provenance and image matte limitations documented.
- [ ] Review actual images, reject ring/image clips, dark/checkerboard halos and unintended source lettering; get explicit visual signoff before production import.
- [ ] **Import actual binary PNG/WebP files** from conversation ZIP to this branch's `public/feature-assets/garage-vfx-skins/raster/`; retain source SHA, optimize sizes and remove unused variants. Do not claim those files are in GitHub before verifying with `git ls-tree`.
- [ ] TDD first for actual component integration: test 1× layout at 390×844/844×390/1440×900, object fit, missing/slow image fallback, en/zh-TW, reduced motion, Low/Medium/High and screen reader semantics; then Vue/CSS/Three.js code.
- [ ] Compare real WebGL/UI screenshots with approved AI visual reference; record visual fidelity, actual fps/p95 and branch-HEAD CI. Only after feature and visual gate passed may relevant TODO be marked `- [x]`.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
