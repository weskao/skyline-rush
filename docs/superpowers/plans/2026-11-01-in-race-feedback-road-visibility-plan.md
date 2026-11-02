# In-Race Feedback Road Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Proceed task by task using SDD → BDD → TDD (RED → GREEN → REFACTOR), with verified tests, and never infer a pass from CI queued/cancelled/skipped.

**Goal:** Keep the center-forward road and important steering sightline readable while retaining rewarding, accessible in-race feedback across desktop, phones and foldables.

**Architecture:** Preserve existing gameplay event generation in `src/callouts.ts` and translated DOM in `src/race-hud.ts`; separate event classification/queue policy from a bounded peripheral placement policy. Render event chips near relevant HUD widgets without intersecting the measured protected road, minmap, leaderboard, flight director, safe areas or touch controls. Change tutorial panel separately only if the screenshot review finds a real driving-sightline failure.

**Tech Stack:** Existing Vue 3 + strict TypeScript, CSS, Playwright, Node tests, current Three.js gameplay (for actual visual captures only; do not change physics/renderer to move a toast).

**Spec:** [`docs/superpowers/specs/2026-11-01-in-race-feedback-road-visibility-design.md`](../specs/2026-11-01-in-race-feedback-road-visibility-design.md).

**Ownership:** This planning document is committed on `develop`. When implementing, create `feature/in-race-feedback-visibility` from newest `develop` **only after verifying it does not already exist**; do not change any other feature branch. Final integration target is `develop`, not `main`. This plan commits no production code or CI results.

## Global Constraints

- Preserve existing mechanic/events, NITRO charge, drift/air-chain rewards, amount calculations, physics, localization keys unless legitimately revised, HUD modes (Hybrid A+B/Competitive C), 8-car grid and dynamic minimap.
- No blanket `display:none` for high-priority warnings or accessibility, and no opaque full-screen collision mask. The first goal is sightline visibility, not silence.
- No per-frame new DOM nodes or expensive rectangle measurement without caching and ResizeObserver/viewport-change invalidation; heed `CLAUDE.md` module-size and performance constraints. Do not add runtime dependencies for this small layout feature.
- Preserve iOS Safari, Android Chrome, Desktop and Foldable behavior; use `import.meta.env.BASE_URL` if assets are needed (prefer none). Keep 44×44 CSS-px touch target minima.
- No automatic merge/PR/deploy. Visual signoff and exact-HEAD full CI are mandatory to close the issue.

## Files and responsibilities

| Path | Responsibility |
| --- | --- |
| `src/callouts.ts` | Event priority, coalescing, queue length and lifetime while preserving emitted rewards |
| `src/race-hud.ts` | Map active callout/warning to one semantic UI presentation, avoid duplicate cue and excessive animation |
| `src/style.css` | Road-safe peripheral chip geometry, safe-area, landscape/portrait, reduced-motion, foldable layout |
| `src/App.vue` | Only if small semantic markup tweaks / dedicated indicator slot are required; preserve IDs used by tests |
| `src/TutorialCoach.vue`, `src/tutorial-ui.ts` | Only if real captures show the dedicated tutorial is part of this obstruction |
| `tests/callouts.test.js`, `tests/race-hud.test.js` | Deterministic queue, state, prioritization and non-regression |
| `tests/item-feedback-browser.spec.js`, `tests/interactive-tutorial-browser.spec.js` | Real browser event positioning, live WebGL sightline and tutorial accessibility |
| Create `tests/race-feedback-visibility-browser.spec.js` | Targeted DOM geometry, screenshots, repeated events, all critical responsive breakpoints |
| `docs/evidence/in-race-feedback-visibility/` | Actual before/after screenshots and measured acceptance record only after captures exist |

## Review Focus / negative scenarios

1. A flash of PERFECT LINE immediately after 8-car approach must not hide traffic/horizon/turn apex, even at 568×320.
2. Rapid AIR→ROAD/DRIFT/NITRO events must not create a large backlog or repeat long captions, and never grant or suppress actual game rewards.
3. When a persistent flight/battery/charge warning is present, the informational celebration must yield without replacing that warning.
4. With 390×844 + safe-top inset, the toast must not collide with top progress, minimap, NITRO touch button or tutorial; no clipped full line in zh-TW.
5. With foldable hinge and pointer cancellation, event placement must not straddle hinge, touch actions must still work, Reduced Motion must not flash/scale.

---

### Task 1: Capture baseline and write road-safe geometry test

**Files:**
- Create `tests/race-feedback-visibility-browser.spec.js`
- Optionally create small test helper in `tests/helpers/` only when genuinely needed

**Interfaces:** Browser test reads existing `#event-callout`, `#driving-message`, `#race-route-map`, `#race-info`, `#touch-controls` and `#tutorial-coach` rectangles. Baseline geometry must come from **real current running game**, never synthetic diagram.

- [ ] **Step 1 (RED):** Add Playwright scenario at 390×844, 844×390 and 568×320 that starts actual racing, triggers supported event states without bypassing UI rendering and checks event bounding rects do not intersect the protected forward road rectangle or active HUD/touch rects. Validate non-empty visible text, pointer-events, and actual WebGL screenshot identity.
- [ ] **Step 2 (RED verification):** Run `npx playwright test tests/race-feedback-visibility-browser.spec.js` after the repository's normal browser build/start setup. Confirm initial failure specifically caused by central toast obstruction (not test setup).
- [ ] **Step 3 (evidence):** Save before PNGs with viewport/locale/branch SHA; use a valid reproducible state on all tests. Clearly label capture as *real browser*.
- [ ] **Step 4 (commit):** Commit RED tests and measured baseline only; do not change production CSS in this task.

### Task 2: Correct reward event policy without losing information

**Files:**
- Modify `src/callouts.ts`
- Modify `tests/callouts.test.js`

**Interfaces:** Keep existing `createCallouts().update(race, blocked)` API unless a typed priority field is proven necessary; use event kind as the stable dedup key. Critical state remains driven from the existing race HUD, not coalesced into reward queue.

- [ ] **Step 1 (RED):** Add tests for 3+ concurrent events, repeated kind, queue cap (candidate 2), duplicate cooldown (~2 s), updated last/highest tier, finite 700–900 ms chip lifetime (must work with race clock pause/resume), no stale carry-over after race restart.
- [ ] **Step 2:** Run `node --test tests/callouts.test.js`; observe expected failures.
- [ ] **Step 3 (GREEN):** Implement the smallest bounded policy while preserving order of important events. Never change physics/score/NITRO counters or silently drop a critical actionable warning; merge low-priority rewards if necessary.
- [ ] **Step 4:** Re-run targeted tests, TypeScript validation and preexisting callout/race-hud tests; refactor only after green.
- [ ] **Step 5:** Commit the smallest policy change. If 700–900 ms damages comprehension in real tests, prefer measured/bilingual fit and document approved deviation rather than forcibly abbreviating all copy.

### Task 3: Peripheral event presentation and state-driven driving message

**Files:**
- Modify `src/race-hud.ts`, `src/style.css`; `src/App.vue` only if required
- Modify `tests/race-hud.test.js` and new `tests/race-feedback-visibility-browser.spec.js`

**Interfaces:** Reuse `#event-callout` and `#driving-message` IDs for compatibility; keep `role=status` with appropriate live-region behavior and real Vue/DOM text, not textures.

- [ ] **Step 1 (RED):** Assert callout is peripheral and short/one-line by default at desktop 1440×900, portrait 390×844, landscape 844×390 and compact landscape 568×320. Assert warning has precedence over reward; localizations do not clip into center; touch control intersections are zero. Add 8-car leaderboard, minimap and HUD-mode variants.
- [ ] **Step 2:** Run browser tests and confirm expected failure against existing `top:206px`/`top:272px`/`30%` rules.
- [ ] **Step 3 (GREEN):** Implement context-aware HUD anchoring. Prefer score-adjacent for reward, nitro-meter-adjacent for NITRO, flight/fuel-adjacent for lift/recharge warning; choose a safe edge slot based on actual geometry. On no room, collapse low-priority chip into a compact icon/badge rather than occupying center. Cache geometry on viewport/HUD-mode/layout change.
- [ ] **Step 4:** Replace large center scale-up animation with small bounded fade/pulse. Honor `prefers-reduced-motion` and VFX Off, preserve input clickability and focused/real-warning semantics.
- [ ] **Step 5:** Run targeted unit/browser tests, Typecheck and build; capture real before/after WebGL. Commit only after local green.

### Task 4: Tutorial coach and race-state collision handling

**Files:**
- Modify `src/TutorialCoach.vue`, `src/tutorial-ui.ts` and CSS **only if capture demonstrates the problem**
- Modify `tests/interactive-tutorial-browser.spec.js`, new browser spec

**Interfaces:** Tutorial state machine remains authoritative. Do not change the trigger/score/payout of AIR→ROAD CHAIN or BARREL ROLL, nor keyboard/slide/buttons/tilt instructions.

- [ ] **Step 1 (RED):** Test tutorial `ready`, `active`, skill explanation, paused, complete, 320×740 and 844×390, normal/reduced-motion; ensure coach instructions and Pause/Exit remain reachable while car and road are clear.
- [ ] **Step 2:** Run and confirm any observed obstructing scenario fails due to geometry.
- [ ] **Step 3 (GREEN only if needed):** Collapse long paragraph to a compact expandable side-coach in active driving; allow full explanation only in deliberate pause/dedicated teaching frames. Do not discard critical instructions or block touch inputs.
- [ ] **Step 4:** Re-run existing tutorial/full-flow tests, check zh-TW wrapping, pointers and accessibility; commit.

### Task 5: Cross-platform visual and regression gate

**Files:**
- Update `docs/evidence/in-race-feedback-visibility/ACCEPTANCE.md` with measured screenshots/capture hashes
- Update `TODO.md` only after testing and approved requirement names, without overwriting concurrent changes

- [ ] **Step 1:** Capture real WebGL images at identical race states before/after; inspect road, traffic, horizon and car framing manually. Validate DOM no-overlap for 320×740, 390×844, 844×390, 568×320, 768×1024, 1440×900 and foldable hinge; test both locales and HUD A+B/C, Low/Medium/High and Reduced Motion.
- [ ] **Step 2:** Use representative simulated device/browser runs and label iOS Safari/Android **physical device** checks UNVERIFIED unless truly tested. Review voice-over/status ARIA announcements and critical warning visibility.
- [ ] **Step 3:** Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, project-defined browser suite, `make verify`/Cloud Save/World Tour checks as applicable. Capture command exit codes and logs. Fix failures via new RED→GREEN cycles before proceeding.
- [ ] **Step 4:** Trigger/inspect latest-HEAD full GitHub Actions CI on `feature/in-race-feedback-visibility`. Browser/World Tour shards must be `success`, not `skipped`/cancelled.
- [ ] **Step 5:** Record PASS/FAIL/APPROVED_DEVIATION/BLOCKED with screenshot URLs, SHA and reviewer. Update TODO only when feature accepted. **Request user permission before merge into develop**; never auto-merge main.

## Suggested new TODO wording (P0, unchecked until accepted)

```md
- [ ] **UX — Road-safe in-race Toast / Callout / Driving Message:** Keep forward-road visibility clear in racing on Desktop/iOS/Android/Foldable; move reward chips to peripheral, HUD-adjacent positions with priority/coalescing, preserve warnings/teaching/a11y and no HUD/touch/hinge overlap. Validate real WebGL screenshots across portrait/landscape, en/zh-TW, Reduced Motion and Low/Medium/High; full same-HEAD CI and design signoff.
```

## Implementation dispatch (for a dedicated GPT chat)

Using connected GitHub repo `weskao/skyline-rush`, implement the above plan in a new isolated `feature/in-race-feedback-visibility` branch created from latest `develop` (if it doesn't already exist); do not edit parallel Wave2 feature branches. Read `CLAUDE.md`, the linked UX spec and plan, `src/callouts.ts`, `src/race-hud.ts`, `src/style.css`, `src/App.vue`, `TutorialCoach.vue`. Prioritize **road visibility over reward animation**. Implement SDD→BDD→TDD with RED proof; real viewport screenshots and fail-case coverage for event storms, important warnings, HUD layouts, safe areas/hinge, zh-TW/en, iOS/Android/desktop and Reduced Motion. Never claim screenshot parity or CI green without artifacts and an exact-HEAD passing run. Preserve rules, scoring, settings and physics. No PR/deploy/automatic develop/main merge.


## Execution notes — 2026-11-01 feature branch

- Branch: `feature/in-race-feedback-visibility`, created from `develop` commit `15bfc16a29a73bc60984ab9a00244e1283cb80dd`. The current base already includes `fix/race-hud-overlaps`; keep `tests/race-hud-overlap-browser.spec.js` in the regression gate.
- Reward policy keeps the existing `createCallouts().update(race, blocked)` API and all gameplay counters; it bounds pending events to two, raises NITRO over routine rewards, shortens normal chips to 0.85 race seconds and suppresses immediate repeated low-priority kinds.
- Peripheral positioning is measured only on event/content, viewport, and structural HUD changes. The placement module considers a protected central road rectangle, active HUD widgets, safe-area insets and simulated/real viewport segments. No rendering or physics code is changed.
- Existing sound and haptics already communicate NITRO and related actions; do not add another repetitive audio cue for the small visual chip. DOM-only feedback remains identical at Low/Medium/High quality.
- **Pending before acceptance:** verified RED/Green test command output, browser WebGL screenshots with measured rects, the full exact-HEAD CI gate, real iOS Safari / Android Chrome validation and reviewer approval. No merge, deploy, or PR is authorized by these notes.
