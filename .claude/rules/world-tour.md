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

Docs: `docs/world-tour-scenic-redesign.md`, `docs/world-tour-landmark-polish.md`.
