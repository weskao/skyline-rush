---
paths:
  - "src/track-preview.js"
  - "src/world.js"
  - "src/sky-scene.js"
  - "src/world-tour-scene.js"
  - "src/aero-vfx.js"
  - "src/App.vue"
  - "tests/*showcase*"
  - "tests/presentation*"
  - "tests/track-preview.test.js"
---

# Home-screen 3D preview parity — every track, existing and new

A track is not shippable until its ready-screen showcase matches the others in quality,
legibility, motion and camera scale.

- Live Three.js world: player Roadster, three rivals, driveable road, landmarks, scenery. No
  flat illustration, thumbnail or empty sky.
- Composition: player hovers gently with visible jets; ≥1 rival flies with thrusters; other
  rivals stay near the road. Same model, lighting, paint, wing and physics visuals as in-race;
  never hide or shrink the player.
- Camera: three-quarter rear chase, 50° FOV. Desktop baseline ≈ 8.3 m side, 11.8 m behind, eye
  5.1 m above road (~3.5 m above a player hovering at 1.6 m). Portrait gets responsive tuning,
  never arbitrary zoom-out or a cut-off car.
- On curved/banked/elevated/cosmic roads, derive camera and look-at from the sampled road
  tangent/up/right at a curated preview point; never fixed world-axis coordinates.
- Reduced motion: disable oscillation and non-essential jets/flash; keep all vehicles and road
  context. Keep visibility and comfortable lighting on Low/Medium.
- Reuse streaming/rendering systems, but each destination keeps its own road shape, scenery,
  landmarks, tunnels and lighting.
- Validate before merge/deploy with real Chrome/WebGL screenshots + assertions, desktop and
  mobile, landscape and portrait: player + 3 rivals present, ≥3 cars in frustum, jets visible
  when allowed, car screen width 0.65–1.5× a classic reference track, no overlay over Start,
  full-route minimap with four live markers, no shortcut reveal.
- Review CPU/GPU cost, chunk lifetime, draw calls and post-processing per
  `performance-review.md`.
