# Garage Store Readiness Without Checkout — SDD Design Spec and BDD Acceptance

**Repository:** https://github.com/weskao/skyline-rush
**Branch:** `feature/garage-store-readiness`
**Wave:** 3 · **Source TODO:** 5.7, 5.8
**Status:** DOCUMENTATION ONLY · **Date:** 2026-10-31
**Dependencies:** Garage Economy Foundation merged; any real money requires separate explicit approval and compliance review.

## 1. Goals and boundaries (SDD)

Coming-soon store entry, catalog presentation and premium purchase interface boundaries only; no real payment, SDK, paid balances, unauthorized grant or conversion prices.

This branch's design is limited to the stated responsibilities. The separate source-of-truth requirements for the full project are in [the planning TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); do not confuse this branch's inherited older `TODO.md` with the newer planning file.

## 2. Baseline and intended architecture

Current implementation paths to inspect first:
- `src/GaragePanel.vue`
- `src/garage-ui.ts`
- `src/garage-view-state.ts`
- `src/appearance.ts`

Design choices: isolate event/state contracts from presentation, use Vue 3 + TypeScript for screens/panels/controllers, keep simulation and Three.js hot paths unreactive, and avoid overlapping other branches' files where practical. `main` is the original implementation base, not proof that these features exist. If a dependency has changed an API, update this spec and the implementation plan before writing code.

## 3. Behavior (BDD — acceptance scenarios)

#### Scenario 1: Unlaunched shop

**Given** store feature is disabled

**When** player opens Garage Home

**Then** Shop is clearly Coming soon and cannot charge money

#### Scenario 2: Inspect future item

**Given** a not-yet-owned future store item exists

**When** player previews

**Then** no purchase, fake price or ownership grant occurs

#### Scenario 3: No SDK

**Given** store provider is unconfigured

**When** player opens Garage and races

**Then** all free game functions continue

#### Scenario 4: Account switch

**Given** a different user signs in

**When** Shop remains unavailable

**Then** trial/owned status and price previews do not leak

## 4. Interfaces, migration and non-goals

- The owning implementation plan must define the smallest typed contract across affected source modules and deterministic tests before code. No unbounded new dependencies, classes or parallel state stores.
- Do not alter gameplay/ownership/race records incidentally or allow visual Quality to change physics, HUD options, progress or owned inventory.
- Preserve preexisting iPhone/Android browser input, keyboard/mouse, interruption recovery and finish/pause clickability; all new player copy must be bilingual.
- The following are mandatory review risks, with tests assigned in the plan:
1. Real-money policies, refunds and app-platform requirements not yet approved
2. No client-trusted checkout entitlement
3. Do not invent premium currency conversion/price
4. Avoid misleading Buy UI
5. Future integration must be separate approved work

## 4A. Image Generation and Asset Contracts (Wave 2 / Wave 3)

**Decision:** Optional original transparent shopping-bag/collection icon or Coming Soon art. Any background artwork may be opaque if used only decoratively. No live BUY controls, prices, payment branding or checkout by virtue of art generation.

- **Necessity gate:** review `src/icons.ts`, `public/icons/`, existing Vue/CSS/Three.js before making any image. The need for a concept sheet does **not** automatically justify a production bitmap. Record why the asset is needed and who owns it.
- **Prompt / production plan:** [Visual brief](../prompts/2026-10-31-garage-store-readiness-visual-design.md); [Superpowers plan](../plans/2026-10-31-garage-store-readiness-plan.md). The separately assigned future GPT may generate original images **only if actually needed and its image generation capability is available**; otherwise record the missing deliverable and use documented SVG/CSS/Three.js fallback. No pretend asset URLs or pre-emptive completion claims.
- **Alpha and formats:** true alpha RGBA PNG / compressed transparent WebP for isolated icon, badge, sprite or overlay, **not** white/checkerboard as image pixels; opaque compressed WebP/JPEG for standalone backgrounds. Actual vector SVG must be properly authored, not a renamed raster. Verify alpha over light, dark and saturated backgrounds, silhouette at intended CSS size, safe margins, transparent edge fringes and no baked interactive text.
- **Runtime semantics:** use real Vue 3 + strict TypeScript for controls/labels/rank/reward status; use shared Three.js renderer for 3D cars/dynamic VFX. Generated concepts are not runtime screenshots or fully implemented gameplay. No branded copyrighted lookalikes or unapproved real-money claims.
- **SDD → BDD → TDD / accessibility:** define asset semantics and ownership/loader contract, write failing behavior tests when a code behavior is missing, keep readable alt/label/fallback on asset error, test touch/focus and occlusion. Verified BDD edge cases:
  1. Given a generated Coming Soon image cannot load, When Store opens, Then accessible copy accurately marks it unavailable with no live purchase CTA.
  2. Given translated store content and Low quality, When resized on Android/iOS/desktop, Then disabled status remains visible and no artwork intercepts touch events.
- **Quality and measurement:** Low / Medium / High must preserve game state/critical HUD, en/zh-TW, mobile Android/iOS browsers in portrait+landscape and desktop, VFX Off, Reduced Motion and sound mute. Check image bytes, alpha, decoder/texture memory, first-use shader cost, Draw Calls, FPS and frame-time p95 where relevant. Inspect actual game output, not only a generated design board.
- **Completion:** do not check any `TODO.md` item `- [x]` until genuine asset integration, relevant SDD/BDD/TDD and CI are verified. This is a future implementation requirement, **not** an instruction to generate art now.

## 5. Cross-platform visual and performance acceptance

| Area | Required gate |
| --- | --- |
| Mobile | Android Chrome and iOS Safari/Chrome, portrait 320×740 / 390×844 / 412×892; landscape 844×390 / short-screen stress |
| Desktop/tablet | 1440×900 and tablet portrait/landscape with keyboard/mouse/touch as relevant |
| Quality | Low/Medium/High VFX fidelity may change; critical DOM/menu/HUD/ability meaning never disappears |
| Accessibility | `en`/`zh-TW`, safe-area, focus, 44px minimum touch targets, mute, Reduced Motion and VFX disabled |
| Real rendering | Before/after WebGL screenshots and Draw Calls/Triangles/FPS/frame-time p50/p95; note untested physical devices |
| Regression | RED→GREEN→Refactor, local test commands and exact-HEAD GitHub CI, then explicit merge approval |

## 6. Wave / merge gate

**Dependency:** Garage Economy Foundation merged; any real money requires separate explicit approval and compliance review.

- [ ] Review and approve spec plus BDD scenarios before implementation.
- [ ] Read branch-local current `CLAUDE.md` and file-scoped rules; sync newest `main` after dependencies merge.
- [ ] Implement only per [the companion Superpowers Plan](../plans/2026-10-31-garage-store-readiness-plan.md).
- [ ] Verify tests, actual screen/input behavior and performance; record evidence and only then check off relevant `TODO.md` items, with partial requirements remaining unchecked.
- [ ] Do not open PR or merge to `main` without explicit user authorization.

### Required shared constraints

- Baseline main commit: `bea47cf61c162b4341021fa6d24ca45850af7796`. Product requirements: [UX/UI source TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); **they have not yet been merged into main**. Before implementation reconcile this source into the working branch without overwriting newer main data.
- Planning-only commit. No source edits, no tests run, no merge/PR/deploy. Product spec and BDD are intended implementation contracts, not proof of behavior.
- Read the current `CLAUDE.md`, `.claude/rules/ui-architecture.md`, `performance-review.md`, `device-quality.md`, `touch-input.md`, `ui-phase-interactions.md` and domain-specific rules; follow newer revisions when implementing.
- New UI: Vue 3 + strict TypeScript (SFC `<script setup lang="ts">`), typed adapters for necessary JS physics/Three.js render loop. No Vue reactive writes or DOM queries per frame.
- Android Chrome and iPhone Safari/Chrome portrait + landscape, tablet and desktop; `en`/`zh-TW`, Low/Medium/High, VFX off, Reduced Motion, muted audio; preserve critical controls/data at every tier.
- Performance first with before/after real WebGL evidence, FPS, p50/p95 frame-time, Draw Calls, Triangles, GPU uploads; screen overlays and touch controls must not block the game.
- TDD RED→GREEN→Refactor, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour/Cloud Save when relevant, `make verify`, exact-HEAD GitHub CI. Only mark `TODO.md` item `- [x]` after each *fully implemented and verified* requirement is complete; never mark for a plan.
- Each agent owns its feature branch and specific files; dependent implementation waits for prerequisites merged into `main` after user approval. If source TODO is absent on the branch, first integrate the approved spec using an explicit non-destructive merge/cherry-pick and do not copy stale contents over main.

