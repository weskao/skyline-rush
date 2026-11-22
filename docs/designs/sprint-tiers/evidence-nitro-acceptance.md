# NITRO realistic flame: integration acceptance
Status: done

Branch `feature/nitro-flame-acceptance`, 2026-11-21. Checks the "Acceptance" section of
`docs/designs/nitro-flame/DESIGN.md` on the merged result of the art, shader and sparks sessions
(`evidence-art.md`, `evidence-shader.md`, `evidence-sparks.md` in that folder). Chromium, ANGLE Metal, Apple M4.
Every "passes" from those files was re-run here before it was recorded.

## Fixed

The art image is busier along V than the shader assumed. The shader was tuned on a stand-in image and
`FLAME_CYCLES` says r 2, g 8, b 3. Measured on the shipped `flame-noise.png` at the shader's own dark/light levels
(R .25/.75, G .357/.643, B .52/.85), the light-dark cycles per tile along V were:

| Channel | mean | median | p90 | max |
| --- | --- | --- | --- | --- |
| R | 1.13 | 1 | 2 | 3 |
| G | 7.08 | 7 | 9 | 11 |
| B | 0.24 | 0 | 1 | 3 |

The `.r` sample scrolled at 1.2 tiles/s, which is 3.6 Hz at one pixel, over the 3 Hz limit.

- RED: a new test, *the real flame image, scrolled as the shader scrolls it, changes one pixel no faster than 3 Hz*, in
  `tests/nitro-trail-comfort.test.js`. It decodes the PNG and counts the busiest column per channel. On the old
  scroll it fails with `texture2D(flame,vec2(a,m*.5-time*1.2)).r.r: 3 cycles a tile x 1.2 tiles/s = 3.60 Hz`.
- GREEN: `src/garage-nitro-trail.js` now scrolls `.r` at 1.0 and `.gb` at .27, so R reaches 3.0 Hz and G 2.97 Hz.
  The spatial scale is unchanged. No limit was widened.
- The rule `.claude/rules/nitro-trail-vfx.md` gains the trap with these numbers. The two sparks rule bullets
  proposed in `evidence-sparks.md` were added verbatim.
- Commit `a32a902e`.

## Reviewed, kept

- **`src/world.js` sparks line.** `setCosmeticSkins` now also calls `effects.setNitroTrail(ids)`. It is kept:
  - it is the existing path that already hands `effects.js` the drift-trail skin;
  - the line count is unchanged (943);
  - `tests/nitro-sparks.test.js` asserts it.

  Moving it would need a second skin source. Reverting it would leave every spark gold. The captures show cyan
  sparks on the cyan skin and red sparks on the red skin, so it works at runtime.
- **`src/aero-vfx.js` line from the shader session.** It holds the base cone at 20% under a trail skin. It is
  kept: without it the smooth cone covers every tongue. The file belongs to the screen session and was not
  touched here.

## Commands and observed results

| Command | Result |
| --- | --- |
| `node --test tests/module-size.test.js` | 3 pass, 0 fail |
| `npm test` (merged tree, before the fix) | 3672 tests: 3668 pass, 0 fail, 4 skipped |
| `npm test` (after the fix) | 3673 tests: 3669 pass, 0 fail, 4 skipped |
| `node --test tests/nitro-trail-comfort.test.js tests/garage-nitro-trail.test.js tests/nitro-flame-texture.test.js tests/shader-safety.test.js tests/module-size.test.js` | 37 pass, 0 fail |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, "Production coming-soon bundle checked" |
| Locked build with the image present: `ls dist/feature-assets/garage-vfx-skins`; `grep -rl 'flame-noise\|nitro-flame' dist/assets` | No such directory; no match |
| `PLAYWRIGHT_PORT=5248 npx playwright test tests/shader-warmup-browser.spec.js tests/black-frame-browser.spec.js tests/sprint-plume-veil-browser.spec.js --workers=1` | 8 passed (1.8 min). Veil is under 80 on both cars. None of these specs equips a trail skin. |
| `PLAYWRIGHT_PORT=5248 PLUME_BENCH=1 LABEL=acceptance VIEWPORT=844x390 npx playwright test tests/sprint-plume-cost-browser.spec.js` | 1 passed (1.5 min), load 74 to 86. p50 / p95 ms, calls: Low 4.5 / 6.5, 284; Medium 6.1 / 8.4, 189; High 7.4 / 9.2, 183. |
| Same with `VIEWPORT=1440x900` | 1 passed (2.6 min), load 86 to 157. Low 7.9 / 10, 273; Medium 12.4 / 15.1, 187; High 12.7 / 14.8, 191. |
| Earlier attempts at load 101 to 199 | 1440x900 read about 2x these numbers; 844x390 and both A/Bs failed fixture setup (`#start-button` not attached in 45 s). Superseded by the runs above. |

## Frame cost

The budget in `.claude/rules/sprint-plume.md` is a held-NITRO median rise of at most 5% or 0.3 ms, whichever is
larger, between a before and an after on the same machine. Other sessions still kept the load average between 23 and
108, so the before and the after were taken **interleaved on one page** rather than as two separate runs. The drift
then falls on both arms equally.

`tests/sprint-plume-cost-browser.spec.js` equips no trail skin, so its numbers above are absolute, not a judgement.
They sit near the sparks session's "after" (844x390: 4.4, 8.5, 6.8 ms). This integration adds two costs, and each was
measured on its own with an A/B. Both A/B specs were throwaway and are not committed.

The method, in both A/Bs:

- Coast, holding speed 118 and `nitroTime 30`;
- order A, B, B, A, A, B, each sample a 4 s GPU-synced p50 (`sampleFrameCost`);
- each arm's median of three is shown below;
- "pooled" is the median of every sample of that arm over all runs.

**Real image vs neutral texel (cyan trail skin equipped).** The flame uniform switched between the loaded 512 x 512
image and `createNitroFlame(null)`'s 1 x 1 texel. Values are p50 in ms, real / neutral:

| Viewport, run (load) | Low | Medium | High |
| --- | --- | --- | --- |
| 844x390, 1 (88 to 91) | 5.1 / 5.8 | 6.9 / 7.3 | 7.1 / 6.8 |
| 844x390, 2 (33) | 3.9 / 4.3 | 6.8 / 7.1 | 6.7 / 6.6 |
| 844x390, pooled | 4.5 / 4.85 (-0.35) | 6.85 / 7.3 (-0.45) | 6.75 / 6.7 (+0.05) |
| 1440x900, 1 (91 to 109) | 7.1 / 6.9 | 10.9 / 10.8 | 10.4 / 10.8 |
| 1440x900, 2 (28 to 37) | 6.5 / 7.1 | 10.9 / 10.7 | 12.1 / 12.0 |
| 1440x900, pooled | 6.8 / 6.95 (-0.15) | 10.9 / 10.75 (+0.15) | 10.8 / 11.1 (-0.3) |

Every single run and every pooled cell is within budget. The largest rise in one run is +0.3 ms, at 844x390 High run 1,
where the limit is 0.34 ms.

**Sparks on vs off (no skin, the path of `sprint-plume-cost-browser.spec.js`).** `SPARK_RATE` (exported, read every
frame) was zeroed live on the page's own module. A probe of the particle pool counted live points (alpha > 0):

- with the sparks off, Low and High dropped to 0, and the count came back when they were switched on;
- Medium kept 32 points from another emitter.

So the switch reached the running game. Values are p50 in ms, on / off:

| Viewport, run (load) | Low | Medium | High |
| --- | --- | --- | --- |
| 844x390, 1 (65) | 3.6 / 3.5 | 5.3 / 5.5 | 5.4 / 5.4 |
| 844x390, 2 (27 to 42) | 4.2 / 3.8 | 5.9 / 6.1 | 6.7 / 6.0 |
| 844x390, 3 (31) | 4.1 / 4.0 | 5.9 / 6.1 | 5.7 / 5.7 |
| 844x390, pooled | 4.0 / 3.8 (+0.2) | 5.8 / 5.9 (-0.1) | 5.7 / 5.7 (0) |
| 1440x900, 1 (23 to 27) | 6.4 / 6.1 | 9.8 / 10.0 | 10.8 / 11.0 |
| 1440x900, 2 (30 to 33) | 5.4 / 5.4 | 10.8 / 10.2 | 11.0 / 10.7 |
| 1440x900, pooled | 5.85 / 5.85 (0) | 10.0 / 10.05 (-0.05) | 10.85 / 10.85 (0) |

Every pooled cell is within budget. Three single-run cells went over:

- 844x390 run 2, Low, +0.4 ms;
- 844x390 run 2, High, +0.7 ms;
- 1440x900 run 2, Medium, +0.6 ms.

In each of them the spread inside one arm was wider than the gap: High "off" read 6.0 to 8.6, and Medium "off" read
9.8 to 11.3. The other runs of the same cells read 0 or below. The sparks draw no call of their own: they use at
most 19 of the shared pool's 480 points, a single draw that is the same size either way.

## Real WebGL captures

Coast, High, DPR 2, a live race, 0.8 s at speed 88 and then 1.5 s of held NITRO at 118. The real 512x512 image was
loaded in every frame, the streaks were parented to `Rear ports`, and there were 0 page errors. The files are in
`$TMPDIR/sprint-tiers-captures/nitro-acceptance/` (not committed):

- `<car>-<view>-high-<skin>.png`, for car `roadster` or `crimson-gt`, view `landscape` (844x390) or `portrait`
  (390x844), and skin `cyan`, `gold`, `red` or `purple`: 16 frames;
- `crimson-gt-landscape-high-<skin>-no-exhaust.png`: the same frame with `Rear ports` hidden;
- `<car>-<view>-high.json`: the probe numbers;
- `crops/`: zooms on the car's rear.

`plumeContrast` (frame drawn without and with `Rear ports`). `veil` is the change on the car's rear face (limit 80),
`vsRoad` is the jet against the road, and `area` is the % of the frame changed:

| Car, view | cyan | gold | red | purple |
| --- | --- | --- | --- | --- |
| Crimson GT, landscape (veil / vsRoad / area) | 76 / 194.6 / 5.56 | 63.6 / 185.3 / 4.93 | 46 / 158.1 / 3.71 | 45.4 / 184.1 / 4.16 |
| Crimson GT, landscape, second run | 74.7 / 188.2 / 5.48 | 64.1 / 181.8 / 5.57 | 38.8 / 161.3 / 3.73 | 60.4 / 180.9 / 4.46 |
| Crimson GT, portrait | 61.2 / 184.6 / 13.5 | 60.3 / 165.2 / 14.75 | 52 / 116.7 / 10.21 | 56 / 149.7 / 13.64 |
| Roadster, landscape | 12 / 172.9 / 4.91 | 18.4 / 160.9 / 4.49 | 2.4 / 137.3 / 3.42 | 3 / 164.7 / 3.8 |
| Roadster, portrait | 5.4 / 159 / 11.93 | 6 / 141.5 / 12.71 | 1.4 / 78.3 / 8.09 | 1.4 / 109.8 / 13.03 |

The shader session's stand-in image gave Crimson GT landscape veils of 63.2, 59.2, 51.4 and 58.0. The real image
reads up to 76 on cyan: closest to the limit, still under it.

What the frames show, after looking at all 16 and the crops:

- **Nozzle core:** four white-hot points at the nozzles on both cars, every skin, both views.
- **Tongues:** clear in portrait, where the camera is above the road and sees the jets from the side: torn flame
  tongues down each jet. In landscape the camera sees the jets nearly end-on, so tongues read only as streaks inside
  four straight beams. That is the camera's geometry. Not tuned further: R's tile scale (`m*.5`) is the only lever
  that keeps every limit, and changing it would re-tune the portrait look that reads well now.
- **Sparks:** small points beside the jets, in the skin's colour (cyan on cyan, red on red). They are small, as
  `evidence-sparks.md` describes. The render-order lever named there was not needed.
- **White wash:** none over either car's rear. The Crimson GT shows an orange-white hotspot on its rear deck and
  roof; the `-no-exhaust` frames show it with `Rear ports` hidden too, so it is the car's own lighting, not the
  exhaust.

## For the other sessions (files outside this branch's list)

- **Exhaust session, `src/nitro-flame-texture.ts`:** `FLAME_CYCLES` should become `{ r: 3, g: 11, b: 3 }` to match
  the image. The new guard reads the image itself, so the 3 Hz limit holds either way. When the texture moves to its
  shipped path, the guard follows `NITRO_FLAME_PATH`.
- **`.claude/rules/sprint-plume.md` Modes row "NITRO with a trail skin":** add that the base jets drop to 20%
  brightness (the shader evidence asked for this; not edited here).
- **Open decision, chained NITRO:** the trail clock runs `1 + chain * .5`, and the Hz guards read the base clock. At
  chain 1 the texture scrolls reach 4.5 Hz (R) and 4.46 Hz (G), and the existing red dash reaches 4.0 Hz. Holding
  3 Hz on the chained clock would mean `.r` .67 and `.gb` .18. This is the coordinating session's call.

## Not run

- A frame-cost run on an idle machine: the load average stayed 23 to 108, so cost was judged by interleaved A/Bs.
- `make verify`, the full `npm run test:browser`, and the World Tour long-run.
- A real phone (`make phone-diag`). Every capture is desktop Chromium at phone sizes; iOS Safari and the image's
  first upload on a phone are unmeasured.
- GitHub `quality-gate`: this branch is not pushed.
- Garage trial build (`node scripts/build-garage-browser.mjs`); Garage, Home showroom and Preview Studio with the
  real image.
- Low and Medium captures; tracks other than Coast; night and wet roads; chained NITRO captures.
