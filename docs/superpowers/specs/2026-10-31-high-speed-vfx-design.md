# Speed-Sensation NITRO and BOOST Effects — SDD Design Spec and BDD Acceptance

**Repository:** https://github.com/weskao/skyline-rush
**Branch:** `feature/high-speed-vfx`
**Wave:** 2 · **Source TODO:** 10
**Status:** DOCUMENTATION ONLY · **Date:** 2026-10-31
**Dependencies:** Mobile Controls/HUD merged first; honor its ability state and do not edit controls during independent VFX work.

## 1. Goals and boundaries (SDD)

Speed-cap-aware NITRO and BOOST activation/sustain/recovery VFX, subtle FOV adjustment, peripheral speed lines and bounded motion blur; Low/Medium/High plus Reduced Motion and full WebGL GPU profiling.

This branch's design is limited to the stated responsibilities. The separate source-of-truth requirements for the full project are in [the planning TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); do not confuse this branch's inherited older `TODO.md` with the newer planning file.

## 2. Baseline and intended architecture

Current implementation paths to inspect first:
- `src/vfx-settings.ts`
- `src/world.js`
- `src/effects.js`
- `src/aero-vfx.js`

Design choices: isolate event/state contracts from presentation, use Vue 3 + TypeScript for screens/panels/controllers, keep simulation and Three.js hot paths unreactive, and avoid overlapping other branches' files where practical. `main` is the original implementation base, not proof that these features exist. If a dependency has changed an API, update this spec and the implementation plan before writing code.

## 3. Behavior (BDD — acceptance scenarios)

#### Scenario 1: Activation

**Given** player has real NITRO charge

**When** NITRO activates once

**Then** short visual burst occurs, then sustained effect matches speed

#### Scenario 2: BOOST vs NITRO

**Given** BOOST starts without NITRO

**When** car accelerates

**Then** cleaner airflow differs from NITRO but physics unchanged

#### Scenario 3: Comfort

**Given** Reduced Motion or Low quality selected

**When** player sprints

**Then** readable lower-cost feedback with no heavy shake/blur remains

#### Scenario 4: Recovery

**Given** car slows, crashes, pauses or switches track

**When** effect intensity declines

**Then** camera returns smoothly with no black frame or VFX resource leak

## 4. Interfaces, migration and non-goals

- The owning implementation plan must define the smallest typed contract across affected source modules and deterministic tests before code. No unbounded new dependencies, classes or parallel state stores.
- Do not alter gameplay/ownership/race records incidentally or allow visual Quality to change physics, HUD options, progress or owned inventory.
- Preserve preexisting iPhone/Android browser input, keyboard/mouse, interruption recovery and finish/pause clickability; all new player copy must be bilingual.
- The following are mandatory review risks, with tests assigned in the plan:
1. NaN/Inf bloom shader can cause black full-frame
2. Late shader program compilation may stall WebKit
3. NITRO plus BOOST must not add unbounded effects
4. Draw calls, triangles and mobile thermal are measurable gates
5. Do not alter actual speed cap or game simulation

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

**Dependency:** Mobile Controls/HUD merged first; honor its ability state and do not edit controls during independent VFX work.

- [ ] Review and approve spec plus BDD scenarios before implementation.
- [ ] Read branch-local current `CLAUDE.md` and file-scoped rules; sync newest `main` after dependencies merge.
- [ ] Implement only per [the companion Superpowers Plan](../plans/2026-10-31-high-speed-vfx-plan.md).
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

