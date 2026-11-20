---
paths:
  - "src/sky-scene.js"
  - "src/sky-track.ts"
  - "src/classic-road-render.ts"
  - "src/classic-road-routes.ts"
  - "src/track-profile-road.ts"
  - "src/world-tour-scene.js"
  - "src/courses/**"
  - "src/upcoming-scenes/**"
  - "src/race-tracks.ts"
  - "src/frostbite-race-scene.ts"
  - "src/*-race-scene.ts"
  - "src/course-race-scene.ts"
  - "src/road-runout.ts"
  - "src/finished-rival.js"
  - "src/race-rivals.js"
  - "src/track-paths.ts"
  - "tests/finish-line-rival-contact.test.js"
  - "tests/road-runout.test.js"
---

# Road run-out: an open road never ends in the air under the car

Applies to every track and mode whose road does not close into a loop (point-to-point races, a finish at the end
of the centreline, a course edge that simply stops), existing and new.

- The car parks at the finish. From there, and on the whole approach, the player must see road running on ahead:
  the drawn road, its rails, lane marks and shoulders continue past the finish for at least the track's draw
  range (the distance its road stream normally shows ahead of the car). A deck that stops at the finish line with
  sky behind it is a bug.
- The run-out continues the road for parked finishers. Race length, checkpoints, the finish gate, the minimap
  route, records and Ghost data keep the shipped length.
- Once a rival crosses FINISH, record its time once, stop its AI and keep the same vehicle visible. A rear
  impact moves the parked body forward and gives it rolling speed, even during collision grace. Never
  run the ordinary follow response against a parked rival: capping the trailing driver at the parked speed
  can keep it short of the line. Periodic Circuit frames wrap the pose, while CourseGraph uses a separate
  run-out offset to keep the signed gate and leaderboard state at the end of the edge.
- Guard the shared behavior with `tests/finish-line-rival-contact.test.js` and check the model is still visible
  during the shove with `tests/finish-line-rival-browser.spec.js`.
- Take the run-out from the route's own continuation (its Endless or next-lap extension, or the centreline
  extrapolated along its last heading and grade), joined with the same position and tangent as the finish. Never a
  second hand-drawn stub with its own width or material. Where the map's chunk builder cannot sample past its last
  edge, use `createRoadRunout` (`src/road-runout.ts`) with that edge's width and the map's road material parameters,
  built or streamed with the sector that holds the finish (never rebuilt per frame).
- A real break the car must jump (a gap in the course data) stays a break. It is shown on the minimap
  (the minimap gap rule) and is not filled by this rule.
- A stream that clamps its rows to the race length (`Math.min(length, distance)`) is the usual cause: clamp the
  simulation, not the drawing.
- Guard per track: a unit test that parks the scene at the race length and asserts drawn road beyond it. A new
  open road adds its case to `tests/road-runout.test.js`. RED evidence, 2026-11-19:
  - Sky Spiral: `tests/sky-scene-streaming.test.js` (*the road runs on past the finish instead of ending in the
    air under the parked car*), RED when the ribbon stopped 12 m from the car.
  - World Tour, all five: *World Tour roads run on past the finish under the parked car*, RED when the ribbon's
    last rows collapsed onto the finish (`trackFrame` clamped).
  - Frostbite: *Frostbite road runs on past the finish for the whole view radius*, RED at 550 m (run-off was 500).
  - Stormline, Volcanic: *… road runs on past the finish for the whole view radius*, RED at 50 m.
  - Dune, Skyfall: *… road runs on past the finish for its draw range*, RED at 50 m (FINISH has no next edge).
  - Monsoon: `tests/monsoon-ruins-race.test.js` (*Monsoon scenery runs on past FINISH as far as the race view
    reaches*), `MONSOON_RUNOUT`.
  - Coast, Canyon, Aurora: *classic open roads run on past the finish* (they mirror past their length; never RED).
- Confirm on a real WebGL frame at the finish and 300 m before it; a unit test cannot show a seam or a missing rail.
