---
paths:
  - "src/item-attacks.ts"
  - "src/rival-items.ts"
  - "src/course-race-step.ts"
  - "src/game.js"
---

# Attack pickups

Freeze and EMP use the shared race clock and the same effects for player and rival targets.
Both flat roads and CourseGraph sweeps pass actual ring contacts through `rivalTakes`.
Resolve Mystery from the same seed and ring index for every driver. Apply EMP range along
the connected road, with lateral and vertical offsets, and exclude the driver who fired.
Scale the player's stored speed on the first hit and its speed cap while an effect lasts.
Lift that temporary multiplier when the last attack expires so braking and impacts still count.
Overlapping effects keep the same slowdown. `tests/rival-item-attacks.test.js` covers these rules.
