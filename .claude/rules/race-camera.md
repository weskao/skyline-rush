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
  portrait row aims below the road so the rear bumper stays above them, and it follows the car's
  lateral position almost fully so a drift at the road edge fits the narrow width.
- **Horizon.** The chase camera never rolls; only first person banks in flight.
- **Comfort.** Reduced motion disables the drift swing and the shake. Shake scales with the
  player's Camera shake setting and is applied after `lookAt`, never to the smoothed position.
- **Sprint judder.** NITRO/BOOST never feed a sustained shake: the old rig shook at 8.4 Hz for the
  whole sprint (±0.14° default, ±1.25° on the strongest setting) and read as judder on desktop.
  `rigShake` takes speed only. The ignition is one damped pitch kick (`rigKick`, ≈0.25 s, 5 Hz,
  capped at 0.4°) on the `kick` clock that `createSprintVfx` restarts only on a fresh ignition;
  the FOV share eases in over 0.3 s; the pull-back is the sprint share of `rigBack`
  (`sprintBack`). Every number stays in `RACE_CAMERA`, no sway or world-space push in `world.js`.
  A portrait `sprintBack` must keep the rear bumper above the HUD (portrait HUD test, sprint 1).

## Changing a number

1. RED first: add or tighten the assertion in `tests/race-camera.test.js`, then change the table.
2. Re-measure the car when the player model changes (bounds of the rendered mesh, both cars).
3. Capture real WebGL frames before and after: desktop, phone portrait and phone landscape, on a
   classic road (Coast) and a framed road (Tokyo, Sky Spiral), for cruise, drift, NITRO, FLY and
   first person. Unit tests cannot show clipping, bloom or HUD overlap.
4. Compare frame time before and after (`performance-review.md`): a closer car covers more pixels.
