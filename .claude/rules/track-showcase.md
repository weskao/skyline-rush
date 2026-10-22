---
paths:
  - "src/track-preview.js"
  - "src/world.js"
  - "src/sky-scene.js"
  - "src/world-tour-scene.js"
  - "src/world-tour-scenery.js"
  - "src/world-tour-landmarks.js"
  - "src/aero-vfx.js"
  - "src/App.vue"
  - "tests/*showcase*"
  - "tests/presentation*"
  - "tests/track-preview.test.js"
  - "tests/fixtures/world-tour-mid-race.html"
---

# Home-screen 3D preview parity — every track, existing and new

A track is not shippable until its ready-screen showcase matches the others in quality,
legibility, motion and camera scale.

- Live Three.js world: player Roadster, three rivals, driveable road, landmarks, scenery. No
  flat illustration, thumbnail or empty sky.
- Signature landmark: the showcase frames the map's main landmark (section below).
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

## Signature landmark — home preview and in-race sightline

Selecting a map on the home screen shows its main landmark in the live preview (Taipei →
Presidential Office, Tokyo → Tokyo Tower, Alpine → peak, Coastal → lighthouse, Cosmic → cosmic
gate). Every new map ships the same way.

- **Preview point**: `HERO_PREVIEWS` entry (`src/track-preview.js`) names the `landmark` kind;
  its `distance` puts the landmark 150–600 m ahead. Neither the camera (12 m behind the car)
  nor the landmark may sit in a tunnel, boost-tunnel or shortcut; crosswind/uphill are fine.
  Frame with `lookHeight` only; keep the chase-camera offsets and car scale.
- **Side of the road**: the three-quarter camera looks ~30° left of the road. A **left-side**
  (`side:-1`) landmark lands center-right in landscape, right of the home UI panel; a right-side
  one only fits where the road bends toward it. Landscape: NDC x within 0.04–0.98, top below
  0.98. Portrait: center on screen.
- **No occlusion, near or far**: geometry is fixed and only placement changes (`at`, `side`,
  `offset`, `scale`, `yaw` in `WORLD_THEMES`). The landmark's `plaza` (metres before it) runs
  `blocksLandmark()` in `src/world-tour-scene.js`: a roadside prop is dropped only when, seen
  from some approach point, it sits nearer than the landmark and inside its angular width.
  Never clear whole kerbs; the street must stay populated. When terrain itself is the blocker
  (valley walls), open a `TERRAIN_VISTAS` entry in `src/world-tour-scenery.js` (terrain mesh
  and prop heights share `terrainHeight`, so no seams).
- **Measure, do not eyeball**: `world.inspectLandmarks()` (QA only) reports projected
  mesh-vertex bounds and `unobstructed`, the share of rays that land on the landmark's own
  geometry with nothing in front. The fixture preview probe renders 60 frames so the FOV
  settles at 50° as on the real home; one frame overstates how central a landmark is.
- **Tests per map**: unit check in `tests/track-preview.test.js`; browser checks in
  `tests/world-tour-showcase-browser.spec.js` — landscape + portrait home framing and in-race
  approach stops (`unobstructed > 0.6`). Run them with `playwright.world-tour.config.js` (the
  default config ignores them).
- **Visual proof before merge**: real-app home screenshots (not only the fixture) with each map
  selected, plus an in-race drive-through of the approach.
