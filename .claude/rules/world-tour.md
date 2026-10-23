---
paths:
  - "src/world-tour-*.js"
  - "src/world.js"
  - "src/game.js"
  - "src/route-map.js"
  - "tests/world-tour*"
---

# World Tour scenery and powerups

Code map: `src/world-tour-scene.js` renderer/chunk pool · `src/world-tour-scenery.js` roadside
assets · `src/world-tour-tunnels.js` five tunnel styles · `src/world-tour-landmarks.js`
landmarks · `src/world.js` lighting · `src/route-map.js` + `src/style.css` route map.

- One rolling renderer for the five World Tour IDs; new props, landmarks and Hyperdrive gates go
  in `world-tour-landmarks.js` / `world-tour-scene.js`. Do not copy whole scenes per track.
- Each track keeps its own road-line language, roadside kit, tunnel structure, palette and
  minimap skin. Shared placement/streaming is fine; shared-looking scenery is not.
- Roadside props are keyed by absolute `trackId + chunkIndex`, never modulo-cycled near the
  player; mountain/coastal terrain joins exactly at chunk boundaries.
- `src/game.js` owns `boost-tunnel` reward/collision state: one use per race, visual trigger
  volumes never grant rewards per frame.
- Collectibles and particles use `trackLocalPosition` (no hovering pickups / buried effects on
  elevated or curved roads). Minimap never reveals shortcuts.
- Keep bloom, emissive and mirror asphalt subdued in the centre sightline; put subdued lights on
  the edges. Alpine railroad bore: dark, enclosed, rare amber service lamps.
- Landmarks: recognizable skyline silhouettes from original geometry, with low/high quality and
  reduced-motion variants.

## Solid props

- A roadside prop whose box reaches within `ROAD_LIMIT + .85` of the centre line is solid:
  `roadObstacles(trackId)` (`world-tour-scene.js`) exports it to `race.props`, and `hitProp`
  in `game.js` gives the player a swept barrier hit and pushes the car to the open side.
- `clearOfRoad` keeps every prop's inner edge >= `ROAD_CLEARANCE` (4.5 m) from the centre, so
  at least the two middle lanes stay drivable; shortcut corridors stay unblocked.
- Low detail always draws solid props (`detailPlan`) — never collide with something invisible.
- Rivals and traffic run `avoidObstacles`: look 80 m ahead, move to the nearest free line at
  `LANE_SHIFT` m/s, return to `homeX` once past. Moving hazards block their whole sweep; a rival
  higher than the barrier passes over it. Overhead parts the car fits under are not blockers.
- Non-player cars past the finish on clamped routes are hidden (`world.js`), not parked.
- New solid props need a test in `tests/game.test.js` that fails without the collision.

## Shared collision physics

- One response for every car: `knock(race, car, side, intensity, retention)` in `game.js`. It
  keeps 45% speed (70% with nitro active; the 'relaxed' setting floors it at 80%), shoves
  sideways by `0.4 + intensity * 0.6`, and starts a 1.5 s cooldown. The player's `contact()` and
  AI hits both use it — never add a separate AI-only bounce.
- Car-vs-car uses the player's box (|Δd| < 4.4, |Δx| < 1.7, |Δalt| < 1.8). Player-vs-AI knocks
  both cars in opposite directions; AI-vs-AI pairs go through `bumpCars`.
- AI prop and hazard hits go through `aiImpacts`: swept `hitProp`, then `clearOf` puts the car on
  the open side. Skipped while the car's cooldown runs, the same as the player.
- `avoidObstacles` treats slower cars ahead and the player as blockers (`carBlocker`) so AI
  changes lane before contact; collisions happen only when no lane is free.
- Traffic has `cruise` speed and regains it at `TRAFFIC_ACCEL` after a knock; rivals keep
  `pace` (speed after slowdowns), which also drives their finish time.
- Pair checks are O(n²) over about 53 cars (about 15–23 µs per step). Measure with a bench before
  adding cars.

Docs: `docs/world-tour-scenic-redesign.md`, `docs/world-tour-landmark-polish.md`.
