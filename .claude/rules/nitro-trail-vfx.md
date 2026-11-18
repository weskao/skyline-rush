---
paths:
  - "src/garage-nitro-trail.js"
  - "src/garage-skin-palette.ts"
  - "tests/nitro-trail-comfort.test.js"
---

# NITRO trail skins: flow, don't strobe; a thin hot core, not a glaring plume

`src/garage-nitro-trail.js` draws the four Garage NITRO trail skins (cyan laser, golden pulse, crimson dash,
nebula ribbon) as additive tubes behind every rear port, plus a road glow. They shipped painful to look at:
the colour reached 4× the bloom threshold, both tube walls added up (`DoubleSide`), the golden pulse strobed the
whole plume at 3.2 Hz, the crimson dashes switched hard on/off at 7 Hz and white glints flickered at 22 Hz —
all inside the 3–30 Hz photosensitive flash band, centre-screen behind the chase camera.

Big racing games keep NITRO exciting with saturated colour, a thin bright core and energy that *travels* along
the trail; brightness changes stay slow and partial. Keep it that way:

- **No pixel flickers faster than 3 Hz.** A pattern scrolled by `time*N` repeats N times a second at one pixel
  (`fract`, `floor`, `step`), or N/2π inside `sin`. Keep the visible speed by lowering the spatial frequency
  with it (`fract(u*3.-time*2.)`, not `fract(u*5.-time*3.2)`). Pulses dip to ~50%, never to off; edges are
  `smoothstep`, not `step`.
- **Colour caps at `vec3(1.2)`** (`min(col*…, vec3(1.2))`): only the thin core crosses the 1.1 bloom
  threshold in `world.js`. Raise a skin's punch with saturation or shape, never with a bigger multiplier.
- **One side only** (`FrontSide`): the open tube's back wall doubled every pixel's glow and its overdraw.
- A palette entry in `garage-skin-palette.ts` above 1 is fine: the cap does the limiting.
- **Richness comes from layers, not brightness.** Capping the glare left the trails flat (2026-11-18), so each skin
  stacks a hot core cooling down the tail, fixed shock diamonds, a dim wide halo (`NITRO trail halo`, peaking off the
  core so it never piles onto it) with drifting embers, and one ignition swell per NITRO start, never a repeating pulse.
  A new skin adds a layer or a shape before it adds a multiplier.

Guard: `tests/nitro-trail-comfort.test.js` (flicker Hz per `time*N`, the colour cap, one side, for streaks, halo
and road glow; one ignition swell per start; Low drops the halo). A new trail style
or a new animated term keeps it green; never widen its 3 Hz or 1.2 limits to pass.
