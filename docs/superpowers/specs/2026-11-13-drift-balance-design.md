# Drift balance: every drift pays, spamming does not

Status: proposed 2026-11-13 (user picked the "balanced" tuning).

## Intent

Players rarely drift. Measured with the real engine (8 s window vs. plain throttle, a NITRO charge valued at the
metres it adds, about 90 m), a drift only pays at top speed. Below it, it loses distance, because drifting drops the
throttle (+15 m/s²) and bleeds 3 m/s² on top: an 18 m/s² swing. The first reward also needs a full 1 s hold.

| Start speed | 1 s | 2 s | 3 s |
| --- | --- | --- | --- |
| 88 m/s (top) | +17 m | +30 m | +44 m |
| 70 m/s | −5 m | −17 m | −26 m |

Make drifting friendly and worth using everywhere, without turning it into the best way to farm NITRO.

## Goals

- Every tier is net positive at both 70 m/s and 88 m/s.
- The first reward comes at 0.6 s.
- Back-to-back drifting on a straight earns well below pickup income (pickups ≈ 15 NITRO/min,
  `scripts/pickup-economy-stage1.json`).

## Non-goals / anti-goals

- No handling change: drift does not alter lateral movement or cornering.
- No change to tier count, tier colors (blue/orange/purple), callout names, or the release-to-claim rule.
- Anti-goal: drift spam out-earning pickups (drifting the whole race becomes optimal).
- Rivals still do not drift.

## Approaches considered

| Option | Bleed | Tiers → NITRO / mini boost | Net at 88 | Net at 70 | Spam NITRO/min |
| --- | --- | --- | --- | --- | --- |
| Current | 3 | 1/2/3 s → 0.15/0.3/0.5, 0.5/0.8/1.2 s | +17…44 m | −5…−26 m | 2.0 |
| Light | 1.5 | 0.7/1.4/2.2 s → 0.2/0.4/0.6, 0.6/1.0/1.5 s | +28…73 m | +8…24 m | 4.8 |
| **Balanced (picked)** | 1.5 | 0.6/1.2/2.0 s → 0.25/0.45/0.7, 0.7/1.1/1.6 s | +34…84 m | +15…39 m | 6.3 |
| Strong | −6 (gains speed) | 0.6/1.2/2.0 s → 0.25/0.5/0.75, 0.8/1.2/1.8 s | +36…96 m | +22…78 m | 17.3 |
| Continuous accrual | — | NITRO per second held, tiers only for sparks | — | — | — |

Balanced was picked: every drift pays, and the remaining 1.5 m/s² bleed makes chained drifts lose speed, so spam
stays at about 40% of pickup income. Strong out-earns pickups and would need an extra anti-farm rule. Continuous
accrual rewrites HUD, callouts and tutorial for little extra gain.

## Design

- `DRIFT_BLEED` 3 → 1.5 m/s². `DRIFT_MIN_SPEED` stays 45 m/s.
- `DRIFT_REWARDS` → `{ 2.0 s: 0.7 NITRO, 1.6 s boost }`, `{ 1.2 s: 0.45, 1.1 s }`, `{ 0.6 s: 0.25, 0.7 s }`.
- **One source for tier times.** The 1/2/3 s thresholds are hard-coded today in `race-hud.ts` (tier label),
  `callouts.ts` (tier callout), `effects.js` (spark color), `audio.js` (screech level), `tutorial-cues.ts`
  (hold/release cue) and `interactive-tutorial.ts` (progress bar, `DRIFT_ENTRY`, the 0.15 payout check).
  A shared `driftTier(time)` (0–3) beside `DRIFT_REWARDS` replaces every literal, so the next retune is one edit.
- **Home.** `src/game.js` sits at its module-size ceiling (564), so the drift constants and `driftTier` move to the
  typed `src/drive-rules.ts`, re-exported by `game.js` like `MAX_SPEED`. The `game.js` ceiling is lowered to its new
  length in the same commit.
- **Copy.** `tutorial.drift` (en, zh-TW) states the new seconds and rewards; `tests/tutorial-copy.test.js` follows.
- **Side effect (accepted).** Stunt Attack counts each drift payout as an action, so faster tiers mean more actions.

## Verification

- RED first: `tests/game.test.js` reward table and bleed test with the new numbers, plus an economy guard (every
  tier net positive at 70 m/s; spam below 8 NITRO/min) that fails on the current tuning.
- `npm test`, `npm run typecheck`, `npm run build`, `node --test tests/module-size.test.js`.
- `tests/interactive-tutorial-browser.spec.js` (drift lesson, keyboard + touch, zh-TW tallest card), then
  `npm run test:browser` desktop and mobile, portrait and landscape.

## Left to the builder

Exact helper signature, where the economy guard lives, and which existing tests only need their time literals
updated versus reading `DRIFT_REWARDS`.
