# NITRO sparks: evidence

Branch `feature/nitro-flame-sparks`, 2026-11-20. Design: `DESIGN.md` in this folder.

## What shipped

- `src/nitro-sparks.ts` (new, 89 lines): `nitroSparks()` decides this frame's sparks as plain
  data; `createNitroSparks(emit)` turns them into calls to the particle pool's `emit`.
- `src/effects.js` (394 of 400 lines): the import, `createNitroSparks(emit)`, a shared
  `headingAt`, `setNitroTrail(ids)` and one `nitroSparks.update(...)` call per frame.
- `src/world.js`: **extra file**, one statement. `setCosmeticSkins` now also calls
  `effects.setNitroTrail(ids)`; it is the existing path that already hands `effects.js` the
  drift-trail skin, and the sparks need the equipped trail skin's colour.
- `tests/nitro-sparks.test.js` (new, 12 tests).

No mesh, material, program or draw call is added: sparks are kind-0 points in the existing
480-slot pool. No colour table is added: the colour is `skinVfxPalette(ids)['nitro-trail']`
(`src/garage-skin-palette.ts`), or `gold` from `src/effects-palette.ts` without a skin, scaled
so its brightest channel is 1.2 (the trail's cap).

## Spark budget

| Tier | Sparks per second | Most alive at once | Share of the pool (480) |
| --- | --- | --- | --- |
| Low | 12 | 8 | 1.7% |
| Medium | 24 | 12 | 2.5% |
| High | 48 | 19 | 4.0% |

- At most 4 sparks per frame on any tier, so a stalled frame cannot dump a burst.
- Longest life 0.3 s. `sparkBudget(tier) = ceil(rate x 0.3) + 4`.
- The pool is a ring: a spark can only overwrite the oldest slot. The ring advances by at most
  rate + 4 slots per second (High: 52 of 480, 11%), so sparks alone take over 9 s to lap it.
  The other emitters' own rates were not re-measured here: the share left to them is 89% of the
  ring per second on High.
- None with VFX off (`active` in `effects.js`), in Reduced Motion or in Comfortable mode
  (`reducedMotion` in `world.js` is `motionPreference.matches || visual.comfortable`).
- Chained NITRO scales the spark's exit speed by `NITRO_CHAIN_LIFT` (1, 1.2, 1.4) and nothing
  else: count, size, life, colour and opacity are the same on a triple burst.
- Proven in `tests/nitro-sparks.test.js`: *the spark budget cannot starve the shared particle
  pool*, *chained NITRO adds speed and reach, never count, size or brightness*, *no sparks
  without NITRO, in Reduced Motion or in Comfortable mode*.

## RED first

The test file was written against a stub module. 7 of 11 failed, for the missing feature:
`low: every port`, `both sides`, `no skin hue: NaN vs 1`, `a spark within one second`,
`low < medium < high: 0, 0, 0`, `TypeError: effects.setNitroTrail is not a function`, and the
source check `/createNitroSparks\(emit\)/`.

A second RED round followed the first live capture, which showed no sparks at all while the unit
tests were green (see "The trap"). New assertions, each seen failing before its fix:

| Assertion | RED output |
| --- | --- |
| A spark stays in front of the chase camera | `chase 40 m/s +0: t 0.23: 1.35 m from the lens` |
| Each port throws to its own side | `fans outward` |
| A spark is born at least 5.5 px wide in landscape | `chase 40 m/s +0: t 0.00: 5.4 px` |
| Sparks leave the jets sideways | `spread -0.6001643537544479, 2.3811467755032454` |

Mutation check (run on the first tuning; those assertions are unchanged): dropping `calm ||`,
uncapping `power`, allocating a new slot object per spark and scaling size by chain made 5 tests
fail.

## Commands and results (final code)

| Command | Result |
| --- | --- |
| `node --test tests/nitro-sparks.test.js` | 12 pass, 0 fail |
| `node --test tests/module-size.test.js` | 3 pass; `src/effects.js` 394 of 400, `src/world.js` 943 (unchanged count) |
| `npm test` | 3653 tests, 3649 pass, 0 fail, 4 skipped |
| `npm run typecheck` | exit 0 |
| `npm run build` | built; "Production coming-soon bundle checked" |
| `PLAYWRIGHT_PORT=5243 npx playwright test tests/shader-warmup-browser.spec.js tests/black-frame-browser.spec.js` | 6 passed (Roadster and Crimson GT, Low and High: no shader compiles mid-race; no non-finite texel) |
| `PLAYWRIGHT_PORT=5243 SPRINT_CAMERA_CAPTURE=1 LABEL=sparks-final VIEWPORT=landscape npx playwright test tests/sprint-camera-capture-browser.spec.js` | 4 passed |
| Same with `VIEWPORT=portrait` | 4 passed |
| `PLAYWRIGHT_PORT=5243 PLUME_BENCH=1 LABEL=sparks-final VIEWPORT=844x390 npx playwright test tests/sprint-plume-cost-browser.spec.js` | 1 passed |
| Same with `VIEWPORT=1440x900` | 1 passed |

`typecheck` ran after the last behavioural edit; only a comment and a test bound changed after it.

## Frame cost of a held NITRO

`tests/sprint-plume-cost-browser.spec.js`, 360 frames per tier, Apple M4 (ANGLE Metal), headless
Chromium. Milliseconds p50 / p95, then draw calls. The machine's load average was 30 to 80 for
every run (other sessions), so run-to-run noise is about 2 ms.

| Viewport | Tier | Before | After (final code) |
| --- | --- | --- | --- |
| 844x390 | Low | 4.0 / 6.8, 272 calls | 4.4 / 6.9, 273 calls |
| 844x390 | Medium | 5.8 / 6.7, 184 | 8.5 / 12.3, 187 |
| 844x390 | High | 5.9 / 7.8, 185 | 6.8 / 9.1, 198 |
| 1440x900 | Low | 5.5 / 6.5, 279 | 6.7 / 9.8, 274 |
| 1440x900 | Medium | 9.9 / 11.5, 188 | 11.5 / 14.7, 186 |
| 1440x900 | High | 9.0 / 10.3, 191 | 11.9 / 16.8, 196 |

Draw calls vary by a few between runs in both directions (scenery and rivals in view); the sparks
add none, which the unit test asserts from the source.

The table cannot isolate the sparks: the gap is inside the noise and Medium reads slower than
High. An A/B on one checkout, back to back at 844x390 (first tuning, same spark count), read
*lower* with sparks on:

| Tier | Sparks call removed | Sparks on |
| --- | --- | --- |
| Low | 3.7 / 4.6 | 3.3 / 3.8 |
| Medium | 6.2 / 9.4 | 5.4 / 6.0 |
| High | 8.1 / 12.3 | 5.2 / 5.8 |

CPU cost measured directly (2,000,000 frames of `update` against a no-op `emit`, final code):
Low 38 ns, Medium 47 ns, High 78 ns per frame, which is under 0.0001 ms. Heap change over the
run: -1.4 MB, -2.9 MB, +2.1 MB (collector noise; the batch and its slots are allocated once,
asserted by *a frame reuses its batch*).

Conclusion: no measurable frame cost on this machine. A quiet machine and a real phone would
give a cleaner number; neither was available.

## The trap, and what the camera test now checks

First tuning: sparks left at 12 to 24 m/s for up to 0.5 s. Every unit test passed and no spark
showed in a live capture. Two causes:

1. At NITRO the landscape chase eye sits under 4 m behind the nozzles. A spark at 12 m/s or more
   passed the lens within 0.2 s, and the frame's bottom edge cuts off anything more than about
   1.5 m behind the ports at port height.
2. The sprint plume is additive. A NormalBlending spark that stays inside the jets is washed out.

Fix: slow in the car's frame (2.4 to 3.6 m/s back, times the chain lift), lives 0.18 to 0.3 s,
light gravity so a spark never drops under its port, and each port throws to its own side at 2
to 4.5 m/s. The test *a spark spends its whole life in front of the chase camera, inside the
frame, in landscape and portrait* projects every spark through `src/race-camera.ts` for both
chase rigs, three speeds, three Camera FOV settings and chains 1 to 3.

Measured over 864 sparks (High, chains 1 to 3):

| View | Drawn size at birth | Over its life | Distance from the lens | Frame y (-1 bottom) | Frame x, at most |
| --- | --- | --- | --- | --- | --- |
| Landscape chase | 6.0 to 12.9 px | up to 28.6 px | 1.78 to 4.92 m | -0.87 to -0.35 | 0.47 |
| Portrait chase | 3.3 to 7.1 px | up to 11.7 px | 4.49 to 8.97 m | -0.15 to -0.01 | 0.87 |

Sizes are device pixels at pixel ratio 1.5. The largest size is at the end of a life, when the
spark has faded.

## Live captures

Real WebGL, High, 844x390 and 390x844 at device scale 2, Coast, Neon, Sky Spiral and Frostbite.
The PNGs are saved outside the repository; the session's final message gives the paths.

What they show, stated plainly:

- Landscape: sparks that have left the jets read as small gold points beside the car (one is
  clear to the right of the car on Neon). Sparks still inside the white additive plume do not
  read.
- Portrait: sparks are 3 to 7 px and hard to pick out in a still.
- No white wash is added over the car's rear: sparks are NormalBlending, 19 at most.

Visibility against the current plume is modest. The plume is being replaced by the shader
session's flame; the sparks must be judged again on that flame before the design's acceptance
line ("captures show tongues, the nozzle core and sparks") is ticked. If they still read weak
there, the levers in order: draw the points after the flame (render order, no cost), then size.

## Scope cuts

- Player's car in a race only: no sparks on rivals, the Garage showroom or the Home preview.
- Round kind-0 points, not streaks: a streak needs a second point kind in the pool's shader.
- No sparks when the race has no pose object for the player (`vehicles[0]`).
- Chain lift is by `car.nitroBurst`; a chain beyond the table's three steps uses the last step.

## Rule text for integration to place

Proposed for `.claude/rules/nitro-trail-vfx.md`:

> **Sparks are judged in the chase camera, not in the car's frame.** Trap (2026-11-20): NITRO
> sparks at 12 to 24 m/s passed every unit test and showed in no live frame. The NITRO chase eye
> is under 4 m behind the nozzles, so a fast spark passes the lens in 0.2 s, and the additive
> jets wash out a spark that stays inside them. Mechanism: `src/nitro-sparks.ts` keeps exit speed
> low, lives at 0.3 s or less and fans each port to its own side; chained NITRO scales speed
> only. A change to spark speed, life or size, or to `RACE_CAMERA.chase` / `chasePortrait`,
> re-runs the guard and a real WebGL capture in both orientations. Guard:
> `tests/nitro-sparks.test.js` (*a spark spends its whole life in front of the chase camera,
> inside the frame, in landscape and portrait*), RED on the fast tuning
> (`1.35 m from the lens`).
>
> **The spark budget is 8 / 12 / 19 live sparks (Low / Medium / High) of the pool's 480**, at
> most 4 per frame. A new emitter in the shared pool states its own budget the same way. Guard:
> *the spark budget cannot starve the shared particle pool*.

Proposed for `docs/regression-first-workflow.md` or `.claude/rules/performance-review.md`:

> When tuning a value against a bound, measure the whole range first. An assertion reports the
> first failing sample, not the worst one; nudging the value until the message changes hides the
> real range. Print min and max over every case, then set the value or the bound once.

## Not run

- `make verify`, the full `npm run test:browser` and the World Tour long-run config.
- A physical phone (`make phone-diag`): captures are headless Chromium at phone sizes.
- GitHub CI for this commit: the branch is not pushed.
- The Garage trial build (`node scripts/build-garage-browser.mjs`) and a capture per trail skin:
  the skin colour is covered by unit tests only (*an equipped trail skin recolours the sparks*).
- Crimson GT live capture (shader-warmup covers it on Low and High; no still).
- `tests/sprint-plume-veil-browser.spec.js`.
- The mutation check and the on/off A/B bench on the final tuning (run on the first tuning).
- 5 to 8 km continuous driving per tier, GPU memory and stall counts.

## Environment note

The worktree has two ignored symlinks, `node_modules/three` and `node_modules/typescript`, to the
parent checkout's packages so `tsc` and the three.js pin tests resolve. They are not committed.
