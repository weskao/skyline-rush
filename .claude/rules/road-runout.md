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
---

# Road run-out: an open road never ends in the air under the car

Applies to every track and mode whose road does not close into a loop (point-to-point races, a finish at the end
of the centreline, a course edge that simply stops), existing and new.

- The car parks at the finish. From there, and on the whole approach, the player must see road running on ahead:
  the drawn road, its rails, lane marks and shoulders continue past the finish for at least the track's draw
  range (the distance its road stream normally shows ahead of the car). A deck that stops at the finish line with
  sky behind it is a bug.
- The run-out is drawing only. Race length, checkpoints, the finish gate, the minimap route, records and Ghost
  data keep the shipped length; no car is simulated on the run-out.
- Take the run-out from the route's own continuation (its Endless or next-lap extension, or the centreline
  extrapolated along its last heading and grade), joined with the same position and tangent as the finish. Never a
  second hand-drawn stub with its own width or material.
- A real break the car must jump (a gap in the course data) stays a break. It is shown on the minimap
  (the minimap gap rule) and is not filled by this rule.
- A stream that clamps its rows to the race length (`Math.min(length, distance)`) is the usual cause: clamp the
  simulation, not the drawing.
- Guard per track: a unit test that parks the scene at the race length and asserts drawn road beyond it. Sky
  Spiral: `tests/sky-scene-streaming.test.js` (*the road runs on past the finish instead of ending in the air
  under the parked car*), RED when the ribbon stopped 12 m from the car (2026-11-19).
- Confirm on a real WebGL frame at the finish and 300 m before it; a unit test cannot show a seam or a missing rail.
