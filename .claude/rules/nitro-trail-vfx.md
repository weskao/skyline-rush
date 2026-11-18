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

- **No large area changes faster than 3 Hz.** A pattern scrolled by `time*N` repeats N times a second at one pixel
  (`fract`, `floor`, `step`), or N/2π inside `sin`. The whole plume, the halo, the road glow and every pulse, dash
  or ember stay ≤ 3 Hz (`fract(u*3.-time*2.)`, not `fract(u*5.-time*3.2)`). Pulses dip to ~50%, never to off;
  edges are `smoothstep`, not `step`.
- **Speed comes from thin fast flow, not from glow.** Holding *everything* to 3 Hz plus a wide soft halo made the
  trails look slow (2026-11-19). Flash limits (WCAG 2.3.1, Harding) target large, high-contrast changes, so thin
  streaks on the core axis may race back up to 12 Hz through `flow()` (`1.+.18*sin(x)`: at most ±20%). Only the
  streaks use `flow()`; never the halo or road glow. Length tells speed: the trail stretches with car speed
  (`update(…, speed)`), from 3 m to 17 m at `MAX_SPEED`.
- **Colour caps at `vec3(1.2)`** (`min(col*…, vec3(1.2))`): only the thin core crosses the 1.1 bloom
  threshold in `world.js`. Raise a skin's punch with saturation or shape, never with a bigger multiplier.
- **One side only** (`FrontSide`): the open tube's back wall doubled every pixel's glow and its overdraw.
- A palette entry in `garage-skin-palette.ts` above 1 is fine: the cap does the limiting.
- **Richness comes from layers and contrast, not brightness.** Capping the glare left the trails flat (2026-11-18),
  so each skin stacks a thin white-hot core over a dark rim, cooling down the tail, fixed shock diamonds, a tight
  halo (`NITRO trail halo`, ≤ 1.4× the streak, faint while cruising, bright only for the ignition swell) with
  drifting embers, and one ignition swell per NITRO start, never a repeating pulse.
  A new skin adds a layer or a shape before it adds a multiplier.

Guard: `tests/nitro-trail-comfort.test.js` (flicker Hz per `time*N`, with `flow()` the only fast term and only on
the streaks; the colour cap, one side, for streaks, halo and road glow; length grows with speed; the halo shell; one
ignition swell per start; Low drops the halo). A new trail style or a new animated term keeps it green; never widen
its 3 Hz, 12 Hz, ±20% or 1.2 limits to pass.
