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
- Any lateral road force skips the car while `drifting`, so a drift slides at exactly
  `DRIFT_LATERAL` x the steering rate on every road. Only hazards that push every car (crosswind
  sections) still act during a drift.

## Corner push and AUTO's rail recovery (all tracks)

Owner brief, 2026-11-22: cornering needs real steering, with a forgiving assist. Owner, 2026-11-24:
corners still passed themselves (the sharpest bend needed ≤ 31% lock), so the push doubled, Mario Kart-like.
- One corner force for every track, in `src/corner-force.ts` (`roadDrift`). It pushes a grounded car
  outward, `clamp(-turn*.5*max(0, speed-35)^2, ±6)` m/s: the sharpest bend at 88 m/s needs two thirds
  of the 9 m/s steering authority, NITRO saturates it and a drift (no push) is the tight line. Corner plus
  crosswind is clamped to ±7 m/s (`MAX_FORCE`), so full lock always keeps 2 m/s to steer out. Road ids read `trackFrame`, graph courses
  read the car's own edge (`currentEdgeId`, `localS`), and Endless on a long-form id reads the shared
  highway. Curvature is cached lazily per 4 m cell; track geometry is immutable, so a cell is never
  invalidated. Never add a per-track push or a second curvature table.
- A force derived from `Math.sin/cos/atan2` is snapped before it enters the simulation (`TURN_STEPS`,
  2^-30 rad/m). Engines differ in the last bit of trig results: unsnapped, the push passed on a Mac
  (Node 24, arm64) and broke 9 legacy replay hashes on CI (Node 22, x64). A local run on any Node
  cannot prove portability; only CI can. Guard: the last-bit trig test in `tests/corner-force.test.js`.
- **The bend turns the road away from the nose, it does not push the car** (owner, 2026-11-25: a released
  car must hit the wall nose-first, not appear to steer itself). `roadDrift` keeps `car.heading` (rad, positive
  toward +x): a bend grows it at `NOSE_TURN` (.35 rad/s) × the lock the push above asks for, and the car slides
  `speed * sin(heading)`, so a released car's slide accelerates until the rail. Steering against the heading first
  turns the nose back at the same rate, and also settles it (exponentially, fully once the lock matches the bend);
  only the lock left over moves the car across. Held at the bend's lock the car keeps its lane as the old constant
  push did. A heading accumulates only from bends; straights keep the arcade lane change (no counter-steer).
  The rail clamp (`meetRail`), a knock's grace, a drift and a road recovery reset it to 0. The drawn car yaws by
  it (`smoothDriftYaw`). Full real-car heading physics on straights is deferred (`TODO.md`).
- **Rail hits are judged by impact angle** (`resolveRail`): sideways over forward travel in the contact step,
  whatever carried the car there. Below `SCRAPE_RATIO` (about 6°) with less than .9 lock it scrapes; steeper is
  a hard hit (75% speed kept). A released car in a sharp bend arrives nose-first and hits hard.
- Half strength in the air (`AIR_SHARE`, owner 2026-11-25: taking off must not skip a corner). Off while
  drifting, in tutorial practice, on a Frostbite span, inside a shortcut corridor,
  and during a knock's 1.5 s grace, so a car is never pressed back into what it hit (clamp -> shove).
- AUTO (`laneAssist`) never softens a corner (owner, 2026-11-25): a hands-free car runs on into the
  rail and hits it. Only after a move really reached the rail (`meetRail`, below the 1.3 m rail
  height) does `assistSteer` steer back toward the centre at .85 lock on the normal steering ramp,
  and it lets go 1.5 m from the centre, so the corner carries the car out again. .85 beats the 7 m/s
  force cap (7.65 m/s) yet stays under the .9 lock that makes a rail touch a hard hit. Any player
  steering cancels it; AUTO off never steers. It writes `autoRecover` only while AUTO is on, so
  non-AUTO replays keep their state. AUTO keeps auto-throttle.
- Test bots that steer a lane read `cornerRate(race, car)` and the nose's slide `speed * sin(heading)` to lean
  into the bend (the shared `botInput` in `scripts/pickup-economy.mjs`), like a player. Bots that pin a lane
  also set `heading = 0`, or the nose keeps turning under the pinned car.
- Forks read the lane the driver chose: `forkLateral(x, cornerDrift)` discounts what the corners
  carried. An inward move (rail clamp, a placed lane, steering back) shrinks it; steering outward
  clears it. Guard: `tests/corner-force.test.js` (all 17 tracks, AUTO on and off, a lane keeper at
  88 m/s and NITRO, 30/60/120 FPS, forks, AUTO's rail recovery, knock grace).
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
