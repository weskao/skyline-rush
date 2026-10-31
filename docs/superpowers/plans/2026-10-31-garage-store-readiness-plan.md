# Garage Store Readiness Without Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coming-soon store entry, catalog presentation and premium purchase interface boundaries only; no real payment, SDK, paid balances, unauthorized grant or conversion prices.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-garage-store-readiness-design.md](../specs/2026-10-31-garage-store-readiness-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/garage-store-readiness`
**Wave:** 3 · **TODO:** 5.7, 5.8 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Garage Economy Foundation merged; any real money requires separate explicit approval and compliance review.

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

1. **Risk 1:** Real-money policies, refunds and app-platform requirements not yet approved. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** No client-trusted checkout entitlement. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Do not invent premium currency conversion/price. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Avoid misleading Buy UI. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Future integration must be separate approved work. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Unlaunched shop:** Given store feature is disabled; When player opens Garage Home; Then Shop is clearly Coming soon and cannot charge money.
2. **Inspect future item:** Given a not-yet-owned future store item exists; When player previews; Then no purchase, fake price or ownership grant occurs.
3. **No SDK:** Given store provider is unconfigured; When player opens Garage and races; Then all free game functions continue.
4. **Account switch:** Given a different user signs in; When Shop remains unavailable; Then trial/owned status and price previews do not leak.

## File responsibility map

- `src/GaragePanel.vue`: Task 1 ownership — Specify feature-flagged Coming soon storefront with en/zh-TW clear no-payment labels; test `tests/garage-ui.test.js`.
- `src/garage-ui.ts`: Task 2 ownership — Separate future SKU/pack metadata display and purchase/entitlement boundary without live SDK; test `tests/garage-view-state.test.js`.
- `src/garage-view-state.ts`: Task 3 ownership — Ensure no transactional button, paid grant or live premium balance in current UI; test `tests/i18n.test.js`.
- `src/appearance.ts`: Task 4 ownership — Test shop-hidden/offline/unsupported provider, account switching and visual accessibility; test `tests/close-button-browser.spec.js`.

### Task V0: Optional GPT-created visual assets, transparency and asset fallback (SDD → BDD → TDD)

**Files:**
- Review: `src/icons.ts`, existing relevant Vue/Three.js modules and `public/icons/`.
- Spec/visual prompt: `docs/superpowers/prompts/2026-10-31-garage-store-readiness-visual-design.md`.
- Create **only if approved and needed**: original concept board under `docs/designs/garage-store-readiness/`, production files in an existing suitable `public/` asset location.
- Tests: add to the existing pertinent `tests/*.test.js` and Playwright `tests/*browser.spec.js` listed under File responsibility map.

**Decision contract:** Optional transparent Coming Soon/shop-category decorative icon; no Buy button, price screenshot, checkout art, payment provider imagery or deployed purchases.
**BDD example:** Given storefront is unavailable, When Coming Soon art is missing or user opens Shop, Then disabled state remains explicit, accessible and non-transactional.

- [ ] **Step 1 — inspect and decide:** audit existing assets and record whether a new image adds actual visual value; choose existing SVG/CSS/Three.js first. Specify intended display pixel size, file count/budget, localization, alpha vs opaque and Low/Medium/High/Reduced Motion fallbacks. Do not generate a file just because this task exists.
- [ ] **Step 2 — write RED tests:** assert that missing/corrupt/late asset preserves readable controls, semantic text and correct game state; add relevant Alpha/UI hit-zone checks for a transparent overlay and mobile portrait/landscape. Observe RED only when code behavior is actually missing; pure visual mockup decisions do not require synthetic failing tests.
- [ ] **Step 3 — optional generation and GREEN:** if artwork justified, use **actual GPT image-generation tool** to create original assets; for independent icons/sprites require **true transparent RGBA / alpha, no white or checkerboard pixels, no watermark, no baked text**. For scene backdrops intentionally use opaque backgrounds. Verify the generated bytes are real and alpha is correct over dark/light/saturated backgrounds, optimize PNG → alpha WebP where appropriate. SVG icons must be genuinely authored SVG, not renamed raster. Integrate into Vue/CSS or real Three.js (not screenshot replacements), then prove GREEN.
- [ ] **Step 4 — refactor/perf:** deduplicate existing icons, enforce filename/source & provenance, skip unused bulky assets, handle VFX-off/Reduced Motion and quality-tier scaling without changing physics. Inspect actual running WebGL, console, CPU/GPU memory/network bytes, draw calls and p95 frame time, including Safari/Chrome on iPhone and Android in portrait/landscape.
- [ ] **Step 5 — commit/gate:** commit relevant original optimized assets + tests on this branch only after implementation approval, and attach real WebGL screenshots. Do not call concept art finished gameplay; only mark specific `TODO.md` item `- [x]` after full SDD/BDD/TDD, `make verify`, exact-HEAD CI and actual feature acceptance.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [garage-store-readiness visual design prompt](../prompts/2026-10-31-garage-store-readiness-visual-design.md).

**Scope:** clearly disabled Coming soon storefront and collection icons. No Buy/Pay interaction, premium balance, fake price, or payment provider during this phase.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

## TDD tasks (not started)

### Task 1: Specify feature-flagged Coming soon storefront with en/zh-TW clear no-payment labels

**Files:**
- Modify (as needed): `src/GaragePanel.vue`
- Test: `tests/garage-ui.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-ui.test.js`, add a regression named `scenario 1 — Unlaunched shop`. Set up **Given** store feature is disabled; trigger **When** player opens Garage Home; assert **Then** Shop is clearly Coming soon and cannot charge money. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-ui.test.js` for `.test.js` or `npx playwright test tests/garage-ui.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Specify feature-flagged Coming soon storefront with en/zh-TW clear no-payment labels** in `src/GaragePanel.vue`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-store-readiness`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Separate future SKU/pack metadata display and purchase/entitlement boundary without live SDK

**Files:**
- Modify (as needed): `src/garage-ui.ts`
- Test: `tests/garage-view-state.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/garage-view-state.test.js`, add a regression named `scenario 2 — Inspect future item`. Set up **Given** a not-yet-owned future store item exists; trigger **When** player previews; assert **Then** no purchase, fake price or ownership grant occurs. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/garage-view-state.test.js` for `.test.js` or `npx playwright test tests/garage-view-state.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Separate future SKU/pack metadata display and purchase/entitlement boundary without live SDK** in `src/garage-ui.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-store-readiness`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Ensure no transactional button, paid grant or live premium balance in current UI

**Files:**
- Modify (as needed): `src/garage-view-state.ts`
- Test: `tests/i18n.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/i18n.test.js`, add a regression named `scenario 3 — No SDK`. Set up **Given** store provider is unconfigured; trigger **When** player opens Garage and races; assert **Then** all free game functions continue. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/i18n.test.js` for `.test.js` or `npx playwright test tests/i18n.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Ensure no transactional button, paid grant or live premium balance in current UI** in `src/garage-view-state.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-store-readiness`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Test shop-hidden/offline/unsupported provider, account switching and visual accessibility

**Files:**
- Modify (as needed): `src/appearance.ts`
- Test: `tests/close-button-browser.spec.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/close-button-browser.spec.js`, add a regression named `scenario 4 — Account switch`. Set up **Given** a different user signs in; trigger **When** Shop remains unavailable; assert **Then** trial/owned status and price previews do not leak. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/close-button-browser.spec.js` for `.test.js` or `npx playwright test tests/close-button-browser.spec.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Test shop-hidden/offline/unsupported provider, account switching and visual accessibility** in `src/appearance.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-store-readiness`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 5: Cross-platform, integration and final branch gate

**Files:** test files listed above, any mode-specific browser specs; verification notes in the owning branch's `TODO.md` after product TODO integration.

**Interfaces:** Consumes the integrated Tasks 1–4 and emits verification evidence only, not new game code unless a failing regression requires a new RED→GREEN cycle.

- [ ] **Step 1:** Expand automated browser coverage for Android/iOS representative portrait+landscape, desktop, `en`/`zh-TW`, all three Quality tiers, VFX disabled and Reduced Motion; prove all BDD scenarios and negative paths. Simulators do not substitute for an actual-device claim.
- [ ] **Step 2:** Inspect actual WebGL gameplay/preview screenshots and control clickability; compare baseline/after Draw Calls, Triangles, FPS, p50/p95 frame time and CPU/GPU loads under matching conditions. Record untested hardware.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify` and World Tour/Cloud Save gate as applicable. Every failure must be fixed and rechecked.
- [ ] **Step 4:** Update branch from latest `main` only when dependencies are merged; resolve conflicts with both sides' features; rerun all relevant tests and inspect **exact-HEAD** GitHub CI `quality-gate`.
- [ ] **Step 5:** Only after all BDD and TDD acceptance passes, change completed corresponding requirement(s) to `- [x]` in the approved full `TODO.md`, retaining unchecked partial requirements and recording evidence. **Important:** the planning TODO exists on `feature/ux-ui-combo-mobile-controls`, not base `main`. Coordinate integration before marking; never overwrite newer TODO. Commit progress evidence, request explicit permission before a direct main merge; do not create PR.

### Independent artwork pre-production handoff — 2026-10-31

**Branch:** `feature/garage-store-readiness` · **Art-only status:** `independent-icons-complete`. This status is distinct from feature implementation and final CI acceptance.

- [x] **Original standalone visual files created and committed** in [`4802122`](https://github.com/weskao/skyline-rush/commit/480212262d5e5ae0d2dd11065cec7f489d685ef3): `public/feature-assets/garage-store-readiness/coming-soon.svg`, `public/feature-assets/garage-store-readiness/collection.svg`.
- [x] **Asset manifest written:** [`public/feature-assets/garage-store-readiness/ASSET-MANIFEST.md`](https://github.com/weskao/skyline-rush/blob/feature/garage-store-readiness/public/feature-assets/garage-store-readiness/ASSET-MANIFEST.md). Files exist in this branch independently of Wave dependencies; they are not yet imported by runtime UI.
- [x] **Standalone artwork format selected:** original self-contained 96×96 SVG icons with transparent root backgrounds, no scripts, external fonts, baked text or painted checkerboard; no raster RGBA/PNG is claimed.

**Remaining dependency-gated work:** DO NOT implement checkout, buy actions, fake price, real balance, or actual store products. Wait for Economy Foundation merge and product approval, then optionally show Coming Soon/即將推出 as live text with these disabled/non-transactional SVG icons. Test no click-through, failed asset fallback and accessible disabled state.

- [ ] **Pending:** renderer/UI integration, missing-asset fallback tests where relevant, genuine BDD/TDD RED→GREEN, en/zh-TW, iOS/Android browser portrait/landscape, desktop, Low/Medium/High and reduced-motion/VFX-off as applicable.
- [ ] **Pending:** final exact feature-HEAD `quality-gate` evidence, TODO `- [x]` only for fully accepted feature requirements, and user-approved merge gate; **do not mark TODO items as completed from these assets alone**.
- [ ] **Integration rule:** preserve these existing asset paths when syncing newest `main`; do not regenerate equivalent icons unless the actual GUI or performance review rejects their suitability. Do not overwrite newer branch code/docs from parallel GPT chats.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
