# NITRO realistic flame: integration acceptance
Status: blocked: held-NITRO frame cost could not be measured (machine load 100 to 200 from parallel sessions; see "Frame cost")

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
| `PLAYWRIGHT_PORT=5248 PLUME_BENCH=1 LABEL=acceptance VIEWPORT=1440x900 npx playwright test tests/sprint-plume-cost-browser.spec.js` | 1 passed at load 142 to 160. p50 / p95 ms, calls: Low 11.3 / 15.5, 298; Medium 12.8 / 15.3, 185; High 12.5 / 14.9, 199. Not comparable to a budget (see below). |
| Same with `VIEWPORT=844x390` (three runs, each alone) | Failed in fixture setup every time: `Test timeout of 45000ms exceeded while setting up "gameplayPage"`, waiting for `#start-button`. Vite logged "Failed to scan for dependencies". Load was 101 to 155. |

## Frame cost (not measured)

The budget in `.claude/rules/sprint-plume.md` is a held-NITRO median rise of at most 5% or 0.3 ms, from a before
and an after taken on the same machine. Other sessions kept 54 Chrome renderers busy, and the load average never
fell below 100 during this session; a 25-minute wait for it to drop below 30 timed out at 117.

- At 1440x900 the one run read about twice the sparks session's numbers (Low 5.5, Medium 9.9, High 9.0 ms, taken at
  load 30 to 80). That gap is machine load, not a regression.
- An interleaved A/B was written for the one cost this integration adds: the real image against the neutral 1 x 1
  texel, with the cyan skin equipped and the order real, neutral, neutral, real. It is a throwaway spec, not
  committed. It failed the same fixture setup at both viewports (load 137 to 199).
- `tests/sprint-plume-cost-browser.spec.js` equips no trail skin, so the texture is never sampled there. On that path
  the merge adds only the sparks, which `evidence-sparks.md` measured as no cost above noise.
- With a skin, the shader session measured the stand-in image interleaved and found no cost above noise. That
  image had the same 512 x 512 size and the same sampling.
- Neither of those two measurements replaces this one.

To unblock, on a quiet machine run both viewports, plus the interleaved real-vs-neutral texture A/B with a skin
equipped:

```bash
PLAYWRIGHT_PORT=5248 PLUME_BENCH=1 LABEL=acceptance VIEWPORT=844x390 npx playwright test tests/sprint-plume-cost-browser.spec.js
PLAYWRIGHT_PORT=5248 PLUME_BENCH=1 LABEL=acceptance VIEWPORT=1440x900 npx playwright test tests/sprint-plume-cost-browser.spec.js
```

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

- Held-NITRO frame cost at 844x390 (all tiers), and a budget judgement at 1440x900: machine load (above).
- `make verify`, the full `npm run test:browser`, and the World Tour long-run.
- A real phone (`make phone-diag`). Every capture is desktop Chromium at phone sizes; iOS Safari and the image's
  first upload on a phone are unmeasured.
- GitHub `quality-gate`: this branch is not pushed.
- Garage trial build (`node scripts/build-garage-browser.mjs`); Garage, Home showroom and Preview Studio with the
  real image.
- Low and Medium captures; tracks other than Coast; night and wet roads; chained NITRO captures.
