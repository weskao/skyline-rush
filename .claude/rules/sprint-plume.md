---
paths:
  - "src/sprint-plume.ts"
  - "src/garage-nitro-trail.js"
  - "tests/garage-nitro-trail.test.js"
  - "tests/sprint-plume.test.js"
---

# Sprint plume: fat where the camera sees it, under the bloom threshold

`src/sprint-plume.ts` draws the NITRO/BOOST exhaust: per rear port an additive jet (`Cold gas nozzle N`), one
instanced nozzle flare, plus one road glow. Every part blends additively: the exhaust is light, never a surface. Every part is a child of the
`Rear ports` group, so `src/garage-model.ts` places it on each car's nozzles (race, Garage, Home, Coming Soon).
`src/aero-vfx.js` fills one reused `PlumeFrame` per frame; the plume writes uniforms only.

## Traps (each has a guard)

- **Thin, additive-only, gated (2026-11-14).** Each jet left at a 6.5 cm radius and stayed 0.095 to 0.136 m
  wide over its first 0.6 m (15 to 19 px on a phone, about 8 px at the nozzle), additive only, so it washed
  out on a sunlit road; the nozzle glows and the board plume sat behind `?look=3d` (historical; gate removed), the road glow behind a trail
  skin. On the phone tier (2 cores: Low + Realistic) the exhaust changed 1 to 3% of the frame. Now: radius at
  least 0.20 m by 0.6 m (`plumeRadius`, `PLUME.fat`/`half`) whatever the tail length, tier or preset; flare and
  road glow in the default look (a normal-blended core was tried too, then removed: see *Solid core bar*). Guards: `tests/sprint-plume.test.js` (*flame shape*, *phone width*:
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

- **Solid core bar (2026-11-16, removed).** An instanced core tube per nozzle (9 cm wide, 1.8 m long, normal blending,
  alpha 0.85) was added so daylight could not wash the exhaust out. Seen from the chase camera or the Garage it read as
  a solid grey bar inside each nozzle ring on the Standard, Ion and Plasma thrusters (Void pulse hides the jets). The
  fat additive jet already carries the visibility on its own, so the core is gone. Never put a normal-blended mesh in
  the plume. Guard: `tests/sprint-plume.test.js` (*no solid bar in the nozzle*).

- **A smooth cone at every tier (2026-11-21).** After the glare fixes the jet was `sin` envelopes only: one flat
  beam, and BOOST, NITRO and NITRO with BOOST held differed by length and gold alone. Each skin's look was an
  `if(skinPattern>N)` line written by hand in the shader, so a new skin meant a shader edit. Mechanism: the jet
  samples the shared flame texture through `src/nitro-flame-texture.ts` (R tears the body into tongues and erodes
  the tip, G grains it, B is the thin racing filaments), and both looks are data in `src/sprint-plume-looks.ts`:
  one `THRUSTER_LOOKS` row per skin (the `look` uniform, plus the envelope select generated from the row) and one
  `TIER_LOOKS` row per sprint tier (the `tier` uniform, eased). `src/aero-vfx.js` passes `PlumeFrame.tier` from
  `sprintTier()`; the plume never re-derives it. Guard: `tests/sprint-plume-flame.test.js`. Traps inside it:
  - **A scrolled texture is a flicker frequency** (`nitro-trail-vfx.md`). The flame scrolls on its own `clock`
    uniform, which advances at most one second per second (`TIER_LOOKS[tier].flow + CHAIN_FLOW * chain`, capped
    at 1), so `clock*N` x `FLAME_CYCLES` stays at or under 3 Hz at every tier and chain; only `flow()` on the
    filaments runs faster (under 12 Hz, +-20%). A faster tier raises `flow` in the table, never the shader's `N`.
    The clock stops with the frame time (Reduced Motion / Comfortable).
  - **A tier or a chain never adds light.** `core`, `tongues`, `sheath` and `taper` move where the light sits; the
    `light` line, `vSpread`, `glare` and the no-channel-over-1 scale are unchanged, and a chain changes the clock
    only. The combined tier's second layer is the `--boost` colour mixed into the body, not an added term.
  - **The sampler exists from creation** and is one shared uniform object on all four jets (`clone()` copies
    uniforms, so `flame`, `look` and `tier` are re-assigned after it). On the neutral 1 x 1 texel the jet is the old
    smooth cone at 75% alpha: acceptable while the image loads or if it never does.
  - **The image ships in every build.** `public/feature-assets/nitro-flame/flame-noise.png` (293,450 bytes,
    requested once when the first exhaust is created) sits outside `garage-vfx-skins/`, which the locked build
    deletes. Guard: `tests/nitro-flame-texture.test.js` (*the path ships in the locked build*).
  - **Void pulse hides the jets** (its beams, `src/garage-void-beams.js`), so its row shows only where the jets do.

## Looks (data: `src/sprint-plume-looks.ts`)

A new thruster skin is one `THRUSTER_LOOKS` row at its catalog index; a new tier is one `TIER_LOOKS` row keyed by
its `SprintTierId`. Colour stays in `src/garage-skin-palette.ts` and the `:root` tokens.

| Tier | Core falloff | Tongues | Sheath | Taper | Flow |
| --- | --- | --- | --- | --- | --- |
| idle (spool-down, showroom rest) | 10 | 0.45 | 0 | 1.9 | 0.4 |
| BOOST | 9 | 0.6 | 0 | 1.7 | 0.55 |
| NITRO | 6.5 | 0.85 | 0 | 1.5 | 0.75 |
| NITRO with BOOST held | 5 | 1 | 1 (red-orange) | 1.35 | 0.9 |
| x2 / x3 chain | same | same | same | same | + 0.25 x chain, at most 1 |

## Modes

| State | Jets | Flare | Road glow |
| --- | --- | --- | --- |
| VFX Off, or power 0 | off | off | off |
| Low (quality 0.25) | on, full light (no bloom) | on | off |
| Medium, High | on | on | on |
| Airborne, or not racing (Garage, Home) | on | on | off |
| Void pulse skin | off (its beams) | on | as above |
| Reduced Motion / Comfortable (`calm`) | on, both clocks frozen (the flame holds one still shape) | x0.6, no flicker | off for NITRO, x0.6 for BOOST |
| Parked showroom (Garage Home, phase `ready`) | BOOST tier, or NITRO while a trail skin previews | on | off |
| Showroom that drives a racing car (Garage Inspect, Coming Soon; phase `racing`) | the driver's tier, as in a race | on | off |
| NITRO with a trail skin (not calm) | thick fades to the old cone | on | fades to 0 |

- **Trail-skin cross-fade.** While a trail skin's streaks show, the jets' thickness and the road glow
  fade with `nitroMix` (no hard swap) so nothing stacks to white; BOOST and calm modes keep the base plume.
- **Showroom pulse (2026-11-16).** Garage/Home ran the plume at a 0.32 strength floor and speed 0: about 0.8 m,
  17% of a race NITRO, so the exhaust length slider showed nearly nothing there. Every showroom (`studioDemo`:
  Garage/Home, Preview Studio, showcase) now loops the jets with the 2.2 s ignition demo (`showroomPulse`,
  `SHOWROOM`): from `idle` (a quarter) up to the length the Studio's `SHOWROOM.speed` driver gets, and back; brightness
  follows from `idlePower` to 1. Reduced Motion / Comfortable: no pulse (Studio holds the full length). Races never
  pulse. Guards: `tests/sprint-plume.test.js` (*showroom plume* x2).
- **A showroom with a driver burns the driver's tier (2026-11-21).** The Garage tier control chose NITRO + BOOST
  and the Inspect jets drew NITRO: the showroom branch named the tier from `jet.nitroMix` alone, which can never
  be `nitro-boost`. `jet.tier` now reads the driver whenever the race is `racing`, showroom or not; only a parked
  showroom keeps the fixed burn. Guard: `tests/sprint-plume-flame.test.js` (*a showroom that drives a racing
  car*), RED on the old line (`6.5,0.85,0,1.5 vs 5,1,1,1.35`).
- **NITRO trail glare (2026-11-18).** Additive exhaust, the reflection and post-process bloom overlap.
  Gold moves bands through a steady nozzle and reflection. Red uses soft envelopes on both meshes.
  Keep the NITRO bloom contribution bounded and fed by `frame.lightPower` before chain scaling, including
  the additive airflow opacity. `frame.power` can still stretch reach and accelerate the trail. Low keeps
  its nozzle contrast without bloom. Both road reflections use the same contact-plane placement.
  Guards: `tests/garage-nitro-trail.test.js`, the standard nozzle in `tests/sprint-plume.test.js`, and
  the Comfort-mode static artwork in `tests/garage-vfx-catalog-browser.spec.js`.
- **Lean.** The road glow lies on the road plane through the car's contact-shadow plane (`ground`) while the car
  banks and squats, and moves back onto that plane 6 m behind it (`launch-flare-rendering.md`). Guard: *lean*.

## Budget

- At most two draw calls beyond the four jets: instanced flare, road glow. All exist hidden
  from creation, so `warmupShaders` compiles them (`performance-review.md`); per frame, uniforms only, no
  allocation. A new part is a third draw call: measure it first.
- Frame cost: a held NITRO on Coast at 844x390 and 1440x900, Low/Medium/High; the median may rise by at most
  5% or 0.3 ms, whichever is larger. Over budget: cut overdraw first (glow size, core length).

## Evidence commands (gitignored output under `docs/designs/3d-pipeline/audits/`)

```bash
# Frames, plume box, contrast, area, veil; LABEL=after* asserts the acceptance numbers.
PLAYWRIGHT_PORT=5231 SPRINT_CAMERA_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|portrait|landscape [CORES=2|4] \
  [HERO_CAR=crimson-gt] pnpm exec playwright test tests/sprint-camera-capture-browser.spec.js
# GPU-synced frame cost per tier.
PLAYWRIGHT_PORT=5231 PLUME_BENCH=1 LABEL=<x> VIEWPORT=844x390|1440x900 \
  pnpm exec playwright test tests/sprint-plume-cost-browser.spec.js
```

Both serve live source through Vite: a `src/` edit during a run voids it. CORES=2|4 seeds the settings a phone
picks for itself (`src/device-quality.ts`); unset keeps the desktop browser's High.
