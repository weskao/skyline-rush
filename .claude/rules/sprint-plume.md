---
paths:
  - "src/sprint-plume.ts"
  - "tests/sprint-plume.test.js"
---

# Sprint plume: fat where the camera sees it, under the bloom threshold

`src/sprint-plume.ts` draws the NITRO/BOOST exhaust: per rear port an additive jet (`Cold gas nozzle N`), one
instanced opaque-looking core, one instanced nozzle flare, plus one road glow. Every part is a child of the
`Rear ports` group, so `src/garage-model.ts` places it on each car's nozzles (race, Garage, Home, Coming Soon).
`src/aero-vfx.js` fills one reused `PlumeFrame` per frame; the plume writes uniforms only.

## Traps (each has a guard)

- **Thin, additive-only, gated (2026-11-14).** Each jet left at a 6.5 cm radius and stayed 0.095 to 0.136 m
  wide over its first 0.6 m (15 to 19 px on a phone, about 8 px at the nozzle), additive only, so it washed
  out on a sunlit road; the nozzle glows and the board plume sat behind `?look=3d`, the road glow behind a trail
  skin. On the phone tier (2 cores: Low + Realistic) the exhaust changed 1 to 3% of the frame. Now: radius at
  least 0.20 m by 0.6 m (`plumeRadius`, `PLUME.fat`/`half`) whatever the tail length, tier or preset; four
  cores (`coreRadius`, at most 0.09 m, 10 cm apart) drawn with normal blending so daylight cannot wash them;
  flare and road glow in the default look. Guards: `tests/sprint-plume.test.js` (*flame shape*, *phone width*:
  at least 28 px wide 0.6 m behind the nozzles in both phone orientations, *the real jets carry the profile*).
- **White-out from the fat jet (2026-11-14).** The fat jet first carried the thin cone's HDR gain
  (`brightness x (1 + core + cells)`, up to 4.5) over its whole width. Two faces per jet and the overlapping
  neighbours summed past the bloom threshold (1.1); paused, the frame read well, but racing, the NITRO bloom
  boost (`world.js`, live only) spread it into a white wash over the car's rear and merged the four jets.
  Measured `veil` (how far the exhaust moves the car's rear face from its bare colour, 0 to 255): 268 Roadster
  and 296 GT; 50 to 58 after; 9 to 17 for the old thin cone. Mechanism: the jet's light is spread over the fat
  disc (`vSpread = cone² / radius²`, the chase camera sees the jet end-on), the fat flame emits half, and no
  fragment exceeds 1. A per-fragment cap alone left 88 and 115: the sum is the problem, not one fragment.
  Guard: `tests/sprint-plume-veil-browser.spec.js` (both cars, landscape phone, High, live NITRO, `veil` at
  most 80). Judge any brightness change in a racing frame, never in a paused one.
- **Bloom-only fix that starved the phone (2026-11-16).** Bloom runs above Low only (`configureBloom`,
  `src/upcoming-lighting.ts`), but the white-out dimming applied on every tier: the 2-core phone tier (Low + Realistic)
  then showed 1.2 to 1.6x the old cone's exhaust area on a landscape BOOST, under the 2x floor. Mechanism: the `glare`
  uniform (1 above Low) gates the dimming; on Low the jet keeps full light and a denser tail (its own halo), each
  colour scaled so no channel passes 1 (a per-channel clamp turned NITRO white). A held BOOST drives the jets by
  `sqrt(power)`. Guards: `tests/sprint-plume.test.js` (*only where bloom runs*), the veil spec on High, and the capture
  spec's CORES=2 floor. A dimming aimed at one tier's post-processing is gated on that tier.
- **Uniform lost in a trailing comment (2026-11-16).** `u.power = …; // comment u.tail = frame.tail;` kept the
  jets' `tail` at 0, so the board plume's magenta fade never lit; no test read the jets' uniforms back. One
  statement per comment's line. Guard: *every frame value reaches every jet*.

## Modes

| State | Jets | Core | Flare | Road glow |
| --- | --- | --- | --- | --- |
| VFX Off, or power 0 | off | off | off | off |
| Low (quality 0.25) | on, full light (no bloom) | on | on | off |
| Medium, High | on | on | on | on |
| Airborne, or not racing (Garage, Home) | on | on | on | off |
| Void pulse skin | off (its beams) | off | on | as above |
| Reduced Motion / Comfortable (`calm`) | on, clock frozen | on | x0.6, no flicker | x0.6 |
| NITRO with a trail skin (not calm) | thick fades to the old cone | alpha fades to 0 | on | fades to 0 |

- **Trail-skin cross-fade.** While a trail skin's streaks show, the jets' thickness, the core and the road glow
  fade with `nitroMix` (no hard swap) so nothing stacks to white; BOOST and calm modes keep the base plume.
- **x3 chain.** `frame.power` reaches 1.4; flare size, core alpha and the jets' `power` clamp at 1 (the veil spec
  runs at chain 1 only, so an unclamped jet would add ~18% light past its guard).
- **Lean.** The road glow lies on the road plane through the car's contact-shadow plane (`ground`) while the car
  banks and squats, and moves back onto that plane 6 m behind it (`launch-flare-rendering.md`). Guard: *lean*.

## Budget

- At most three draw calls beyond the four jets: instanced core, instanced flare, road glow. All exist hidden
  from creation, so `warmupShaders` compiles them (`performance-review.md`); per frame, uniforms only, no
  allocation. A new part is a fourth draw call: measure it first.
- Frame cost: a held NITRO on Coast at 844x390 and 1440x900, Low/Medium/High; the median may rise by at most
  5% or 0.3 ms, whichever is larger. Over budget: cut overdraw first (glow size, core length).

## Evidence commands (gitignored output under `docs/designs/3d-pipeline/audits/`)

```bash
# Frames, plume box, contrast, area, veil; LABEL=after* asserts the acceptance numbers.
PLAYWRIGHT_PORT=5231 SPRINT_CAMERA_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|portrait|landscape [CORES=2|4] \
  [HERO_CAR=crimson-gt] npx playwright test tests/sprint-camera-capture-browser.spec.js
# GPU-synced frame cost per tier.
PLAYWRIGHT_PORT=5231 PLUME_BENCH=1 LABEL=<x> VIEWPORT=844x390|1440x900 \
  npx playwright test tests/sprint-plume-cost-browser.spec.js
```

Both serve live source through Vite: a `src/` edit during a run voids it. CORES=2|4 seeds the settings a phone
picks for itself (`src/device-quality.ts`); unset keeps the desktop browser's High.
