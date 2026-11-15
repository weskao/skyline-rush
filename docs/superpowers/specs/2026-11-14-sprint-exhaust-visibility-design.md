# Sprint exhaust visibility: a plume the chase camera can show, without a smaller car

Status: approved by the owner 2026-11-14, after a builder check. Branch `feature/sprint-exhaust-visibility`, on top of `e23f410a`.

## Intent

During NITRO and BOOST the rear exhaust is barely visible or not visible at all on a phone. The
owner wants to see it, and also wants the car to stay as close to the camera as it is now, so the
car never looks small on a phone screen. The fix must not buy exhaust visibility with distance.

## What was measured

Projected through the live rig (`src/race-camera.ts`), default settings, NITRO top speed:

| | Landscape 844 x 390 | Portrait 390 x 844 |
| --- | --- | --- |
| Car on screen | 16% of width, 33% of height | 38% of width, 15% of height |
| Nozzle row (0 top, 1 bottom) | 0.80 | 0.54 |
| Plume length inside the frame | 1.35 m (19.5% of the height) | 5.1 m (45%; HUD readouts start at 0.60) |
| Plume width at the nozzle | about 8 px | about 7 px |

Causes, in order of weight:

1. **Thin and dim.** Each jet (`src/aero-vfx.js`, `Cold gas nozzle`) leaves at a 6.5 cm radius and
   spreads its light over 4 to 6.5 m; only the first metre has a bright core. It is additive, so
   it washes out on a sunlit road.
2. **End-on.** The jets fire straight back at the camera, which sits 1.9 m above their axis.
3. **Little room in landscape.** The car's rear bumper sits at row 0.91; the dolly zoom brings the
   eye to 3.5 m behind the nozzles at NITRO top speed.
4. **No glow in the default look.** The nozzle glow discs and the longer board plume are gated
   behind `?look=3d` (`src/board-effects.ts`, `src/look-gate.ts`), and the road glow exists only
   with a NITRO trail skin (`src/garage-nitro-trail.js`).

Camera options at a full sprint, landscape:

| Change at a full sprint | Plume in frame | Car size |
| --- | --- | --- |
| Today | 1.35 m | 100% |
| Pull back 0.8 m | 1.75 m | 80% |
| Lower the look-at height 3.5 m (re-aim only) | 1.70 m | 98% |

## Goals

- A held NITRO or BOOST shows an exhaust plume that reads at a glance on a phone, in both
  orientations, on a sunlit road and on a dark one, on every selectable car and every thruster and
  NITRO trail skin.
- The car keeps its screen size: standstill, cruise and sprint stay within the existing 10% guard.
- The effect is on in the default look and on every VFX tier that shows exhaust today.

## Non-goals and anti-goals

- No change to the rest or cruise camera distance, height or FOV (owner chose this over a 10%
  closer rest camera). No pull-back on sprint. No change to the dolly zoom.
- No gameplay, physics, input, HUD layout or audio change. No new Garage item.
- Rival and traffic cars, first person, the touch-button flames, the void-pulse beams' own look and
  the NITRO trail skins' own art stay as they are.
- `?look=3d` gating of the board plume tail and the glow discs stays as it is.
- Anti-goals: a white-out that hides the car's rear or the road ahead; centre-screen glare; a
  flame that looks detached from the nozzles; a frame-time regression on Low; a sustained camera
  rotation or shake; any HUD readout made harder to read.

## Approaches considered

| Option | Result | Verdict |
| --- | --- | --- |
| **Fat, bright plume + sprint re-aim (picked by the owner)** | Plume 3x wider, 26% of the landscape height to show it, car 98% | Picked |
| Plume only, camera untouched | Same plume, 19.5% of the landscape height | Fallback if the re-aim hurts the view ahead |
| Closer at rest, pull back on sprint | +0.4 m of plume for a 20% smaller car | Rejected by the measurement |
| Camera only | Still an 8 px jet | Rejected |

## Design

### 1. Camera: sprint re-aim (`src/race-camera.ts`)

- `RaceCameraView` gains `sprintLook`: metres the look-at height drops at a full sprint share.
  Landscape chase 3.5; portrait chase 0; first person 0.
- `rigLook(view, fov, sprint = 0)` subtracts `view.sprintLook * unit(sprint)`. `sprint` is
  `sprintFrame.fov` (eased over 0.3 s, 0 under Reduced Motion, above 1 only on a NITRO chain, hence
  the clamp). `src/world.js` passes it on the line that already calls `rigLook`; `world.js` is at
  its 998-line ceiling and must not grow.
- Landscape at NITRO top speed: nozzle row 0.80 to 0.74, bumper row 0.91 to 0.84, room under the
  nozzles 19.5% to 26%, horizon row 0.48 to 0.42, car size 98%.
- Portrait stays at 0: its guards (horizon below row 0.36, car top below row 0.42) leave no room,
  and it already shows 5 m of plume above and around the readouts.
- The drop is linear in the sprint share. A held BOOST reaches a share of about 0.62 to 0.68
  (`frame.power` caps BOOST at 0.8 and scales it by speed), so its nozzle row is about 0.76.
- The same `look` feeds the framed-road, Sky Spiral and course branches of `world.js`, where it is
  added to a sloped road frame. The numbers above are for a straight classic road; criterion 5
  guards the others.
- No distance term is added; the rule in `.claude/rules/race-camera.md` stands.

### 2. Plume: thick where the camera can see it (new module, e.g. `src/sprint-plume.ts`)

`src/aero-vfx.js` is at the 400-line limit, so the rear exhaust moves out of it: the existing jets
plus the new parts become one module with one reason to change. All parts are children of the
`Rear ports` group, so `src/garage-model.ts` keeps placing them on each car's nozzles.

- **Flame.** Each jet leaves at the nozzle radius and swells to at least 0.20 m radius within
  0.6 m (today: 0.065 m growing linearly to 0.31 m over the full length). Most of the light sits in
  the first 2 m. `exhaustLength` still sets the tail length and `coreBrightness` the cap; thickness
  does not depend on either, so the Realistic preset is also visible. The ports are 0.40 m apart,
  so the four outer glows overlap into one band behind the car; the four bright cores (at most
  0.10 m radius) stay separate, so it still reads as four nozzles.
- **Core that survives daylight.** The inner core is drawn in a saturated colour that does not rely
  on additive blending alone, so it reads on Coast's sunlit asphalt; the outer glow stays additive.
- **Nozzle flare.** One camera-facing glow per port, about 0.45 m across at full power, depth-tested
  so the car occludes it, independent of bloom and of `?look=3d`, on every tier including Low.
- **Road glow.** One ground quad behind the car for every sprint, Medium and High only, hidden in
  flight, oriented by the contact-shadow plane (`.claude/rules/launch-flare-rendering.md`: lean and
  reach).
- **With a NITRO trail skin.** While the skin's streaks are showing, the base road glow and the
  flame's added thickness cross-fade out with `nitroMix` (no hard swap): the skin's own streaks and
  glow are the NITRO look and nothing stacks to white. Under BOOST the skin draws nothing, so the
  base plume shows in full.
- **Colour.** Today's rules: thruster skin tint and pattern on the base, purple or the trail skin's
  colour as NITRO mixes in. Void pulse keeps its beams and gains only the flare and road glow.
- **Modes.** VFX Off: nothing. Reduced Motion / Comfortable: no re-aim, static dimmer plume, every
  new shader clock frozen like the existing ones. Garage and Home showroom previews show the plume.
- **Cost.** Meshes exist hidden from creation so shaders compile in the world warm-up; uniforms
  only per frame, no allocation, at most 3 extra draw calls (instanced flares, road glow, core).
- **Showroom gate.** Reduced Motion and Comfortable are both the `calm` path. The showroom's gate
  (`tests/frostbite-canyon-browser.spec.js`: under 0.2% of pixels change) must stay green, so the
  flare never flickers in those modes.
- **Existing contract.** The jets keep their object names (`Cold gas nozzle N`) and uniform names
  (`diamonds`, `tail`, `trailAccent`), which tests and skins rely on. Tests that assert on the
  source text of `src/aero-vfx.js` follow the code to the new module; no assertion is dropped.

## Acceptance criteria

1. `tests/race-camera.test.js` (default FOV setting, 844 x 390): at NITRO top speed (share 1) the
   nozzle row is at most 0.75 and at least 24% of the frame height lies under it; at a held BOOST
   fed with its real share (0.8 x the speed scale) the nozzle row is at most 0.77;
   standstill and cruise rows are unchanged; the car stays within 10% of its cruise size in both
   orientations; portrait and first person return today's values; Reduced Motion re-aims by 0.
   RED on the current code.
2. New plume unit test: at full sprint power each jet's outer glow is at least 20 px wide 1 m
   behind the nozzles in both phone orientations (through the rig), on Low, Medium and High, on the
   Realistic preset, for every thruster skin, and the four cores do not touch. It also asserts the
   flame rule above (radius at least 0.20 m by 0.6 m, at least 28 px wide there). RED on the current
   jets: about 8 px at the nozzle, 0.095 to 0.136 m and 15 to 19 px at 0.6 m. (Measured after
   approval: at 1 m today's cone is already 19 to 34 px, so the 0.6 m rule is the real guard.)
3. Flare and road glow follow the modes above (Off, Reduced Motion, Low, flight, trail skin, void).
4. Every selectable car: the plume sits on the nozzles in the race, the Garage preview and the
   Home showcase, after switching cars.
5. Real WebGL frames, before and after, from `tests/sprint-camera-capture-browser.spec.js`
   (extended to report the plume's projected box): desktop, phone portrait, phone landscape; Coast
   (day), Neon (dark, wet), Sky Spiral and one climbing course; cruise, BOOST, NITRO; both cars.
   The spec also reports the mean RGB distance between the plume core box and the road strips
   beside it: at least 40 of 255 on Coast and on Neon at a held NITRO. On Sky Spiral and the
   climbing course the car's box stays inside the frame and the nozzle row stays within 0.05 of
   Coast's. The owner reviews the frames; the numbers are the stopping point, not the sign-off.
6. GPU-synced frame cost (`sampleFrameCost` in `tests/tier-cost-benchmark-browser.spec.js`; rAF
   times are vsync-held and cannot show it) during a held NITRO on Coast, at 844 x 390 and
   1440 x 900, on Low, Medium and High, before and after: the median rises by at most 5% or 0.3 ms,
   whichever is larger.
7. `node --test tests/module-size.test.js` passes with no ceiling raised; `npm test`,
   typecheck, `npm run build`, `npm run test:browser`, then `make verify`.
8. Prevention: `.claude/rules/race-camera.md` names the "exhaust under the frame" trap; a scoped
   rule for the plume module names the "thin, additive-only, gated" trap; criteria 1 and 2 guard them.
   Evidence is tracked in `TODO.md`.

## Left to the builder

Exact radii, brightness curves, flare size and `sprintLook` within the guards above; the geometry
technique for the swell (vertex shader or lathe); sprite versus instanced quad; how the non-additive
core is blended; test structure; how many lines leave `src/aero-vfx.js`.

## Calls made by the author, for the owner to confirm

- The plume is on in the default look, not behind `?look=3d` (the 2026-11-09 decision kept the
  default look; this request changes the default exhaust only).
- Portrait gets no re-aim.
- Void pulse gains the flare and road glow but keeps its beams.
- Road glow is Medium and High only.
- Four separate bright cores inside one overlapping glow band, not four fully separate flames.
- With a NITRO trail skin, the base plume cross-fades out as NITRO mixes in.
- A held BOOST re-aims less than NITRO (linear in the sprint share).
- The contrast floor (40 of 255) and the frame-cost threshold (5% or 0.3 ms) are the author's numbers.
