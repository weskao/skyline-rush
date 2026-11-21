---
paths:
  - "src/garage-nitro-trail.js"
  - "src/nitro-flame-texture.ts"
  - "src/aero-vfx.js"
  - "src/garage-skin-palette.ts"
  - "tests/nitro-trail-comfort.test.js"
  - "tests/garage-nitro-trail.test.js"
  - "tests/nitro-flame-texture.test.js"
---

# NITRO trail skins: flow, don't strobe; a thin hot core, not a glaring plume

`src/garage-nitro-trail.js` draws the four Garage NITRO trail skins (cyan laser, golden pulse, crimson dash,
nebula ribbon) as additive tubes behind every rear port, plus a road glow. They shipped painful to look at:
the colour reached 4× the bloom threshold, both tube walls added up (`DoubleSide`), the golden pulse strobed the
whole plume at 3.2 Hz, the crimson dashes switched hard on/off at 7 Hz and white glints flickered at 22 Hz —
all inside the 3–30 Hz photosensitive flash band, centre-screen behind the chase camera.

Big racing games keep NITRO exciting with saturated colour, a thin bright core and energy that *travels* along
the trail; brightness changes stay slow and partial. Keep it that way:

- **No large area changes faster than 3 Hz.** A pattern scrolled by `time*N` repeats N times a second at one pixel
  (`fract`, `floor`, `step`), or N/2π inside `sin`. The whole plume, the halo, the road glow and every pulse, dash
  or ember stay ≤ 3 Hz (`fract(u*3.-time*2.)`, not `fract(u*5.-time*3.2)`). Pulses dip to ~50%, never to off;
  edges are `smoothstep`, not `step`.
- **Speed comes from thin fast flow, not from glow.** Holding *everything* to 3 Hz plus a wide soft halo made the
  trails look slow (2026-11-19). Flash limits (WCAG 2.3.1, Harding) target large, high-contrast changes, so thin
  streaks on the core axis may race back up to 12 Hz through `flow()` (`1.+.18*sin(x)`: at most ±20%). Only the
  streaks use `flow()`; never the halo or road glow. Length tells speed: the trail stretches with car speed
  (`update(…, speed)`), from 3 m to 17 m at `MAX_SPEED`.
- **Colour caps at `vec3(1.2)`** (`min(col*…, vec3(1.2))`). Raise a skin's punch with saturation or shape, never
  with a bigger multiplier.
- **Only the nozzle core passes the bloom threshold** (1.1 in `world.js`). The streak's light is normalised to
  `.66`; the one term added after that line is `white`, the white-hot core at each nozzle. Its bound: it ends
  0.3 m behind the nozzle and wherever the jet is wider than 0.16 m, so four cores seen side-on cover at most
  0.75% of a phone frame (0.62% at 844x390, 0.67% at 390x844); from the chase camera they are a few pixels each.
  Its brightness has no `time`, `ignite`, `flow()`, `hash()`, texture or `power` term: a core that pulses is a
  flash at the bloom threshold. Nothing else may be added after the `.66` line.
- **One side only** (`FrontSide`): the open tube's back wall doubled every pixel's glow and its overdraw.
- A palette entry in `garage-skin-palette.ts` above 1 is fine: the cap does the limiting.
- **Richness comes from layers and contrast, not brightness.** Capping the glare left the trails flat (2026-11-18),
  so each skin keeps its signature motion (filament, travelling bands, soft dashes, twin ribbons) over the fast
  core flow, a tight halo (`NITRO trail halo`, ≤ 1.4× the streak, faint while cruising, bright only for the ignition
  swell) with drifting embers, and one ignition swell per NITRO start, never a repeating pulse.
  A new skin adds a layer or a shape before it adds a multiplier.
- **Shape comes from the flame texture, not from `sin` and a hash** (2026-11-20). Three glare fixes left the
  streak flat: smooth functions only, at 0.66. `src/nitro-flame-texture.ts` is the only module that names the
  image (`flame-noise.png`, contract in `docs/designs/nitro-flame/DESIGN.md`). Two modules import it:
  `garage-nitro-trail.js` and `src/sprint-plume.ts` (the standard exhaust), so the image ships in the locked build
  from `public/feature-assets/nitro-flame/`. R tears the body into tongues and erodes its edge, G
  roughens the edge, B is the thin hot filaments on the core. Traps:
  - **A scrolled texture is a flicker frequency.** A sample scrolled along V by `time*N` changes one pixel
    N x (light-dark cycles per tile along V) times a second. `FLAME_CYCLES` (r 3, g 11, b 3) states what the
    shader assumes of the image; N x the busiest channel read stays ≤ 3 Hz. A busier image raises `FLAME_CYCLES`
    and lowers the scroll, never the limit. U never scrolls. Halo and road glow do not sample it. Trap
    (2026-11-21): the shader was tuned on a stand-in image; the shipped `flame-noise.png`'s busiest columns hold
    R 3, G 11, B 3 cycles a tile at the shader's own dark/light levels, so `.r` at 1.2 reached 3.6 Hz. Scrolls
    are now `.r` 1.0 and `.gb` .27. Guard: *the real flame image, scrolled as the shader scrolls it* (reads the
    PNG; RED at 3.60 Hz on the old scroll).
  - **The sampler exists from creation** (a neutral 1 x 1 mid-grey `DataTexture`); the image replaces the
    uniform's *value* on the first skin use, so the warmed-up program is kept. On the neutral texel the jet is
    smooth and whole: it must look acceptable there (image missing, slow network).
  - **Scale patterns in metres (`u*trailLength`), not `u`.** The chase camera shows only the first 3 to 4 m of
    a 17 m trail; a pattern laid over `u` puts a fraction of one cycle on screen.
  - **`vFacing` peaks near 0.3 seen end-on**, so `pow(f, n)` shapes are nearly dark from the chase camera. The
    body uses `rim = f / vAxis` (1 on the jet's centre line, 0 at its silhouette, `vAxis` from the vertex shader).
  - **The base exhaust cone hid the flame.** Under a trail skin the sprint-plume jets (`Cold gas nozzle N`) kept
    their full light; their smooth additive fill covered every tongue, and the look read as one flat beam.
    `src/aero-vfx.js` holds the cone at 20% while the trail's streaks are visible (BOOST and calm modes show no
    trail and keep the plume). Guard: *the base exhaust cone stays faint* in `tests/garage-nitro-trail.test.js`.
  - **No particles here.** Sparks belong to `src/effects.js`.
- **Sparks are judged in the chase camera, not in the car's frame.** Trap (2026-11-20): NITRO sparks at 12 to
  24 m/s passed every unit test and showed in no live frame. The NITRO chase eye is under 4 m behind the
  nozzles, so a fast spark passes the lens in 0.2 s, and the additive jets wash out a spark that stays inside
  them. Mechanism: `src/nitro-sparks.ts` keeps exit speed low, lives at 0.3 s or less and fans each port to its
  own side; chained NITRO scales speed only. A change to spark speed, life or size, or to `RACE_CAMERA.chase` /
  `chasePortrait`, re-runs the guard and a real WebGL capture in both orientations. Guard:
  `tests/nitro-sparks.test.js` (*a spark spends its whole life in front of the chase camera, inside the frame,
  in landscape and portrait*), RED on the fast tuning (`1.35 m from the lens`).
- **The spark budget is 8 / 12 / 19 live sparks (Low / Medium / High) of the pool's 480**, at most 4 per frame.
  A new emitter in the shared pool states its own budget the same way. Guard: *the spark budget cannot starve
  the shared particle pool*.
- **Glare limits from `.claude/rules/sprint-plume.md` still hold** (merged 2026-11-20): the streak keeps its
  `.66` exposure normalisation and `.76` alpha cap; the road glow stays compact (≤ 1.65 × 6), steady (no `time`)
  and on the ground only; gold has no global brightness pulse; chained NITRO adds length and travel speed, never
  light. Guard: `tests/garage-nitro-trail.test.js`.

Guard: `tests/nitro-trail-comfort.test.js` (flicker Hz per `time*N`, with `flow()` the only fast term and only on
the streaks; the colour cap, one side, for streaks, halo and road glow; length grows with speed; the halo shell; one
ignition swell per start; Low drops the halo; texture scroll Hz per channel; the nozzle core's steadiness and
screen area) and `tests/nitro-flame-texture.test.js` (neutral fallback, one request, one home for the path). A new
trail style or a new animated term keeps it green; never widen
its 3 Hz, 12 Hz, ±20% or 1.2 limits to pass.
