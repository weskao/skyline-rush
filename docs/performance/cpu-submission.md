# CPU render submission (Wave 3, item 32)

Branch `feature/perf-thermal-32-cpu-submit`. Goal: `cpuRenderSubmissionMs.p50` -25% against baseline A `d9c144ba` on the
five racing scenes, with zero visual change (visual gate: max channel delta <= 1 on non-particle scenes).

**Result: target NOT met without a visual change. Item 32 stays unticked.** The one change that is pixel-identical
(volcanic shimmer) is within timing noise. The two changes that reach the target move pixels and were rejected.

## Tool

`scripts/cpu-submit-probe.mjs <track> [--counters] [--profile]` (page `tests/fixtures/cpu-submit-probe.html`) prints the
submission p50, per-frame work counters and a CPU profile of the measured frames only. Counter mode patches three and
WebGL2, so its timings are inflated: use counts there, never milliseconds.

## Per-frame work counters (LOCAL-CHROME, 300 frames, counters on)

| Counter | taipei A | taipei with both rejected changes | Note |
| --- | ---: | ---: | --- |
| extra two-pass transparent draws | 44 (car parts; volcanic shimmer 7, kept) | 0 | `forceSinglePass` on solid car parts |
| `material.needsUpdate` sets | 88 | 0 | two-pass flips it between passes |
| program lookups (`getParameters`) | 34 (tokyo 38) | 0 (tokyo 2) | instanced twin material |
| `matrixWorld` visits | 2,136 | unchanged | about 12% of the frame, not touched |

## A vs candidate (final head, 5 interleaved rounds, rotated build order)

Candidate = probe + volcanic shimmer single pass. `cpuRenderSubmissionMs.p50`, median (min-max), LOCAL-CHROME, host load
about 30. Resolution of the metric is 0.1 ms.

| Scene | A (ms) | Candidate (ms) | Change | Goal |
| --- | --- | --- | ---: | ---: |
| coast | 2.60 (2.30-2.70) | 2.40 (2.10-2.50) | -7.7% | -25% |
| neon | 3.00 (2.60-3.70) | 3.00 (2.60-5.60) | 0.0% | -25% |
| taipei | 3.30 (2.90-5.90) | 3.00 (2.90-3.20) | -9.1% | -25% |
| tokyo | 3.20 (2.80-3.60) | 3.00 (2.90-3.50) | -6.2% | -25% |
| volcanic-crown | 2.80 (2.50-3.60) | 2.60 (2.50-4.30) | -7.1% | -25% |

These A values differ from the brief's (3.2 / 3.5 / 5.2 / 5.5 / 4.5): the host and load differ. All five are within the
min-max spread of A, so none of this is a measured gain.

## Rejected: both reach the target and both move pixels

Same matrix with all four changes applied (5 rounds): coast -25.0%, neon -28.6%, tokyo -32.3%, taipei -33.3%,
volcanic -43.3%.

| Change | What it did | Visual gate vs integration head `f371b3d9` (candidate cherry-picked onto it) |
| --- | --- | --- |
| `forceSinglePass` on solid double-sided car parts | removed the back-then-front pass of the car | 1-4 pixels in the car region differ: tokyo race max 23 on 1 px, Photo tokyo max 18 and 54 on 2-4 px, home coast max 43 on 4 px. Suspected cause: equal-depth ties resolve in a different order (not proven) |
| instanced twin material (`instancedTwin`) | a batch draws with its own copy, so three stops re-running `getProgram` when a plain mesh and a batch share a material | tokyo race max 44 on 99 px, desktop tokyo max 19 on 23 px. The copy has a new `material.id`, which changes the opaque sort order. The earlier large particle differences were RNG only (`clone()` draws UUIDs from `Math.random`, shown by `scripts/final-report/visual-rng.mjs`) |

Both are recorded with their tests in git history (`9772164e`, `966a5337`) and reverted (`4dd8b040`, `f15a580a`).

## Remaining options, with visual impact

1. Restrict `forceSinglePass` to car materials with no map and no alpha map, then re-run the gate. Could stay pixel
   identical; untried.
2. Waive the gate for a few pixels in the car region (a visual change of at most 4 px in the tested frames). Needs the
   owner's decision.
3. Twin material that keeps the draw order (needs the copy created before every other material, or a sort key that
   ignores `material.id`). Not found; a `renderer.setOpaqueSort` change touches every scene.
4. Neon: 10 program lookups per frame remain, all in the instanced Neon Downtown kit (different path from
   `world-tour-batching`). Not investigated.
5. `matrixWorld` (2,136 visits per taipei frame) and `projectObject`: freezing `matrixAutoUpdate` in visible chunks is
   ruled out by `.claude/rules/performance-review.md`; a bounding hierarchy for static groups is untried.
6. Geometry merging and instancing would cut submission too, but belongs to item 31.

## Visual gate, final head

`scripts/final-report/visual-fidelity.mjs` against `f371b3d9` with the volcanic shimmer commit cherry-picked: 20 of 20
scenes, max channel delta <= 1, 0 pixels over 8 (race, home, garage, showcase, Photo, results; mobile and desktop).
