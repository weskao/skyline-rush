---
paths:
  - "src/game.js"
  - "src/drive-rules.ts"
  - "src/classic-road-routes.ts"
  - "tests/drift-*.test.js"
  - "src/world.js"
  - "src/vehicle-pose.js"
  - "src/geometry.js"
  - "src/sky-track.js"
  - "src/sky-scene.js"
  - "src/track-paths.js"
  - "src/world-tour-scene.js"
  - "tests/game.test.js"
  - "tests/geometry.test.js"
  - "tests/sky-track.test.js"
  - "tests/track-paths.test.js"
  - "tests/vehicle-pose.test.js"
  - "tests/rail-contact.test.js"
  - "tests/*motion*browser.spec.js"
  - "tests/*world-tour*browser.spec.js"
---

# Vehicle / road contact invariants — all tracks

These rules cover the player, rivals, traffic, ghost, home previews and future tracks. A
fix for Sky Spiral must also be checked on the four classic and five World Tour tracks.
Keep the arcade driving feel; do not replace it with a new physics engine.

## One road coordinate system

- Treat simulation `distance`, lateral `x` and airborne `altitude` as the source of truth.
  Map them to Three.js space using the *same* road centreline and orthonormal
  `forward/right/up` frame as the rendered road. Existing helpers are
  `trackFrame` / `trackLocalPosition` and `skyFrame` / `skyPosition`.
  Do not implement a second approximate centreline for vehicle positioning.
- Build the vehicle's world orientation from the road frame first; compose drift yaw,
  steering lean, flight pitch and trick roll as **local** rotations. On 3D roads use
  `orientCarOnRoad` in `src/vehicle-pose.js`. **Never overwrite `mesh.rotation.x`
  or `mesh.rotation.z` after setting a road-aligned quaternion**: Three.js Euler
  decomposition near steep/quarter-turn headings can discard the road pitch/bank and
  visibly snap. The legacy flat-road rendering path can retain its existing behavior.
- A frame must have finite, unit-length, mutually perpendicular axes with a consistent
  handedness. Sample smoothly through straight/curve, rise/fall, helix entry/exit and
  track-end seams; never normalize a degenerate tangent without handling it.
  Preserve genuine banking and elevation rather than flattening the car to world Y.
- The visible road and all vehicle classes must agree on lateral offset, altitude,
  heading and banking. Check **actual wheel/body mesh clearance**, not just the car's
  origin above the road. On-ground tires should meet (not sink into) the visible road,
  including near the inner/outer edges and on a triangulated, curved road ribbon.
  Keep existing airborne, jump-gap and stunt behavior intact.

## Stable boundaries and simulation

- A continuous steering hold into one rail must not cause repeated hard hits every time
  the collision cooldown expires. Track sustained contact, reset it only after adequate
  separation, and re-arm the next genuine impact. Preserve intentional first-hit speed
  loss, knockback, scrapes, shields and AI collision rules.
- Avoid opposite-direction correction loops (clamp -> shove -> clamp -> shove), abrupt
  lateral teleporting, and frame-dependent impulses. Changes to physical movement must
  use bounded `dt` and behave consistently across 30/60/120 FPS.
- Do not hide errors by lifting every car, expanding its collision box, adding arbitrary
  track-specific offsets, blurring/shaking the camera less, or damping away genuine
  orientation errors. Trace the numerical and rendering data flow and fix its shared
  root cause first; reuse existing helpers rather than adding a second pose system.

## Drift handling is global (all tracks, now and future)

- Drift tuning lives only in `src/drive-rules.ts` (`DRIFT_*`, `driftTier`) and the shared
  `stepRace` drift block; a track or course never adds its own drift constants or rules.
- Any track-specific lateral force (like `classicCornerPush`) skips the car while `drifting`, so a
  drift slides at exactly `DRIFT_LATERAL` x the steering rate on every road. Only hazards that push
  every car (crosswind sections) still act during a drift.
- Guard: `tests/drift-all-tracks.test.js` iterates `RACE_TRACKS`, `COURSE_TRACKS`, the circuit and
  Endless, so a newly registered track is checked without edits; a track it cannot cover is a gap
  to fix in the test, not a skip.

## Required regression evidence for edits

1. **TDD:** Write a deterministic failing test first, observe the expected RED, make the
   smallest correction, observe GREEN, then run the whole suite. Tests written but never
   executed are **pending**, not passing.
2. **All tracks:** Check centre/inner/outer lanes, both steering directions, shallow scrape
   and hard barrier contact, moving away and re-contacting, low/high speeds, drift,
   landing/takeoff, rivals and traffic. Include Sky Spiral's 1100–2200 m full helix and
   its 1100/2200 m joins, banked/elevated World Tour roads and non-3D classic tracks.
3. **Geometry:** Assert finite positions, frame orthonormality, orientation continuity,
   correct tangent/bank, and wheel/body clearance against the **rendered road surface**.
   Inspect real WebGL frames as well; coordinate-only tests cannot prove no clipping.
4. **Frame rates:** Exercise 30/60/120 FPS or equivalent variable timesteps with explicit
   tolerances. Test repeated edge contact beyond the 1.5 s impact cooldown.
5. **Browser and build:** Run `npm test`, `npm run build` and the relevant full
   Playwright suites on desktop and mobile, plus any separate World Tour browser config.
   Capture affected corners before/after and report actual results, CI commit SHA,
   untested devices and outstanding gaps. No claim of a completed fix or green CI
   without fresh output for that exact commit; never weaken tests to make CI green.

Review this checklist whenever adding tracks, changing road geometry, car models,
collision handling, camera-follow behavior or vehicle visual effects.

→ Read `docs/classic-road-minimap.md` before changing track centrelines, route previews/markers,
Coast scenery, render pacing, or anything that changes track length, checkpoints or saved
best-time/Ghost data. Road geometry, car pose, collision, steering, AI/traffic or a prop drawn on
the road → also `world-tour.md` ("Solid props", "Shared collision physics"). Record unrun checks
as pending.
