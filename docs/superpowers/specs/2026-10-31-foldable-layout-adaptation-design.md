# Foldable and Dual-screen Layout Support — SDD Design Spec and BDD Acceptance

**Repository:** https://github.com/weskao/skyline-rush
**Branch:** `feature/foldable-layout-adaptation`
**Wave:** 2 · **Source TODO:** 4
**Status:** DOCUMENTATION ONLY · **Date:** 2026-10-31
**Dependencies:** Mobile Controls/HUD merged first; reuse its saved orientation controls and HUD modes.

## 1. Goals and boundaries (SDD)

Responsive cover/inner display, split-screen, hinge, rotation and browser viewport resizing; progressive enhancements for viewport segments; preserve thumb controls, HUD and camera sightline across fold and ordinary phones.

This branch's design is limited to the stated responsibilities. The separate source-of-truth requirements for the full project are in [the planning TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); do not confuse this branch's inherited older `TODO.md` with the newer planning file.

## 2. Baseline and intended architecture

Current implementation paths to inspect first:
- `src/touch-controls-ui.ts`
- `src/control-settings.ts`
- `src/style.css`
- `src/App.vue`

Design choices: isolate event/state contracts from presentation, use Vue 3 + TypeScript for screens/panels/controllers, keep simulation and Three.js hot paths unreactive, and avoid overlapping other branches' files where practical. `main` is the original implementation base, not proof that these features exist. If a dependency has changed an API, update this spec and the implementation plan before writing code.

## 3. Behavior (BDD — acceptance scenarios)

#### Scenario 1: Cover

**Given** foldable is closed

**When** player starts race

**Then** phone controls and HUD fit safe visible area

#### Scenario 2: Inner

**Given** viewport expands

**When** player unfolds

**Then** car remains centered and controls remain reachable

#### Scenario 3: Hinge

**Given** viewport segment hinge exists

**When** Competitive C shows map

**Then** no essential touch control or widget straddles hinge

#### Scenario 4: No API

**Given** viewport segment API missing or pointerup lost

**When** screen rotates

**Then** fallback responsive layout works with no stuck steering

## 4. Interfaces, migration and non-goals

- The owning implementation plan must define the smallest typed contract across affected source modules and deterministic tests before code. No unbounded new dependencies, classes or parallel state stores.
- Do not alter gameplay/ownership/race records incidentally or allow visual Quality to change physics, HUD options, progress or owned inventory.
- Preserve preexisting iPhone/Android browser input, keyboard/mouse, interruption recovery and finish/pause clickability; all new player copy must be bilingual.
- The following are mandatory review risks, with tests assigned in the plan:
1. Window segments API optional, must degrade gracefully
2. Never infer GPU quality from UA or touch status
3. Pointer capture may be lost on fold/rotation
4. Hinge zone can cover race controls
5. Keep normal mobile/desktop regression green

## 4A. Image Generation and Asset Contracts (Wave 2 / Wave 3)

**Decision:** Usually no production images: use SVG, annotated geometry and CSS for fold/hinge safe zones; optionally generate design reference boards. An isolated transparent zone/hinge overlay is for docs only, not a device-specific runtime mask.

- **Necessity gate:** review `src/icons.ts`, `public/icons/`, existing Vue/CSS/Three.js before making any image. The need for a concept sheet does **not** automatically justify a production bitmap. Record why the asset is needed and who owns it.
- **Prompt / production plan:** [Visual brief](../prompts/2026-10-31-foldable-layout-adaptation-visual-design.md); [Superpowers plan](../plans/2026-10-31-foldable-layout-adaptation-plan.md). The separately assigned future GPT may generate original images **only if actually needed and its image generation capability is available**; otherwise record the missing deliverable and use documented SVG/CSS/Three.js fallback. No pretend asset URLs or pre-emptive completion claims.
- **Alpha and formats:** true alpha RGBA PNG / compressed transparent WebP for isolated icon, badge, sprite or overlay, **not** white/checkerboard as image pixels; opaque compressed WebP/JPEG for standalone backgrounds. Actual vector SVG must be properly authored, not a renamed raster. Verify alpha over light, dark and saturated backgrounds, silhouette at intended CSS size, safe margins, transparent edge fringes and no baked interactive text.
- **Runtime semantics:** use real Vue 3 + strict TypeScript for controls/labels/rank/reward status; use shared Three.js renderer for 3D cars/dynamic VFX. Generated concepts are not runtime screenshots or fully implemented gameplay. No branded copyrighted lookalikes or unapproved real-money claims.
- **SDD → BDD → TDD / accessibility:** define asset semantics and ownership/loader contract, write failing behavior tests when a code behavior is missing, keep readable alt/label/fallback on asset error, test touch/focus and occlusion. Verified BDD edge cases:
  1. Given no viewport-segment API is exposed, When the screen resizes, Then the UI retains safe fallback and no image is required.
  2. Given a hinge separates screen regions, When a touch control is repositioned, Then it never straddles the hinge or disappears behind decoration.
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

**Dependency:** Mobile Controls/HUD merged first; reuse its saved orientation controls and HUD modes.

- [ ] Review and approve spec plus BDD scenarios before implementation.
- [ ] Read branch-local current `CLAUDE.md` and file-scoped rules; sync newest `main` after dependencies merge.
- [ ] Implement only per [the companion Superpowers Plan](../plans/2026-10-31-foldable-layout-adaptation-plan.md).
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

