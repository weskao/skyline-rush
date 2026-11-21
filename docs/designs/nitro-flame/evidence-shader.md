# NITRO flame shader: evidence (branch `feature/nitro-flame-shader`)

Scope: the textured burning jet in `src/garage-nitro-trail.js`, the loader `src/nitro-flame-texture.ts`, their
guards and the rule `.claude/rules/nitro-trail-vfx.md`. Measured 2026-11-20 on Chromium, ANGLE Metal, Apple M4,
Coast, Roadster unless a row says otherwise. Other sessions were running on the same machine throughout.

## What changed

- The streak samples the contract texture twice: R (tongues, eroded edge) scrolled at 1.2, and GB (edge
  roughness, hot filaments) scrolled at .35. Patterns are scaled in metres behind the nozzle, and the body uses a
  view-normalised profile (`rim`), because the chase camera sees each tube almost end-on.
- A steady white-hot core at each nozzle is the one light added after the `.66` normalisation.
- The loader returns a neutral 1 x 1 `DataTexture` at once and swaps the uniform's value when the image loads.
- **One file outside the allowed list: `src/aero-vfx.js`, one line (379 lines before and after).** Under a trail
  skin the base sprint-plume jets (`Cold gas nozzle N`) kept their full light; their smooth additive fill covered
  every tongue, so the composite read as one flat beam whatever the trail drew. The line holds the base jets'
  `brightness` at 20% while the trail's streaks are visible. BOOST, Reduced Motion and Comfortable show no trail
  and are unchanged. `src/sprint-plume.ts` is untouched.

## RED, then GREEN

| Step | Command | Result |
| --- | --- | --- |
| RED, loader present, shader unchanged | `node --test tests/nitro-flame-texture.test.js tests/nitro-trail-comfort.test.js tests/garage-nitro-trail.test.js` | 24 pass, 4 fail: sampler from creation, one home for the path, texture scroll, nozzle core |
| RED, base-cone guard before the `aero-vfx.js` line | `node --test tests/garage-nitro-trail.test.js` | 13 pass, 1 fail: `nitro-trail-cyan: 1.5 of 1.5` |
| GREEN | `node --test tests/nitro-flame-texture.test.js tests/nitro-trail-comfort.test.js tests/garage-nitro-trail.test.js tests/shader-safety.test.js tests/sprint-plume.test.js tests/module-size.test.js` | 53 pass, 0 fail |

Before the loader file existed the three test files failed to load (`ERR_MODULE_NOT_FOUND`); the loader was written
first so the guards fail on their assertions.

## Final gates (run on the committed tree)

| Command | Result |
| --- | --- |
| `node --test tests/module-size.test.js` | 3 pass, 0 fail (`garage-nitro-trail.js` 140 lines, `aero-vfx.js` 379) |
| `npm test` | 3650 tests: 3646 pass, 0 fail, 4 skipped |
| `npm run typecheck` | exit 0 |
| `npm run build` | built; `Production coming-soon bundle checked`; no file under `dist/assets` names `flame-noise` or `nitro-flame` |
| `node scripts/build-garage-browser.mjs` | built; `Production trial bundle checked` |
| `PLAYWRIGHT_PORT=5242 npx playwright test tests/shader-warmup-browser.spec.js tests/black-frame-browser.spec.js tests/sprint-plume-veil-browser.spec.js --workers=1` | 8 passed (warm-up: Roadster and Crimson GT on Low and High; black frame: Low and High; veil: both cars) |

## Nozzle-core bound

- Shape: `white` ends 0.3 m behind the nozzle (`smoothstep(.05,.3,u*trailLength)`) and wherever the jet is wider
  than 0.16 m (`smoothstep(.11,.16,vWide)`), so an ignition swell or the gold band cannot widen it.
- Brightness: `mix(color, white, .75) * 1.2`, capped by `min(…, vec3(1.2))`. No `time`, `ignite`, `flow()`,
  `hash()`, texture or `power` term: the guard reads the identifiers of the `white` expression.
- Stated maximum screen area: four cores seen side-on (the worst case, 0.3 m x 0.32 m each) cover 0.62% of an
  844x390 frame and 0.67% of a 390x844 frame; the guard asserts at most **0.75%** on both.
- Measured in a live racing frame (chase camera, held NITRO): pixels the trail adds to the bloom bright pass, as a
  share of the half-resolution target.

| 844x390, DPR 2 | cyan | gold | red | purple |
| --- | --- | --- | --- | --- |
| Before, Medium / High | 0.002% / 0.002% | 0.001% / 0.008% | 0% / 0% | 0% / 0% |
| After, Medium | 0.060% | 0.046% | 0.009% | 0.012% |
| After, High | 0.051% | 0.037% | 0.012% | 0.012% |
| After, High, 390x844 | 0.033% | 0.025% | 0.006% | 0.006% |
| After, High, Crimson GT | 0.071% | 0.022% | 0.019% | 0.018% |

The live bloom threshold read back as 1.15 (strength 0.409); the rules say 1.1. Low has no bloom.

## Frame cost (trail skin equipped, held NITRO, p50 ms)

`sampleFrameCost(page, 6000)` per skin and tier, DPR 1. Budget: +5% or +0.3 ms, whichever is larger.
The first before and after sessions ran an hour apart and are not comparable: the unchanged stock-plume control
(`PLUME_BENCH=1 … tests/sprint-plume-cost-browser.spec.js`, no trail skin) moved from 6.7 to 8.6 ms on High at
844x390 and from 14.4 to 11.2 ms on Medium at 1440x900 between them. The numbers below come from interleaved runs
(old, new, new, old per viewport; HEAD's two source files restored for "old"): median of the eight p50 values
(four skins x two runs) per cell.

| Viewport | Tier | Before | After (512 stand-in texture) | Change |
| --- | --- | --- | --- | --- |
| 844x390 | Low | 3.6 | 3.7 | +0.1 |
| 844x390 | Medium | 5.6 | 5.5 | -0.1 |
| 844x390 | High | 6.0 | 6.05 | +0.05 |
| 1440x900 | Low | 7.0 | 6.6 | -0.4 |
| 1440x900 | Medium | 12.5 | 12.2 | -0.3 |
| 1440x900 | High | 12.15 | 12.4 | +0.25 (+2.1%), 16 values each |

- 1440x900 High: the first interleaved pass gave 12.0 before and 12.75 after (+6%, over budget); a second
  High-only pass (old, new, neutral, neutral, new, old) gave 12.55 before, 10.75 with the texture and 11.15 on the
  neutral 1 x 1. The table pools both. Run-to-run spread on this machine was about 1 ms, larger than any
  difference measured, so the result is "no cost above the noise", not a resolved figure.
- One cell stands out and is unexplained: cyan on High at 844x390 read 6.0 and 6.1 before, 7.3 and 6.9 after
  (+1.0 ms); gold, red and purple in the same runs were level or lower.
- Draw calls and triangles are unchanged (no new mesh; 185 to 203 calls in every run, before and after).
- Texture upload: one 512 x 512 RGB image with mipmaps, uploaded the first time a trail skin is set, not per frame.

## Look, in a live racing frame (844x390, DPR 2)

`veil` is the veil spec's measure (limit 80); `vsRoad` is the trail's contrast against the road beside it (0 to 255).

| Tier | Metric | cyan | gold | red | purple |
| --- | --- | --- | --- | --- | --- |
| Low | veil before / after | 2.4 / 4.4 | 1.4 / 1.4 | 1.4 / 2.2 | 1.7 / 2.4 |
| Low | vsRoad before / after | 230 / 189 | 221 / 198 | 206 / 155 | 207 / 178 |
| Medium | veil before / after | 1.7 / 10.7 | 0 / 8.8 | 0 / 3.0 | 0 / 3.0 |
| Medium | vsRoad before / after | 168 / 163 | 164 / 134 | 161 / 127 | 154 / 148 |
| High | veil before / after | 1.0 / 10.0 | 1.0 / 8.8 | 0 / 3.0 | 0 / 4.1 |
| High | vsRoad before / after | 174 / 157 | 161 / 146 | 156 / 131 | 159 / 156 |
| High, Crimson GT | veil before / after | 39.4 / 63.2 | 47.8 / 59.2 | 34.1 / 51.4 | 38.4 / 58.0 |

- The mean contrast against the road went down, most on red and on Low: the jet is now torn into tongues with
  dark gaps and the flat base cone under it is at 20%. The punch moved into shape and the nozzle core, as the
  design asks; whether red wants more body is a look decision for the integrated build with the real texture.
- The Crimson GT's veil rose by 11 to 24 and stays under 80.
- Neutral fallback (no image): smooth whole jets with the nozzle core; veil at most 10.5, vsRoad 142 to 223.

Captures (PNG, each skin; landscape on Low, Medium and High; portrait on High; Crimson GT on High; plus the
neutral fallback) are saved outside the repository; their paths are in the hand-off message.

## For integration

- **`FLAME_CYCLES` is an assumption about the art texture** (`r: 2, g: 8, b: 3` light-dark cycles per tile along
  V). The flicker guard multiplies the shader's scroll speeds by it (2.4 Hz and 2.8 Hz today). If the real image is
  busier along V in a channel, raise the value and lower the scroll in the shader; never the 3 Hz limit.
- **Orientation:** the shader reads V as the flow axis and U around the tube, as the contract says. A rotated
  image would turn tongues into rings.
- The image path does not exist on this branch: the request returns 404 and the trail stays on the neutral texel.
- The look was tuned on a locally generated stand-in noise image (not committed); re-check the look, the veil and
  the bright-pass area once the art image is merged.
- `.claude/rules/sprint-plume.md`, Modes table, row "NITRO with a trail skin": the jets now also drop to 20%
  brightness. That file is outside this session's list and was not edited.
- `tests/nitro-trail-comfort.test.js` copies the 12-line `pixelsPerMetre` projection helper from
  `tests/sprint-plume.test.js` (not exported there).

## Not run, not covered

- `npm run test:browser`, `make verify` and the GitHub `quality-gate` (no push from this branch).
- The three browser guards above do not equip a trail skin. With a skin, the veil and bright-pass numbers come from
  the throwaway look-dev spec (deleted before the gates); "no program compiles mid-race" and "no NaN" with a skin
  equipped rest on the unit guards (sampler from creation, value swap keeps the uniform, `tests/shader-safety.test.js`).
- No real phone: every capture is desktop Chromium at phone viewports. iOS Safari, a Low + Realistic 2-core
  device and the texture's first-upload hitch on a phone are unmeasured.
- Garage, Home showroom and Preview Studio were not captured (the same module draws them at power 0.85; the base
  cone is at 20% there too whenever the trail shows).
- Short trail at low speed (3 m) and chained NITRO were not captured.
- **Open comfort question, chained NITRO.** The trail clock runs `1+chain*.5` times faster while a chain adds
  power (unchanged code), and the Hz guard reads the base clock only. At a chain of 1 the texture scrolls reach
  3.6 and 4.2 Hz; the red dash that shipped before (`fract(u*5.-time*2.65)`) reaches 4.0 Hz the same way. The new
  scrolls follow that existing convention; whether the 3 Hz limit should hold on the chained clock is a decision
  for the coordinating session (it would mean scrolls of 1.0 and .25, and 2.0 for the red dash).
- Tracks other than Coast; night and wet roads.
