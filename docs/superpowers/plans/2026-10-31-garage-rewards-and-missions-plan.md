# Race Rewards, Missions and Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Future soft currency race payout and event-based missions; verified once-only settlement and compact results, account isolation, Cloud Save-safe idempotency. Do not invent rates or launch until economy approved.

**Architecture:** Implement the SDD design with small typed contracts and tested behavior boundaries, then browser/real-WebGL regression gates. Keep Vue event-driven state separate from JS physics/render hot paths. Do not work on other agents' branches.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, strict TypeScript, Vite, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-31-garage-rewards-and-missions-design.md](../specs/2026-10-31-garage-rewards-and-missions-design.md)

**Repository:** https://github.com/weskao/skyline-rush
**Target branch:** `feature/garage-rewards-and-missions`
**Wave:** 3 · **TODO:** 5.5, 5.9 · **Status:** PLAN ONLY — NOT IMPLEMENTED
**Dependency:** Garage Economy Foundation merged; align scoring with Eight-Car Grid if it is already landed.

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

1. **Risk 1:** Balance is not authorized until economy sign-off. Pin it to Task 1 with a negative, cross-device or persistent-state assertion.
2. **Risk 2:** Retry and replays must not double-mint. Pin it to Task 2 with a negative, cross-device or persistent-state assertion.
3. **Risk 3:** Firestore offline and account transitions are security-sensitive. Pin it to Task 3 with a negative, cross-device or persistent-state assertion.
4. **Risk 4:** Mode eligibility may change with eight-car branch. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.
5. **Risk 5:** Results cannot promise credits while settlement pending. Pin it to Task 4 with a negative, cross-device or persistent-state assertion.

## BDD behavioral contracts (source of truth for tests)

1. **Eligible finish:** Given a race has a verified eligible completion ID; When results settle; Then one award and matching mission progress are committed once.
2. **Duplicate:** Given the same result renders or reconnects twice; When settlement repeats; Then no duplicate award.
3. **Ineligible practice:** Given tutorial or excluded mode ends; When results appear; Then no real currency is claimed.
4. **Account change:** Given account A finished a mission; When account B signs in; Then wallet and progress are not shared.

## File responsibility map

- `src/race-results.ts`: Task 1 ownership — Design eligible genuine-race events, versioned unique settlement IDs and pure mission progress reducers; test `tests/race-results.test.js`.
- `src/result-screen.ts`: Task 2 ownership — Implement server-authoritative or otherwise approved durable idempotent soft-reward contract, no unverified client minting; test `tests/result-screen.test.js`.
- `src/history-achievements.ts`: Task 3 ownership — Show honest result reward and mission progress only after committed settlement, with partial/offline states; test `tests/history-achievements-typescript.test.js`.
- `src/cloud-progress.ts`: Task 4 ownership — Test repeated settlement, retry/reconnect, mode eligibility, account changes and old records; test `tests/cloud-progress.test.js`.

### Task V0: Optional GPT-created visual assets, transparency and asset fallback (SDD → BDD → TDD)

**Files:**
- Review: `src/icons.ts`, existing relevant Vue/Three.js modules and `public/icons/`.
- Spec/visual prompt: `docs/superpowers/prompts/2026-10-31-garage-rewards-and-missions-visual-design.md`.
- Create **only if approved and needed**: original concept board under `docs/designs/garage-rewards-and-missions/`, production files in an existing suitable `public/` asset location.
- Tests: add to the existing pertinent `tests/*.test.js` and Playwright `tests/*browser.spec.js` listed under File responsibility map.

**Decision contract:** Only after rewards are authorized, optional transparent reward/mission/coin glyphs; quantities, dates and localization remain live Vue text, never baked in images.
**BDD example:** Given a pending or failed settlement, When reward panel displays with/without art, Then it never shows a falsely committed award or enables duplicate claiming.

- [ ] **Step 1 — inspect and decide:** audit existing assets and record whether a new image adds actual visual value; choose existing SVG/CSS/Three.js first. Specify intended display pixel size, file count/budget, localization, alpha vs opaque and Low/Medium/High/Reduced Motion fallbacks. Do not generate a file just because this task exists.
- [ ] **Step 2 — write RED tests:** assert that missing/corrupt/late asset preserves readable controls, semantic text and correct game state; add relevant Alpha/UI hit-zone checks for a transparent overlay and mobile portrait/landscape. Observe RED only when code behavior is actually missing; pure visual mockup decisions do not require synthetic failing tests.
- [ ] **Step 3 — optional generation and GREEN:** if artwork justified, use **actual GPT image-generation tool** to create original assets; for independent icons/sprites require **true transparent RGBA / alpha, no white or checkerboard pixels, no watermark, no baked text**. For scene backdrops intentionally use opaque backgrounds. Verify the generated bytes are real and alpha is correct over dark/light/saturated backgrounds, optimize PNG → alpha WebP where appropriate. SVG icons must be genuinely authored SVG, not renamed raster. Integrate into Vue/CSS or real Three.js (not screenshot replacements), then prove GREEN.
- [ ] **Step 4 — refactor/perf:** deduplicate existing icons, enforce filename/source & provenance, skip unused bulky assets, handle VFX-off/Reduced Motion and quality-tier scaling without changing physics. Inspect actual running WebGL, console, CPU/GPU memory/network bytes, draw calls and p95 frame time, including Safari/Chrome on iPhone and Android in portrait/landscape.
- [ ] **Step 5 — commit/gate:** commit relevant original optimized assets + tests on this branch only after implementation approval, and attach real WebGL screenshots. Do not call concept art finished gameplay; only mark specific `TODO.md` item `- [x]` after full SDD/BDD/TDD, `make verify`, exact-HEAD CI and actual feature acceptance.

### Visual Design & Art Asset Gate (required before visually affected code tasks)

**Companion prompt:** [garage-rewards-and-missions visual design prompt](../prompts/2026-10-31-garage-rewards-and-missions-visual-design.md).

**Scope:** earned-only result cards, task status, future soft-currency icon. Any icon/reward animation must reflect real committed settlement; no invented rate or client credit.

- [ ] **V1 — SDD / Concept:** Revisit current `CLAUDE.md` and existing `src/icons.ts`, current Vue/CSS and WebGL. Draft at least portrait 390×844, landscape 844×390, desktop 1440×900 and Low/Medium/High comparison mockups as appropriate. Record actual control/visual semantics, safe areas, UI copy in en/zh-TW and which output is icon vs screenshot vs real renderer effect. Do not infer implementation from a generated image.
- [ ] **V2 — Design Review:** Compare concept to project quality/accessibility requirements. Confirm critical elements remain visible on Low and when VFX is disabled/Reduced Motion; choose existing icons/cheaper DOM first. Keep unavailable features explicitly Coming soon. Document accepted visual references; do not produce speculative asset sprawl.
- [ ] **V3 — BDD / RED:** For each changed visual component, add failing layout/interaction/renderer assertions on real source output, including phone portrait and landscape, desktop, touch, and correct effect/ability state. Assert no clipped vehicle, unclickable results controls, blocked road or overlapping buttons. If only mockups are needed, verify the responsive contract rather than manufacturing production image files.
- [ ] **V4 — GREEN / Asset Integration:** During an authorized implementation phase only, produce optimized original SVG/WebP assets if justified, use Vue/CSS for interactive text/HUD and current Three.js for dynamic VFX. Keep visual identity aligned across Low/Medium/High with tiered GPU cost, quality-change cleanup and shader warmup. Re-run focused RED tests to GREEN.
- [ ] **V5 — Verify:** Capture real-game WebGL before/after screenshot/video and compare FPS/frame-time p50/p95, Draw Calls, Triangles, texture/resource lifecycle. Complete the relevant Task 5 cross-platform gate and exact HEAD CI. Only then consider marking visual work `- [x]` in the complete canonical TODO.

### Task VF — reference-locked visual fidelity / honest no-art exception

**Source:** [Feature visual design contract](https://github.com/weskao/skyline-rush/blob/feature/garage-rewards-and-missions/docs/designs/garage-rewards-and-missions/VISUAL-FIDELITY.md); [Shared Visual Fidelity Gate](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/docs/superpowers/specs/2026-10-31-visual-fidelity-gate.md).

- [ ] **Inspect:** candidate high-resolution AI reference sheets (not real game captures) with source hashes in the feature contract; delivered `skyline-rush-design-reference-crops.zip` is available in the conversation, **not yet uploaded to GitHub**. Check current icon/asset files and gameplay code for the actual scope. Data-only branches need no new art.
- [ ] **SDD signoff:** identify selected image and commit approved file bytes to `docs/designs/garage-rewards-and-missions/references/`, record SHA plus the real UI/3D element/camera/motion geometry and appearance. Do not infer approval from source file existence. Do not substitute simplified 96px vector icons for the original polished 3D art without approval.
- [ ] **BDD RED:** add browser state/layout tests for actual affected screens, phone portrait 390×844, landscape 844×390, desktop 1440×900, quality Low/Medium/High, reduced motion, bilingual labels, missing-asset fallback. Capture the current live UI as RED visual baseline; do not invent browser screenshots.
- [ ] **GREEN:** implement only after prerequisites and design approval: Vue 3 strict TS/CSS for interactive UI, shared Three.js for 3D/glow/trails, true-alpha PNG/WebP/real SVG when needed. Preserve game mechanics/performance and shared renderer lifecycle.
- [ ] **Final visual gate:** compare real WebGL screenshots and recorded animation to approved reference side by side; record layout, materials, glow, icon identity, motion, device viewports and performance as PASS / FAIL / BLOCKED / APPROVED_DEVIATION with reviewer and evidence. A green CI cannot waive design signoff.
- [ ] **TODO:** check `- [x]` only after actual feature + BDD/TDD + approved visual acceptance and exact HEAD CI; no automatic PR/merge/deployment. If this is a nonvisual economy foundation, document an explicit `NOT_APPLICABLE` visual exception instead of creating speculative art.

## TDD tasks (not started)

### Task 1: Design eligible genuine-race events, versioned unique settlement IDs and pure mission progress reducers

**Files:**
- Modify (as needed): `src/race-results.ts`
- Test: `tests/race-results.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/race-results.test.js`, add a regression named `scenario 1 — Eligible finish`. Set up **Given** a race has a verified eligible completion ID; trigger **When** results settle; assert **Then** one award and matching mission progress are committed once. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/race-results.test.js` for `.test.js` or `npx playwright test tests/race-results.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Design eligible genuine-race events, versioned unique settlement IDs and pure mission progress reducers** in `src/race-results.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-rewards-and-missions`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 2: Implement server-authoritative or otherwise approved durable idempotent soft-reward contract, no unverified client minting

**Files:**
- Modify (as needed): `src/result-screen.ts`
- Test: `tests/result-screen.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/result-screen.test.js`, add a regression named `scenario 2 — Duplicate`. Set up **Given** the same result renders or reconnects twice; trigger **When** settlement repeats; assert **Then** no duplicate award. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/result-screen.test.js` for `.test.js` or `npx playwright test tests/result-screen.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Implement server-authoritative or otherwise approved durable idempotent soft-reward contract, no unverified client minting** in `src/result-screen.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-rewards-and-missions`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 3: Show honest result reward and mission progress only after committed settlement, with partial/offline states

**Files:**
- Modify (as needed): `src/history-achievements.ts`
- Test: `tests/history-achievements-typescript.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/history-achievements-typescript.test.js`, add a regression named `scenario 3 — Ineligible practice`. Set up **Given** tutorial or excluded mode ends; trigger **When** results appear; assert **Then** no real currency is claimed. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/history-achievements-typescript.test.js` for `.test.js` or `npx playwright test tests/history-achievements-typescript.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Show honest result reward and mission progress only after committed settlement, with partial/offline states** in `src/history-achievements.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-rewards-and-missions`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 4: Test repeated settlement, retry/reconnect, mode eligibility, account changes and old records

**Files:**
- Modify (as needed): `src/cloud-progress.ts`
- Test: `tests/cloud-progress.test.js`

**Interfaces:** Consumes the existing module public API after confirming it against `main` and prior tasks. Produces one deliberately small, typed, testable behavior boundary; update this spec's contract before widening a public API. No coupling to another branch's unmerged implementation.

- [ ] **Step 1 (RED):** In `tests/cloud-progress.test.js`, add a regression named `scenario 4 — Account change`. Set up **Given** account A finished a mission; trigger **When** account B signs in; assert **Then** wallet and progress are not shared. Add one negative/invalid-case assertion from the `Review Focus` list.
- [ ] **Step 2 (RED evidence):** Run the test alone (`node --test tests/cloud-progress.test.js` for `.test.js` or `npx playwright test tests/cloud-progress.test.js` for `.spec.js`, after `npm run build` for browser tests); retain the expected pre-fix failure and confirm it is caused by the missing behavior, not stale artifacts.
- [ ] **Step 3 (GREEN):** Implement exactly **Test repeated settlement, retry/reconnect, mode eligibility, account changes and old records** in `src/cloud-progress.ts`, using new `.ts`/Vue files only if a clean typed boundary requires it. Keep source modules under project `CLAUDE.md` size rules and avoid enlarging `src/main.js`.
- [ ] **Step 4:** Re-run the targeted test and `npm run typecheck`; ensure PASS and then refactor only for readability/resource efficiency without changing behavior.
- [ ] **Step 5:** Commit this coherent test + implementation step on `feature/garage-rewards-and-missions`; do not check any high-level TODO item until its full end-to-end acceptance is met.

### Task 5: Cross-platform, integration and final branch gate

**Files:** test files listed above, any mode-specific browser specs; verification notes in the owning branch's `TODO.md` after product TODO integration.

**Interfaces:** Consumes the integrated Tasks 1–4 and emits verification evidence only, not new game code unless a failing regression requires a new RED→GREEN cycle.

- [ ] **Step 1:** Expand automated browser coverage for Android/iOS representative portrait+landscape, desktop, `en`/`zh-TW`, all three Quality tiers, VFX disabled and Reduced Motion; prove all BDD scenarios and negative paths. Simulators do not substitute for an actual-device claim.
- [ ] **Step 2:** Inspect actual WebGL gameplay/preview screenshots and control clickability; compare baseline/after Draw Calls, Triangles, FPS, p50/p95 frame time and CPU/GPU loads under matching conditions. Record untested hardware.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify` and World Tour/Cloud Save gate as applicable. Every failure must be fixed and rechecked.
- [ ] **Step 4:** Update branch from latest `main` only when dependencies are merged; resolve conflicts with both sides' features; rerun all relevant tests and inspect **exact-HEAD** GitHub CI `quality-gate`.
- [ ] **Step 5:** Only after all BDD and TDD acceptance passes, change completed corresponding requirement(s) to `- [x]` in the approved full `TODO.md`, retaining unchecked partial requirements and recording evidence. **Important:** the planning TODO exists on `feature/ux-ui-combo-mobile-controls`, not base `main`. Coordinate integration before marking; never overwrite newer TODO. Commit progress evidence, request explicit permission before a direct main merge; do not create PR.

### Independent artwork pre-production handoff — 2026-10-31

**Branch:** `feature/garage-rewards-and-missions` · **Art-only status:** `independent-icons-complete`. This status is distinct from feature implementation and final CI acceptance.

- [x] **Original standalone visual files created and committed** in [`2acc0e4`](https://github.com/weskao/skyline-rush/commit/2acc0e484296f74123866dd30842b1d98b840a48): `public/feature-assets/garage-rewards-and-missions/finish-medal.svg`, `public/feature-assets/garage-rewards-and-missions/daily-mission.svg`, `public/feature-assets/garage-rewards-and-missions/weekly-challenge.svg`, `public/feature-assets/garage-rewards-and-missions/trophy.svg`.
- [x] **Asset manifest written:** [`public/feature-assets/garage-rewards-and-missions/ASSET-MANIFEST.md`](https://github.com/weskao/skyline-rush/blob/feature/garage-rewards-and-missions/public/feature-assets/garage-rewards-and-missions/ASSET-MANIFEST.md). Files exist in this branch independently of Wave dependencies; they are not yet imported by runtime UI.
- [x] **Standalone artwork format selected:** original self-contained 96×96 SVG icons with transparent root backgrounds, no scripts, external fonts, baked text or painted checkerboard; no raster RGBA/PNG is claimed.

**Remaining dependency-gated work:** DO NOT create real currency icon or live reward values yet. Wait for Economy Foundation plus authorization of reward math and secure settlement; then display these universal category icons via Vue with dynamic localized labels and data-driven statuses. Test idempotent payout and failure/pending/paid states, icon fallback, mobile/desktop and Quality tiers.

- [ ] **Pending:** renderer/UI integration, missing-asset fallback tests where relevant, genuine BDD/TDD RED→GREEN, en/zh-TW, iOS/Android browser portrait/landscape, desktop, Low/Medium/High and reduced-motion/VFX-off as applicable.
- [ ] **Pending:** final exact feature-HEAD `quality-gate` evidence, TODO `- [x]` only for fully accepted feature requirements, and user-approved merge gate; **do not mark TODO items as completed from these assets alone**.
- [ ] **Integration rule:** preserve these existing asset paths when syncing newest `main`; do not regenerate equivalent icons unless the actual GUI or performance review rejects their suitability. Do not overwrite newer branch code/docs from parallel GPT chats.

## Self-review before implementation

- [ ] Every SDD requirement and BDD scenario maps to a task and deterministic test.
- [ ] All five review risks have actual negative tests.
- [ ] All files and contracts were reconfirmed against latest `main` at implementation time.
- [ ] No user-facing claim of successful tests or CI before observed evidence.
- [ ] No implementation has occurred in this planning-only commit.
