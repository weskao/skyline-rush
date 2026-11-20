# Sprint exhaust: evidence (branch `feature/thruster-flame`)
Status: blocked: the only real frames (Standard look, Roadster, 844 x 390, High) show the tiers by colour, but the tongues read faint and the combined tier's sheath does not read red-orange; the look rows need a tuning pass judged on captures, and captures were stopped on the user's instruction

Scope: the textured jet in `src/sprint-plume.ts`, its data in `src/sprint-plume-looks.ts`, the tier hand-off in
`src/aero-vfx.js`, the texture's move and the rule `.claude/rules/sprint-plume.md`. Measured 2026-11-21 on Chromium,
ANGLE Metal, Coast. Other sessions ran on the same machine throughout (load average 50 to 208).

Commits: `a03661a3` (texture move), `c5599ae8` (jet, looks, tier, guards, rule). Not pushed, not merged.

## What is delivered, and what is not

| Done-when | State |
| --- | --- |
| Jet samples the shared flame texture through `src/nitro-flame-texture.ts` | Done, unit-guarded |
| Texture ships in the locked production build | Done: `dist/feature-assets/nitro-flame/flame-noise.png` after `npm run build` |
| Per-skin looks from one table, no hand-written per-skin shader branch | Done: `THRUSTER_LOOKS`, select generated from the rows |
| Tier passed through `PlumeFrame`, never re-derived | Done: `PlumeFrame.tier` from `sprintTier()`, `chain` as flow speed |
| Guard tests RED first | Done (below) |
| Glare, flicker, veil, cost, warm-up guards pass unchanged | Unit guards pass unchanged. Veil passed once on the final code. Warm-up, black-frame and the final cost run: not run |
| Real WebGL captures show each skin at each tier | **Not met.** One skin row seen, at three tiers, and it reads weak (below) |

### What the saved frames show

Three frames exist, all with `skinPattern` 0 and the Standard `look` row (0.8, 0.6, 2, 0.22), although the run asked
for Plasma helix: the skin pick did not reach the plume in that run (cause not investigated; the run also logged two
`Failed to fetch dynamically imported module …/src/asset-model-loader.ts` errors under load, and the spec failed on
them). So they are evidence for the Standard row only.

| Tier | `tier` uniform (core, tongues, sheath, taper) | Clock rate (s/s) | Texture loaded | Veil (limit 80) | vs road | Area |
| --- | --- | --- | --- | --- | --- | --- |
| BOOST | 9, 0.6, 0, 1.7 | 0.55 | yes | 44.5 | 115.5 | 5.37 |
| NITRO | 6.5, 0.85, 0, 1.5 | 0.75 | yes | 19.4 | 149.3 | 5.65 |
| NITRO with BOOST held | 5, 1, 1, 1.35 | 0.9 | yes | 5.7 | 137.5 | 5.34 |

- The data path works in a live race: the tier row, the per-tier clock rate and the loaded image all reach the jet.
- Read by eye: BOOST is a pale blue-white haze, NITRO a gold haze with faint streaks. Both are soft cones; the
  tongues do not read as a torn flame at chase distance.
- The combined tier is no visible step up from NITRO: the sheath reads tan, not red-orange, and its contrast against
  the road is lower than NITRO's (137.5 against 149.3).
- Next step for whoever tunes it: raise `tear` / the `lick` contrast and the sheath's mix in the two tables, judged on
  racing captures with the veil spec re-run. No light term needs to change.

## Skin table (`THRUSTER_LOOKS`, row order = catalog thruster order)

| Skin | floor | depth | strands | twist | spin | sharp | tear | hair | tiles | stretch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standard | 0.82 | 0.18 | 2 | 25 | 7 | 1 | 0.8 | 0.6 | 2 | 0.22 |
| Ion | 0.6 | 0.4 | 3 | 36 | 12 | 0.5 | 0.55 | 1 | 3 | 0.3 |
| Plasma helix | 0.58 | 0.42 | 3 | 28 | 8 | 2 | 1 | 0.45 | 2 | 0.16 |
| Void pulse | 0.35 | 0.56 | 1 | 13 | 5 | 1 | 0.7 | 0.25 | 1 | 0.12 |

Void pulse hides the jets while its beams draw (`src/garage-void-beams.js`, pinned by
`tests/garage-skin-replacement.test.js`, both outside this session's edit list), so its row is data only today.

| Tier (`TIER_LOOKS`) | core | tongues | sheath | taper | flow |
| --- | --- | --- | --- | --- | --- |
| idle | 10 | 0.45 | 0 | 1.9 | 0.4 |
| BOOST | 9 | 0.6 | 0 | 1.7 | 0.55 |
| NITRO | 6.5 | 0.85 | 0 | 1.5 | 0.75 |
| NITRO with BOOST held | 5 | 1 | 1 | 1.35 | 0.9 |
| x2 / x3 chain | same | same | same | same | + 0.25 x chain, at most 1 |

A showroom demo (Garage, Home) burns as BOOST, or as NITRO while a trail skin previews.

## Commands and observed results

| Command | Result |
| --- | --- |
| `node --test tests/nitro-flame-asset.test.js tests/nitro-flame-texture.test.js` before the move | RED: 6 failing |
| same, after the move (`a03661a3`) | 37 pass |
| `node --test tests/sprint-plume-flame.test.js` before the change | RED: 11 of 11 failing (first `ERR_MODULE_NOT_FOUND` for the looks module, then each for its own assertion) |
| `node --test tests/sprint-plume-flame.test.js tests/nitro-flame-texture.test.js tests/sprint-plume.test.js` | 33 pass |
| `node --test` on module-size, shader-safety, aero-vfx, garage-skin-renderer, garage-skin-replacement, sprint-color-tokens, garage-skin-warmup | 56 pass |
| `node --test tests/module-size.test.js` (final tree) | 3 pass. `sprint-plume.ts` 180 lines, `sprint-plume-looks.ts` 37, `aero-vfx.js` 382 (4 added lines) |
| `npm test` (final tree) | 3681 tests: 3677 pass, 0 fail, 4 skipped |
| `npm run typecheck` (final tree) | exit 0 |
| `npm run build` (final tree) | exit 0, "Production coming-soon bundle checked"; texture in `dist/` at 293,450 bytes |
| `PLAYWRIGHT_PORT=5246 npx playwright test tests/sprint-plume-veil-browser.spec.js` | 2 passed (Roadster, Crimson GT; High, 844 x 390, veil at most 80), on the working tree that became `c5599ae8`; not repeated after the commit |

A first `npm test` run is void: the worktree had no install of its own, so five tests that read
`node_modules/three` and `node_modules/typescript` in the checkout failed, and the run was interrupted (50 files
cancelled). After `npm ci` in the worktree the run above is clean.

## Frame cost (held NITRO, `tests/sprint-plume-cost-browser.spec.js`, p50 ms)

"Before" is the plume at `a03661a3`, run from a detached worktree, because the spec serves live source.

| Viewport | Tier | Before (runs) | After (runs) | Median before | Median after |
| --- | --- | --- | --- | --- | --- |
| 844 x 390 | Low | 5.5, 4.9 | 4.1, 5.0, 6.2, 4.5, 4.3, 3.9 | 5.2 | 4.4 |
| 844 x 390 | Medium | 7.6, 7.0 | 6.2, 6.1, 7.4, 6.1, 6.2, 6.6 | 7.3 | 6.2 |
| 844 x 390 | High | 7.2, 7.6 | 6.6, 6.4, 9.5, 8.2, 10.2, 5.9 | 7.4 | 7.4 |
| 1440 x 900 | Low | 6.6, 7.6 | 9.1 | 7.1 | 9.1 |
| 1440 x 900 | Medium | 12.1, 14.2 | 12.1 | 13.2 | 12.1 |
| 1440 x 900 | High | 12.2, 15.5 | 12.8 | 13.9 | 12.8 |

Run-to-run spread is about 2 ms under this machine's load, larger than the 0.3 ms budget, so these runs cannot prove
or disprove it. The 1440 x 900 Low row is one sample and is higher after.

Paired measurement (each live frame drawn twice, without and with `Rear ports`, GPU-synced, order alternating; the
median paired difference is the exhaust's own cost; 400 frames, 844 x 390, one run each):

| Tier | Before (ms) | After (ms) |
| --- | --- | --- |
| Low | -0.2 | 0.2 |
| Medium | 0.4 | 0.5 |
| High | 0 | 0 |

The negative Low baseline puts this method's noise floor at 0.2 ms or more. Medium + 0.1 ms and High + 0 fit the
budget; Low is not settled. Six further paired runs (both sizes) failed to start under load. The change adds two
texture reads per jet fragment and no draw call.

## Texture

`public/feature-assets/nitro-flame/flame-noise.png`, 293,450 bytes, 512 x 512 RGB. Requested once per page, when the
first exhaust is created (`nitroFlame.request()` in `createSprintPlume`). It sits outside
`feature-assets/garage-vfx-skins/`, which the locked build deletes, and is in `dist/` after `npm run build`. Until it
arrives, or if it never does, the jets draw on the loader's neutral texel: the old smooth cone at 75% alpha.

## Captures

Saved under `$TMPDIR/sprint-tiers-captures/exhaust/` (Standard look row, see above; file names carry the skin the run
asked for):

- `thruster-plasma-roadster-boost-844x390-high.png`, `…-boost-844x390-high-crop.png`
- `thruster-plasma-roadster-nitro-844x390-high.png`, `…-nitro-844x390-high-crop.png`
- `thruster-plasma-roadster-combined-844x390-high.png`, `…-combined-844x390-high-crop.png`
- `thruster-plasma-roadster-844x390-high.json` (uniforms, veil, area per tier)

Paired cost data: `$TMPDIR/sprint-tiers-captures/exhaust-cost/base1-844x390.json`, `new2-844x390.json`.

## Not run (waived on the user's instruction)

- `tests/shader-warmup-browser.spec.js`
- `tests/black-frame-browser.spec.js`
- `tests/sprint-plume-veil-browser.spec.js` after the commit (it passed once before it, same code)
- `tests/sprint-plume-cost-browser.spec.js` on a quiet machine, and the paired measurement at 1440 x 900
- `tests/sprint-camera-capture-browser.spec.js` with `CORES=2` (the Low BOOST area floor)
- Captures, 844 x 390 High, Roadster: Standard, Ion, Plasma helix and Void pulse at BOOST, NITRO and combined with
  the skin confirmed on the jet (12 frames)
- Captures, Crimson GT, Standard, three tiers
- Captures, Standard at 390 x 844 and at 1440 x 900, three tiers each
- `npm run test:browser`, `make verify`, phone-device check, Reduced Motion / Comfortable and Low looked at by eye

## For the coordinating session

- `.claude/rules/nitro-trail-vfx.md` still says only `garage-nitro-trail.js` imports the flame loader and that the
  locked bundle never references it; `docs/designs/nitro-flame/evidence-art.md` line 10 names the texture's old path.
  Both are outside this session's edit list.
- `tests/nitro-flame-texture.test.js` now expects two importers of the loader: `garage-nitro-trail.js` and
  `sprint-plume.ts`.
- `src/aero-vfx.js`: three lines added by the jet block and one changed; the airflow `power` line is untouched.
