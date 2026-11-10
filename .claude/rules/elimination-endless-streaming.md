---
paths:
  - "src/endless-highway.ts"
  - "src/game.js"
  - "src/world.js"
  - "src/course-race-step.ts"
  - "src/elimination.ts"
  - "tests/elimination*.test.js"
  - "tests/elimination*.spec.js"
---

# Endless roadway shared by survival modes

- `endless` and `elimination` share the same chunk-streamed road, pickups, rings, traffic, and scene extension. Apply to every registered track, including future ones, without per-track special cases or duplicate generators.
- Only `endless` finishes after `ENDLESS_COLLISIONS`; `elimination` finishes on the scheduled last-driver knockout, never at `track.length` or a collision threshold.
- Do not assign rival `finishTime` or cap player distance/speed in any streaming race. Classic finite sprint, CourseGraph, Circuit, and Daily finish paths remain unchanged.
- Regression: all sixteen current track ids, one synthetic short future track, and a browser run beyond the old finish in `tests/elimination-endless-all-tracks.test.js` and `tests/elimination-endless-browser.spec.js`.
- Actual WebGL road continuity and controls on phones remain a separate acceptance gate from deterministic tests.
