# Full-screen Garage Preview Studio — SDD Design Spec and BDD Acceptance

**Repository:** https://github.com/weskao/skyline-rush
**Branch:** `feature/garage-preview-studio`
**Wave:** 1 · **Source TODO:** 5.2, 5.4
**Status:** IMPLEMENTATION IN PROGRESS — ACCEPTANCE NOT COMPLETE · **Date:** 2026-10-31
**Dependencies:** None; retain existing PAINTS and ownership; do not invent Skins or Shop implementations.

## 1. Goals and boundaries (SDD)

Create Garage Home → independent full-screen Preview Studio → Inventory/Collection navigation; current paint preview with full-car orbit, long press/drag, zoom/reset and touch/keyboard access. Future Skin hooks only.

This branch's design is limited to the stated responsibilities. The separate source-of-truth requirements for the full project are in [the planning TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); do not confuse this branch's inherited older `TODO.md` with the newer planning file.

## 2. Baseline and intended architecture

Current implementation paths to inspect first:
- `src/GaragePanel.vue`
- `src/garage-ui.ts`
- `src/garage-view-state.ts`
- `src/App.vue`

Design choices: isolate event/state contracts from presentation, use Vue 3 + TypeScript for screens/panels/controllers, keep simulation and Three.js hot paths unreactive, and avoid overlapping other branches' files where practical. `main` is the original implementation base, not proof that these features exist. If a dependency has changed an API, update this spec and the implementation plan before writing code.

## 3. Behavior (BDD — acceptance scenarios)

#### Scenario 1: Full-screen entry

**Given** player opens Garage

**When** they select Preview Studio

**Then** complete car preview fills safe viewport, not a small dialog

#### Scenario 2: Orbit

**Given** preview car is visible

**When** player drags, holds, pinches or uses keyboard buttons

**Then** car rotates and remains within safe zoom bounds

#### Scenario 3: Paint migration

**Given** user already owns a legacy PAINTS finish

**When** Garage is opened and closed

**Then** paint entitlement and selection remain valid

#### Scenario 4: Navigation

**Given** user leaves studio for a race

**When** render state and overlay exit

**Then** no stale touch capture, blocked control or shader resource leak

## 4. Interfaces, migration and non-goals

- The owning implementation plan must define the smallest typed contract across affected source modules and deterministic tests before code. No unbounded new dependencies, classes or parallel state stores.
- Do not alter gameplay/ownership/race records incidentally or allow visual Quality to change physics, HUD options, progress or owned inventory.
- Preserve preexisting iPhone/Android browser input, keyboard/mouse, interruption recovery and finish/pause clickability; all new player copy must be bilingual.
- The following are mandatory review risks, with tests assigned in the plan:
1. Existing Garage uses dialog and PAINTS star unlocks
2. Preview canvas should reuse renderer rather than creating competing WebGL context
3. WebKit touch camera gestures may conflict with browser navigation
4. Wheel/pinch bounds must prevent clipping of car or VFX
5. Shop and new VFX not in this branch

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

**Dependency:** None; retain existing PAINTS and ownership; do not invent Skins or Shop implementations.

- [ ] Review and approve spec plus BDD scenarios before implementation.
- [ ] Read branch-local current `CLAUDE.md` and file-scoped rules; sync newest `main` after dependencies merge.
- [ ] Implement only per [the companion Superpowers Plan](../plans/2026-10-31-garage-preview-studio-plan.md).
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


## 7. Implementation contract reconciliation (2026-10-31)

These implementation notes supersede the initial documentation-only description above; existing BDD scenarios remain binding.

- **Vue contract:** `GaragePanel.vue` presents Garage Home and a full-viewport Studio in one accessible native dialog; `garageStudioView.page` is the single event-driven `'home' | 'studio'` screen state. Its reactive properties are updated by user interactions only, never by the simulation frame loop.
- **Typed camera adapter:** `garage-camera.ts` defines `GarageCamera { yaw, pitch, zoom, autoRotate }`, bounded `dragGarageCamera`, `zoomGarageCamera`, `garagePreset`, `releaseGarageOrbit`, and `toggleGarageOrbit`. `garage-ui.ts` passes snapshots via the small `GarageWorld.setGarageCamera(GarageCamera | null)` interface into the existing JS renderer.
- **Renderer ownership:** `src/world.js` retains the single pre-existing canvas, scene, materials and composer. The studio only changes preview camera pose; no second renderer/context or new shader materials are created. Preexisting `PAINTS` catalog and production entitlement checks remain authoritative; locked paints cannot be equipped.
- **Navigation lifecycle:** same-document browser history models home/studio transitions. Browser Back, on-screen Back and Close leave or return safely; close returns the canvas, original equipped appearance and focus to Garage. Drag, wheel, pinch and keyboard controls do not modify race rules.
- **Accessibility and graphics:** portrait/landscape responsive CSS and en/zh-TW interactive copy; existing Low/Medium/High rendering source is left alone. Reduced Motion suppresses automatic camera motion; muted/VFX-off don't remove critical controls. No new skins/shop or speculative visual assets.
- **Local focused evidence:** isolated camera unit suite observed RED for missing orbit-release behavior and then 4/4 GREEN; two source contract checks passed on an isolated mirrored fixture. This is **not** a claim that the full checked-out repository or TypeScript, Vite, Playwright or physical devices have passed.
- **Outstanding mandatory acceptance:** full exact-HEAD GitHub `quality-gate`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `make verify`, Cloud Save/World Tour, physical iOS/Android and before/after WebGL/p50/p95/Draw Calls/Triangles. Keep canonical TODO 5.2/5.4 **unchecked** pending those gates. Full source-of-truth product TODO remains on `feature/ux-ui-combo-mobile-controls`, and must not be overwritten with a stale copy.
