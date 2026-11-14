---
paths:
  - "src/race-camera.ts"
  - "tests/race-camera.test.js"
---

# In-race camera: one table, pure math, real frames

`RACE_CAMERA` in `src/race-camera.ts` holds every race view (landscape chase, portrait chase,
first person). `src/world.js` only applies it: no camera offset, FOV or shake literal goes back
into `world.js`, which sits at its line ceiling (`module-size.md`). The ready-screen showcase is
a different camera (`track-showcase.md`, `src/track-preview.ts`).

## Traps found while tuning (each has a guard in `tests/race-camera.test.js`)

- **Eye inside the car.** The windscreen starts 1.32 m ahead of the car origin. A first-person
  eye behind it renders the cabin shell across the view (the old rig did this on World Tour and
  Sky Spiral, where it had no forward offset).
- **Bonnet in frame.** A sunlit bonnet feeds the bloom pass and washes out the lower half of a
  phone screen. The eye sits over the nose tip so the nose stays below the frame at top FOV.
- **Portrait HUD.** On a 390 x 844 phone the altitude and speed readouts start 60% down. The
  portrait row aims below the road so the rear bumper stays above them (checked from standstill to
  a x3 NITRO punch on the strongest FOV setting), and it follows the car's lateral position almost
  fully so a drift at the road edge fits the narrow width.
- **Horizon.** The chase camera never rolls; only first person banks in flight.
- **Comfort.** Reduced motion disables the drift swing, the shake and the rumble. Shake and rumble
  scale with the player's Camera shake setting and are applied after `lookAt`, never to the
  smoothed position (`world.js` removes last frame's rumble before the lerp).
- **Shrinking car (dolly zoom).** A wider FOV at the same distance shrinks the car: the old rig also
  pulled back with speed and sprint, so the car dropped to ~72% of its standstill size at 88 m/s and
  ~52% at NITRO top speed, and speed read as "the car gets smaller". The chase distance is now
  derived from the chase FOV (`rigBack(view, fov)`, pivot on the rear bumper) and `rigLook`
  re-aims so the horizon and bumper keep their rows: the car stays within 10% of its cruise size
  from standstill to NITRO top speed while the background widens. Pass the speed + sprint + punch
  FOV, never the impact pinch, and never add a distance term on top. First person (`dolly: 0`)
  keeps its eye fixed.
- **Sprint judder.** NITRO/BOOST never feed a sustained *rotation*: the old rig shook at 8.4 Hz
  for the whole sprint (±0.14° default, ±1.25° on the strongest setting) and read as judder on
  desktop. `rigShake` takes speed only. The ignition is one damped pitch kick (`rigKick`, ≈0.35 s,
  4 Hz, ≈0.5° peak on the default setting, capped at 1.2°) on the `kick` clock that
  `createSprintVfx` restarts only on a fresh ignition; the FOV share eases in over 0.3 s.
  A sustained *translation* is allowed, bounded: `rigRumble` moves the eye a few cm in camera x/y
  (1–3 Hz road waves + a small 17 Hz buzz, ∝ speed², +80% at a full sprint, capped at 5 cm), so
  the car and road tremble while the horizon stays still. Guard: the road-rumble test (z 0, peak
  ≤ 4 cm on the default setting, < 0.75° of car motion, peak rate < 35× amplitude). Every number
  stays in `RACE_CAMERA` / `race-camera.ts`, no sway or world-space push in `world.js`.
- **Sprint without impact.** Removing the shake alone left NITRO/BOOST flat (0.135° kick). The
  impact is one smooth transient, never a sustained shake: `sprintPunch` (0.2 s in, gone at
  0.8 s) on the same `kick` clock drives `frame.punch`, which overshoots the FOV (`PUNCH_FOV`;
  the dolly turns it into a background surge, not a smaller car) and flashes the radial blur.
  `frame.squat` runs the same envelope 5/3 faster: the car's nose lifts ~2° on its rear tyres
  (`squatPitch` + `rearAxleLift` in `src/vehicle-render-motion.js`, read from each car's own
  wheels) and peaks before the punch, so the camera follows late. Presentation only; the flat
  legacy road path (Endless practice) does not squat.

## Changing a number

1. RED first: add or tighten the assertion in `tests/race-camera.test.js`, then change the table.
2. Re-measure the car when the player model changes (bounds of the rendered mesh, both cars).
3. Capture real WebGL frames before and after: desktop, phone portrait and phone landscape, on a
   classic road (Coast) and a framed road (Tokyo, Sky Spiral), for cruise, drift, NITRO, FLY and
   first person. Unit tests cannot show clipping, bloom or HUD overlap.
4. Compare frame time before and after (`performance-review.md`): a closer car covers more pixels.
