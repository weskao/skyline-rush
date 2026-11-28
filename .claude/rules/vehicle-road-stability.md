---
paths:
  - "src/game.js"
  - "src/player-contacts.js"
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
Keep the arcade driving feel (road-relative kart handling, owner 2026-11-28); do not replace it with a new
physics engine.

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

- Player collision recovery suppresses repeat penalties, while vehicle and scenery contact still
  separates their bodies. Only Ghost Phase allows overlap. At expiry, exempt the contacts already
  overlapping until they clear; newly touched objects are solid on the first unphased frame.
  Check both proposed lanes before separating a pair: a third car may occupy the landing space. If
  the leading car blocks both sides, limit the player's travel and pace to the available gap.
  Sustained contact stays part of the original encounter until the cars separate.
  `tests/collision-recovery.test.js` covers these rules at the simulation boundary.

- A queued car follows its leader from behind. Release the old contact queue when
  gap recovery relocates the player. Guard with `tests/collision-recovery.test.js`
  (rewinding from a gap releases the pre-fall vehicle queue).
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
- A drift keeps the road's line (`heading` 0, no bend) and slides `steering * min(9, speed * .22) *
  DRIFT_LATERAL` m/s on every road, in `roadDrift`. Only hazards that push every car (crosswind
  sections) still act during a drift.

## Kart handling, straights and rail contact (all tracks)

Owner, 2026-11-28 (KartRider handling, replacing the 2026-11-22..28 corner push, nose-turn and straight-threshold
models): with no left/right input the nose keeps its direction. The car never corners, keeps a lane or slides on its
own and may run into the wall; steering turns the nose and a lane change needs counter-steer.
- **Steering turns the nose; nothing pushes the car.** `roadDrift` (`src/corner-force.ts`) keeps `car.heading` (rad,
  positive toward +x, clamped to ±.5): `heading += (steering * turnAuthority(speed) + cornerRate) * dt`. The car
  slides `speed * sine(mid-step heading)` and advances `speed * cosine(heading)` (`roadAdvance`). `turnAuthority` is
  2 rad/s at full lock from 20 m/s, in proportion below, 0 when stopped. `cornerRate = -speed * roadBend`, so a bend
  turns the road away from a released nose and the car meets the outside rail; on a straight it holds its line.
  There is no straight threshold, no speed gate and no air share (a flying car meets the whole corner).
  The drawn car yaws by `heading` (`smoothDriftYaw`).
- One road turn for every track: `roadBend` caps the turn at `MAX_BEND` (1/60 rad/m; shortcut, so authored kinks
  such as Stormline's 115° in 4 m cannot spin the nose). Road ids read `trackFrame`, graph courses read the car's own
  edge (`currentEdgeId`, `localS`), and Endless on a long-form id reads the shared highway. Curvature is cached lazily
  per 4 m cell; track geometry is immutable, so a cell is never invalidated. Never add a per-track turn or a second
  curvature table.
- Determinism: a turn from `Math.sin/cos/atan2` is snapped before it enters the simulation (`TURN_STEPS`, 2^-30
  rad/m), and the heading uses the polynomial `sine`/`cosine`, never `Math.sin/cos`. Engines differ in the last bit:
  unsnapped, a push passed on a Mac (Node 24, arm64) and broke 9 legacy replay hashes on CI (Node 22, x64). Only CI
  proves portability. Guard: the last-bit trig test in `tests/corner-force.test.js`.
- The road's turn is off (heading road-relative) in tutorial practice, on a Frostbite span, inside a shortcut
  corridor and during a knock's 1.5 s grace. `meetRail`, a hit on the player (`knock`), a drift and a road recovery
  (`road-falls.ts`) set `heading` to 0. Steering stays live through the grace, so a boxed-in car can steer away
  instead of hitting the same car again. Guard: the knock-grace test in `tests/corner-force.test.js`.
- **Rail hits are judged by impact angle** (`resolveRail`): sideways over forward travel in the contact step,
  whatever carried the car there. Below `SCRAPE_RATIO` (about 6°) with less than .9 lock it scrapes (92% speed
  kept, placed 1 m inside the rail); steeper is a hard hit (75% kept, `knock` places it about 1 m inside at
  88 m/s). Both arm `railContactSide`, so one contact is one penalty until the car pulls 1.2 m clear; the nose
  lines up with the road. A held lock turns it straight back into the rail (still the same contact), so a car
  leaves the rail by releasing or counter-steering. A released car in a sharp bend arrives nose-first and hits hard.
- **AUTO (`laneAssist`) is an automatic throttle only** (owner, 2026-11-28). It never holds a lane, softens
  a corner or steers off a rail: a released car in a bend runs into the outside rail AUTO on or off. The
  2026-11-25 grounded lane hold (ad03ac13) and the rail recovery that steered back to 1.5 m from the centre
  were removed: the recovery threw the car out at the next bend (case B). `stepRace` must not read
  `laneAssist` for steering. Guard: the AUTO-vs-off identical-path test in `tests/corner-force.test.js`.
- Test bots steer like a kart driver through the shared `steerToward(race, car, aim)` in
  `scripts/pickup-economy.mjs`: counter-steer the heading toward a small aim angle and turn in against
  `cornerRate` just ahead. A bot that pins a lane also sets `heading = 0`, or the nose keeps turning under it;
  a test that teleports a car mid-race resets `heading` too.
- Forks read the car's own lane `x`: nothing discounts a corner's carry, because nothing pushes the car.
  Guard: `tests/corner-force.test.js` (all 17 tracks, AUTO on and off, a lane keeper at 88 m/s and NITRO,
  30/60/120 FPS, forks, straights, one-contact rail hits, knock grace).
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
5. **Browser and build:** Run `pnpm test`, `pnpm run build` and the relevant full
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
