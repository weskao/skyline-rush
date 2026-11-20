# Sprint tiers: screen layer evidence
Status: done

Branch `feature/sprint-tier-screen`. Code commit: `feat(sprint-tier): screen cues step up from BOOST to NITRO to
NITRO + BOOST`, on top of `071cd340`. Not pushed, not merged.

## What changed

- `SPRINT_TIERS` (`src/sprint-tier.ts`) carries one share per screen cue: `share` (camera FOV, landscape re-aim,
  light), `blur` (held lens radial blur), `lines` (airflow speed-line density and travel speed) and `punch`
  (the ignition FOV overshoot and its blur flash). `sprintCue(nitro, boost, cue)` reads them, each tier weighted by
  how fully its channel is on. `sprintTier()` and the four ids are unchanged; only fields were added.
- `createSprintVfx` (`src/vfx-settings.ts`) reads every strength through `sprintCue`. No `boost.intensity * 0.8`
  is left. New `frame.lines` (with the chain lift). `frame.punch` is capped at `NITRO_CHAIN_LIFT.at(-1)`, the x3
  NITRO punch that the portrait HUD and dolly guards in `tests/race-camera.test.js` check.
- `src/aero-vfx.js`: +1 line. The airflow lines read `sprintFrame.lines` for travel speed and density;
  `fu.power` (light) is unchanged.
- `src/lens-pass.ts`, `src/race-camera.ts` and `src/world.js`: no change needed (the lens already takes
  `sprintFrame.blur`, the camera already takes `fov`/`punch`).
- `.claude/rules/race-camera.md`: trap entry "BOOST read as NITRO at 80%".

## Design decisions

- **BOOST unchanged.** Existing guards pin it: settled `fov == power`, held blur `0.6 * power`, punch overshoot
  1.5 to 3.5° under 45°/s, held share at MAX_SPEED 0.6 to 0.7. The gap widens by making NITRO and the chain read
  faster, as the brief asks.
- **NITRO steps up through punch, blur flash and lines.** Its held FOV (share 1, 7° at the default setting) and
  High blur (0.6, the board-effects Ultra test) are pinned by guards.
- **NITRO with BOOST held: same FOV and light as NITRO** (same top speed, no second FOV jump). It steps up through
  the held blur, a stronger punch and denser, faster lines.
- **x3 chain adds reach and speed cues, never light.** `lightPower` stays before the chain lift, so bloom and
  airflow opacity are equal across the chain (garage-nitro-trail guard).
- **Bloom kept unchanged.** NITRO's halo is capped at 0.055 for glare (vehicle-lighting and nitro-trail rules),
  and BOOST already blooms more than NITRO (0.11 against 0.0495 at bloom 0.55). Raising NITRO's bloom would break
  the glare cap; dimming BOOST's would only make BOOST read weaker, not NITRO faster.
- **No afterimage or tail-light streak work.** No new draw call, material or mesh was added.

## Per-tier numbers

From `createSprintVfx` at speed 110 of 110, High, FOV setting 7 (default), 90 frames at 1/60 s. "FOV peak"
includes the punch. "Lines" before this change means the sprint power that fed the airflow density.

Before (`071cd340`):

| Tier | fov share | FOV ° held | FOV ° peak | punch | blur held | blur peak | lines | lightPower |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BOOST | 0.80 | 5.60 | 9.68 | 0.80 | 0.48 | 0.72 | 0.80 | 0.80 |
| NITRO | 1.00 | 7.00 | 11.15 | 1.00 | 0.60 | 0.90 | 1.00 | 1.00 |
| NITRO + BOOST | 1.00 | 7.00 | 11.15 | 1.00 | 0.60 | 0.90 | 1.00 | 1.00 |
| NITRO x3 | 1.40 | 9.80 | 13.18 | 1.34 | 0.84 | 1.00 | 1.40 | 1.00 |
| NITRO + BOOST x3 | 1.40 | 9.80 | 13.18 | 1.34 | 0.84 | 1.00 | 1.40 | 1.00 |

After:

| Tier | fov share | FOV ° held | FOV ° peak | punch | blur held | blur peak | lines | lightPower |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BOOST | 0.80 | 5.60 | 9.68 | 0.80 | 0.48 | 0.72 | 0.80 | 0.80 |
| NITRO | 1.00 | 7.00 | 11.98 | 1.20 | 0.60 | 0.96 | 1.30 | 1.00 |
| NITRO + BOOST | 1.00 | 7.00 | 12.90 | 1.40 | 0.78 | 1.00 | 1.60 | 1.00 |
| NITRO x3 | 1.40 | 9.80 | 13.21 | 1.40 | 0.84 | 1.00 | 1.82 | 1.00 |
| NITRO + BOOST x3 | 1.40 | 9.80 | 13.21 | 1.40 | 1.00 | 1.00 | 2.24 | 1.00 |

Each step, after: BOOST → NITRO: punch ×1.50, lines ×1.63, blur peak ×1.33. NITRO → NITRO + BOOST: punch ×1.17,
held blur ×1.30, lines ×1.23, no FOV change. NITRO + BOOST → x3: FOV share ×1.40, held blur ×1.28, lines ×1.40.
Reduced Motion: FOV, punch and blur are 0 on every tier (squat follows the same comfort gate, unchanged).

## Commands and observed results

| Command | Result |
| --- | --- |
| `node --test tests/sprint-tier.test.js` before the code change (RED) | 2 of 5 failed: "lines: NITRO undefined vs BOOST undefined" and the `boost.intensity * 0.8` source check |
| `node --test tests/sprint-tier.test.js` after (GREEN) | 5 of 5 pass |
| `node --test` on sprint-tier, aero-vfx, race-camera, lens-pass, board-effects, rendering-quality, garage-nitro-trail, nitro-trail-comfort, sprint-plume, module-size | all pass after the final test edit (107 of 108 before it; the one failure was my own new source-regex check, replaced by a behavioural check) |
| `node --test tests/module-size.test.js` | 3 of 3 pass |
| `npm test` | 3673 tests, 3669 pass, 0 fail (4 skipped or todo) |
| `npm run typecheck` | passes (exit 0) |
| `npm run build` | passes: built in 9.38 s, coming-soon bundle check clean |

Environment note: this worktree had no local `node_modules` (packages resolve from the parent checkout).
`tests/js-typecheck.test.js` and `tests/three-version-contract.test.js` open `node_modules/...` by path and failed
5 tests for that reason alone. With `node_modules` linked to the parent checkout for the run, all 5 pass and the
full suite is the 0-fail result above. The link was removed afterwards.

## Frame time

Real WebGL, Coast, High with AIRFLOW on, headless Chrome on an Apple M4, 390x844 portrait (DPR 2), after only.
rAF frame time over 2 s of game time per tier:

| Tier | P50 ms | P95 ms | car width (NDC half-width) |
| --- | --- | --- | --- |
| BOOST | 16.8 | 20.0 | 0.369 to 0.382 |
| NITRO | 16.5 | 19.2 | 0.374 to 0.382 |
| NITRO + BOOST | 16.6 | 20.1 | 0.366 to 0.375 |
| NITRO + BOOST x3 | 16.7 | 19.7 | 0.367 to 0.375 |

The car stays inside the frame on every tier and within 5% of its BOOST size (the dolly guard allows 10%).
Caveat: this run came from the first version of the temporary capture spec. That version's field-holding loop
kept running into the next state, so each tier's ignition may not have started from idle. The held frame times
are still valid for the after-code at that viewport. No "before" frame time was measured (see Not run). The
change adds no draw call, material, texture or per-frame allocation: `sprintCue` is three multiplies and two
`max` per cue per frame, and the airflow line reads one more number.

## Captures

Saved under `$TMPDIR/sprint-tiers-captures/screen/` (outside the repo):

- `desktop-boost-ignition.png`, `desktop-boost-held.png` (1440x900, after)
- `after-portrait.json` (390x844 frame times and car size above)

An earlier desktop run also showed held NITRO and BOOST frames, with the denser, faster airflow lines on NITRO.
Those files were overwritten when the run restarted.

## Not run

- Real WebGL captures of NITRO, NITRO with BOOST held and the x3 chain at 1440x900, and of all four tiers at
  390x844 and 844x390: captures stopped on the user's instruction.
- "Before" captures and before frame times at 071cd340 (all three viewports): captures stopped on the user's
  instruction.
- `tests/sprint-camera-capture-browser.spec.js` (`SPRINT_CAMERA_CAPTURE=1`): waived on the user's instruction.
- `tests/shader-warmup-browser.spec.js`: waived on the user's instruction.
- `npm run test:browser`, `make verify` and the exact-HEAD GitHub `quality-gate`: not run. The branch is not
  pushed; the coordinating session integrates. Browser specs were waived on the user's instruction.
- The 5-8 km High/Medium/Low continuous-drive performance pass (`performance-review.md`): not run. The change adds
  no rendering work.
- Real phone (device-class) check: not run.
