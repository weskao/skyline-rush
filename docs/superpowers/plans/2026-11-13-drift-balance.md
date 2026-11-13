# Drift Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every drift tier pays at any speed ≥ 45 m/s, the first reward comes at 0.6 s, and chained drifting on a straight earns < 8 NITRO/min.

**Architecture:** Drift rules move from `src/game.js` (at its 564-line ceiling) to the typed `src/drive-rules.ts`, with a new `driftTier(time)` that every consumer (HUD, callouts, sparks, screech, tutorial) reads instead of literal 1/2/3 s. `game.js` re-exports the constants so existing imports keep working.

**Tech Stack:** Vite + TypeScript (strict) + plain-JS engine, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-drift-balance-design.md`

## Global Constraints

- `DRIFT_BLEED = 1.5` (m/s²); `DRIFT_MIN_SPEED = 45` unchanged.
- `DRIFT_REWARDS = [{ time: 2, nitro: 0.7, boost: 1.6 }, { time: 1.2, nitro: 0.45, boost: 1.1 }, { time: 0.6, nitro: 0.25, boost: 0.7 }]` — highest tier first (the engine uses `.find`).
- No literal drift tier time (1, 2, 3, 0.15) may remain in `src/`; everything reads `DRIFT_REWARDS` / `driftTier`.
- `driftTier` runs per frame: no allocation (no `filter`/`map`).
- `src/game.js` must not grow; lower its `LEGACY_CEILINGS` entry in `tests/module-size.test.js` to the new length in the same commit.
- Tier colors / names (BLUE, ORANGE, PURPLE), release-to-claim and tier count stay.
- Work on `feature/drift-balance` from `develop`. No push, merge or PR without the user's approval.

## Review Focus

1. 30 FPS steps: a 0.65 s drift at `dt = 1/30` must still pay tier 1 → Task 1 test.
2. A drift that ends because speed falls below 45 m/s (not by release) still pays its tier → Task 1 test.
3. Tutorial entry speed `DRIFT_ENTRY` must outlast the bleed to the first tier → Task 3 test.
4. Fractional times just past a boundary (0.61 s, 1.21 s) show the right HUD/callout tier → Task 2 tests.
5. zh-TW drift coach card is the tallest; the new copy must still fit → Task 4 browser spec.

---

### Task 1: Drift rules in `drive-rules.ts`, new tuning, economy guard

**Files:**
- Modify: `src/drive-rules.ts` (add drift section), `src/game.js:29-30,51-54` (remove constants, extend existing import/re-export lines; no new lines)
- Modify: `tests/game.test.js:823-870` (bleed, reward table, overflow tests)
- Modify: `tests/module-size.test.js:13` (`'src/game.js'` ceiling → new length, expected 560)
- Create: `tests/drift-balance.test.js`
- Add: `docs/superpowers/specs/2026-11-13-drift-balance-design.md`, this plan

**Interfaces:**
- Produces (from `src/drive-rules.ts`, re-exported by `src/game.js`): `DRIFT_MIN_SPEED: number`, `DRIFT_BLEED: number`, `DRIFT_REWARDS: readonly { time: number; nitro: number; boost: number }[]`, `driftTier(time: number): number` (0–3 = count of tiers whose `time` ≤ `time`).

- [ ] **Step 1: Branch.** `git -C <repo> switch -c feature/drift-balance develop`
- [ ] **Step 2: Write the failing tests.**
  - `tests/game.test.js`: bleed test expects `80 - 0.75` after 0.5 s; reward table `[[0.55, 0, 0], [0.65, 0.25, 0.7], [1.25, 0.45, 1.1], [2.05, 0.7, 1.6]]`; overflow test drifts 2.05 s from `nitro: 2.9` (0.6 overflow, fuel gain still > 10).
  - `tests/drift-balance.test.js` (engine-driven: `createRace` + `startRace`, rings/pickups/traffic/rivals cleared, 8 s window, NITRO valued as the metres one press adds):
    - `driftTier(0.59) === 0`, `driftTier(0.6) === 1`, `driftTier(1.2) === 2`, `driftTier(5) === 3`.
    - `every tier is net positive vs plain throttle from 70 and 88 m/s` — for each tier time + 0.05 s.
    - `back-to-back top-tier drifts earn under 8 NITRO per minute` (measured 6.3 with the new tuning, 2.0 today — this asserts the anti-farm ceiling, so it passes today; the net-positive test is the RED one).
    - `a 0.65 s drift at 30 FPS pays tier 1` (`dt = 1/30`).
    - `a drift that slows below DRIFT_MIN_SPEED pays its tier`: start 46 m/s, hold brake+steer 1 s, expect `nitro === 0.25` and `drift === null`.
- [ ] **Step 3: Run, expect RED.** `node --test tests/drift-balance.test.js tests/game.test.js` → `driftTier` import fails / net-positive at 70 m/s fails / reward table mismatches.
- [ ] **Step 4: Implement.** Move the three constants (with their comments) to `src/drive-rules.ts` with the Global Constraints values, add `driftTier` (loop or `reduce`, no allocation). In `game.js` drop lines 51-54 and append the names to the existing `drive-rules.ts` import (line 29) and re-export (line 30).
- [ ] **Step 5: Run, expect GREEN.** `node --test tests/drift-balance.test.js tests/game.test.js tests/module-size.test.js` (after lowering the ceiling to `wc -l src/game.js`).
- [ ] **Step 6: Commit.** `git add` the files above; `git commit -m "feat(drift): pay every drift at 0.6/1.2/2.0 s with a 1.5 m/s² bleed"`

### Task 2: HUD, callouts, sparks and screech read `driftTier`

**Files:**
- Modify: `src/race-hud.ts:345`, `src/callouts.ts:50`, `src/effects.js:228-229`, `src/audio.js:286`
- Test: `tests/callouts.test.js:45-56,104-115`, `tests/effects.test.js:192-212`, `tests/audio.test.js:175-186`, and the race-hud test that covers the flight-state drift label (find with `grep -rn "callout.drift\|driftBuilding" tests`)

**Interfaces:**
- Consumes: `driftTier`, `DRIFT_REWARDS` from `./drive-rules.ts`.

- [ ] **Step 1: Write the failing tests.** Replace literal times with tier times read from `DRIFT_REWARDS` (ascending: 0.6, 1.2, 2.0) plus 0.01:
  - callouts: `[[0.61, 'BLUE'], [1.21, 'ORANGE'], [2.01, 'PURPLE']]`; queued test uses `{ time: 0.7 }` → `DRIFT · BLUE`.
  - effects: sparks present at 0.61 (blue), 1.21 (orange), 2.01 (purple); none at 0.5.
  - audio: levels at `[0.3, 0.61, 1.21, 2.01]` strictly increasing.
  - HUD: drift at 0.61 s shows the tier-1 label, at 0.5 s `hud.driftBuilding`.
- [ ] **Step 2: Run, expect RED.** `node --test tests/callouts.test.js tests/effects.test.js tests/audio.test.js <hud test>` → 0.61 s reads as tier 0.
- [ ] **Step 3: Implement.** Each site computes `driftTier(car.drift.time)` once and maps 0–3 to its existing label key / color / gain (`0.035 + tier * 0.012`). Sparks keep their `tier >= 1` gate.
- [ ] **Step 4: Run, expect GREEN.** Same command, then `npm run typecheck`.
- [ ] **Step 5: Commit.** `git commit -m "refactor(drift): read tier thresholds from DRIFT_REWARDS in HUD, callouts, sparks, screech"`

### Task 3: Tutorial cues, lesson judging and copy

**Files:**
- Modify: `src/tutorial-cues.ts:25-27`, `src/interactive-tutorial.ts:19-20,145,194`, `src/locales/tutorial-copy.ts:27,29,117,160,162,249`
- Test: `tests/tutorial-guided-timing.test.js:110-112`, `tests/tutorial-copy.test.js:15`, `tests/tutorial-gates-flow.test.js` (new test)

**Interfaces:**
- Consumes: `driftTier`, `DRIFT_REWARDS`, `DRIFT_BLEED`, `DRIFT_MIN_SPEED`.

- [ ] **Step 1: Write the failing tests.**
  - guided timing: `{ time: 0.4 }` → `driftHold`, `count: 0.2`; `{ time: 0.7 }` → `driftRelease`, `n: 1`; `{ time: 1.3 }` → `n: 2`; `{ time: 2.1 }` → `driftMax`.
  - copy: `UI.en['tutorial.drift']` matches `/0\.6s \(\+0\.25 NITRO/`; zh-TW matches `/0\.6 秒/`; `tutorial.driftRetry.short` (en, zh-TW, `shortSlide`) mention `0.6`.
  - gates flow: `a drift entered at the coach entry speed outlasts the bleed to the first tier` — cruise to `DRIFT_MIN_SPEED + DRIFT_BLEED * 0.6`, hold brake+steer 0.7 s, release → lesson clears.
- [ ] **Step 2: Run, expect RED.** `node --test tests/tutorial-guided-timing.test.js tests/tutorial-copy.test.js tests/tutorial-gates-flow.test.js`
- [ ] **Step 3: Implement.**
  - `tutorial-cues.ts`: `tier = driftTier(time)`; `tier === 0` → hold with `count: tenth(firstTier - time)`; `tier < DRIFT_REWARDS.length` → release with `n: tier`; else max. `firstTier` = lowest `DRIFT_REWARDS` time.
  - `interactive-tutorial.ts`: `DRIFT_ENTRY = DRIFT_MIN_SPEED + DRIFT_BLEED * firstTier`; progress divides by `firstTier`; `valid` = a fresh `driftPayout` plus `miniBoost > 0` (drop the `>= 0.15` literal).
  - Copy, exact:
    - en `tutorial.drift`: `At speed, hold BRAKE + LEFT or RIGHT to drift. Hold for 0.6s (+0.25 NITRO / 0.7s boost), 1.2s (+0.45 / 1.1s), or 2s (+0.70 / 1.6s). Release to claim the reward.`
    - zh-TW `tutorial.drift`: `車速足夠時，同時按住煞車＋左轉或右轉開始甩尾。持續 0.6 秒：+0.25 格 NITRO／0.7 秒加速；1.2 秒：+0.45／1.1 秒；2 秒：+0.70／1.6 秒。放開操作才能領取獎勵。`
    - `driftRetry.short` / `shortSlide`, en and zh-TW: `1s` → `0.6s`, `1 秒` → `0.6 秒`.
- [ ] **Step 4: Run, expect GREEN.** Same command, then `npm run typecheck`.
- [ ] **Step 5: Commit.** `git commit -m "feat(tutorial): teach the 0.6/1.2/2.0 s drift tiers"`

### Task 4: Full gate

- [ ] **Step 1:** `grep -rnE "drift[^\n]*(>= ?[123]\b|Math\.floor)" src` → no tier literals left (Global Constraints).
- [ ] **Step 2:** `npm test && npm run typecheck && npm run build && node --test tests/module-size.test.js` → all pass.
- [ ] **Step 3:** `PLAYWRIGHT_PORT=<free port> npx playwright test tests/interactive-tutorial-browser.spec.js` (after `npm run build`) → drift lesson passes keyboard, touch, slide; zh-TW card fits.
- [ ] **Step 4:** `npm run test:browser` desktop and mobile, portrait and landscape → green; report any spec not run.
- [ ] **Step 5:** Record the before/after numbers (spec table vs. what `tests/drift-balance.test.js` measures) in `TODO.md`.
