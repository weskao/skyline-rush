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

- No handling change: drift does not alter lateral movement or cornering (superseded 2026-11-14, see the lateral
  slide revision below).
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

## Revision 2026-11-14 — NITRO per tier, boost on release, smaller payouts

The final review found the spam figure above (6.3 NITRO/min) came from a loop that let speed sag
below 45 m/s. A real farmer drifts just past a tier, throttles back to the start speed and repeats:
the Balanced table then earned 13–18 NITRO/min, as much as pickups (≈ 15/min). Lowering only the
first tier moved the farm to 1.2 s holds (17.5/min). The physics has no corners, so every drift is
the same anywhere and only the exchange rate can limit farming; a payout cooldown was rejected by
the user because players would read it as a bug.

User decisions (2026-11-14):

- **NITRO 0.10 / 0.22 / 0.35** (totals at 0.6 / 1.2 / 2.0 s); mini boost 0.7 / 1.1 / 1.6 s and the
  1.5 m/s² bleed unchanged.
- **NITRO is credited the moment each tier is reached** (the increment to that tier's total); the
  release pays only the mini boost of the highest tier. A drift cut short by a crash, take-off or
  gap keeps the NITRO already credited and loses the boost. `driftPayout` still fires once on
  release with the total credited.
- **Feedback on the car, not the HUD:** a per-tier "charge" body animation, deliberately unlike the
  exhaust flames that NITRO/BOOST/mini boost use (light sweeping from the rear wheels over the body,
  outline glow in the tier's spark colour, tier 3 adds a ground shockwave), fired when a tier is
  reached; fitted to every car's geometry. Verified with screenshots of each car at each tier only.

| Drift-and-recover farm, NITRO/min (0.65 / 1.25 / 2.05 s holds) | 70 m/s | 88 m/s |
|---|---|---|
| Balanced 0.25 / 0.45 / 0.70 | 18.3 / 17.5 / 16.8 | 14.8 / 14.4 / 13.3 |
| **Picked 0.10 / 0.22 / 0.35** | 7.3 / 8.6 / 8.4 | 5.9 / 7.0 / 6.6 |

Net metres per drift vs plain throttle (8 s window, NITRO valued at its distance): +1 / +4 / +7 m at
70 m/s, +20 / +35 / +52 m at 88 m/s. Guard: `tests/drift-balance.test.js` (every tier net > 0;
drift-and-recover farm < 9 NITRO/min, 60% of pickup income, at both speeds and every tier).

## Revision 2026-11-14 — slower sideways slide while drifting

A full-lock drift slid sideways at the normal steering rate (9 m/s from 41 m/s up), so a drift from
one kerb crossed the 20 m road and hit the far rail before the 2 s tier: tier 3 was only reachable
with steering feathered. User decision: while drifting the slide is `DRIFT_LATERAL` = **0.8** of the
steering rate (7.2 m/s, ~14 m over 2 s), so a full-lock drift from the kerb reaches tier 3. Steering
outside a drift is unchanged; payouts are time-based, so the farm and net-metre figures above stand.
Guard: `tests/drift-balance.test.js` (slide ratio = `DRIFT_LATERAL`; full-lock drift from x = 8 m
reaches tier 3; RED at 1.0: the car stopped at the rail, x = −10.2). The legacy replay fixture was
re-recorded (43 of 47 keys, all runs that drift).

## Revision 2026-11-14 (second) — steer-flip grace, no corner push, 90% slide

At 0.8 the slide felt too slow, and on classic tracks `classicCornerPush` stacked on it, cutting an
into-the-turn drift to ~4.4 m/s. A side flip always passes through at least one neutral-steer frame
on keyboard, touch and pad, so flipping ended the drift. Owner decisions:

1. **No corner push while drifting.** `classicCornerPush` is skipped while `drifting`; without a
   drift it acts exactly as before. Crosswind sections still push (a hazard, not drift tuning).
2. **Steer-flip grace.** With BRAKE held, on the ground and at `DRIFT_MIN_SPEED` or more, neutral
   steer keeps the drift for up to `DRIFT_FLIP_GRACE` = **0.2 s**. Grace time adds no drift time
   and earns no NITRO; any non-zero steer resets it and sets `drift.dir` to the new side (the
   car's drift yaw follows). Past the grace, a brake release, slowing below 45 m/s, take-off or a
   crash end the drift exactly as before.
3. **`DRIFT_LATERAL` 0.8 → 0.9** (8.1 m/s at full lock, ~16 m over 2 s).

Unchanged: `DRIFT_BLEED`, tiers 0.6 / 1.2 / 2.0 s and their NITRO / boost, `DRIFT_MIN_SPEED`, rail
contact on the steered side ending the drift.

Prototype (4 classic tracks x 25 spots, 80 m/s; share of drifts reaching 2.0 s): outer lane one way
80% (median 2.48 s) → 90% (2.25 s); inner lane flip after 1 s with 2 frames / 100 ms neutral 0% →
95%; 300 ms neutral 0% (grace exceeded, by design). At 1.0 the one-way median fell to 2.02 s, too
thin, hence 0.9. 30/60/120 FPS agreed within 0.04 s.

Guards: `tests/drift-all-tracks.test.js` (every registered track, course, circuit and Endless: drift
slide = `DRIFT_LATERAL` x steering rate at every sampled spot, corners included; a 2-frame / 100 ms
neutral flip at 30/60/120 FPS keeps the drift, turns it and adds no time) and
`tests/drift-balance.test.js` (owner values; neutral past the grace or a brake release ends the
drift with the tier's mini boost and no extra NITRO). All four RED on the old code. The legacy
replay fixture was re-recorded (41 of 46 keys).
