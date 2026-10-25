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
- Composition: with AIRFLOW off, the player hovers gently with visible jets and at least
  one rival flies; other rivals stay near the road. With AIRFLOW on, the player must rest
  on its actual road surface (altitude 0, no hover jets) on ALL tracks, including curved,
  elevated and future routes; other rivals may keep the normal showcase staging. Keep
  the same model, lighting, paint, wing and physics visuals; never hide or shrink the player.
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
  `blocksLandmark()` in `src/world-tour-scene.js`: a prop blocks when, seen from some approach
  point, it sits nearer than the landmark and inside its angular width.
- **Keep the street as rich as before**: `landmarkSafePlan()` never deletes a blocker. It
  moves it to the first clear slot (one plot farther out, the other kerb, 13 m along it, or
  farther out still); a prop with no clear slot stays in place at 45% size. The prop count per
  chunk must equal `sceneryPlan()` (unit-tested). Never clear whole kerbs or thin the approach;
  small props may cross the landmark's edges, never its main body. When terrain itself is the blocker
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

## User-selectable showroom angles

The landmark hero shot is the *default drive angle*, not an unconditional
override. Apply the shared preview angle before any curated fallback in
`src/world.js`. Each future track automatically receives drive/front/rear/
left/right/orbit without adding UI branches. The camera dock is visible in the
ready phase on desktop and touch, accessible and synchronized with the VFX
select, without requiring AIRFLOW.

## AIRFLOW ground contract (all current and future tracks)

`previewPlayer(id, car, ..., groundedShowcase)` must never special-case the curated
`HERO_PREVIEWS` track list when setting the hero's altitude or thrusting. AIRFLOW
on means the player vehicle is attached to the current road (local frame/up axis on
hills, elevated roads and loops); AIRFLOW off preserves the original hovering hero.
Every ready-screen camera mode (drive/front/rear/left/right/orbit) works with AIRFLOW
on and off, independently of VFX for camera selection. Preserve per-track landmark
framing; do not copy and paste camera or vehicle rules for newly added tracks.
Maintain full `RACE_TRACKS` plus unknown-future-ID unit coverage and real WebGL
checks for all World Tour routes at each of the six camera angles.

## Prevent car occlusion without hiding scenery (Tokyo, Alpine and future maps)

- The camera and the hero must have an unobstructed line of sight; merely
  projecting the car center into the viewport is not sufficient. Sample the
  actual 3D body at multiple roof, nose and side points and raycast against
  opaque World Tour scenery. Count points outside the camera frustum as hidden.
- If the default eye is occluded, try a small dolly-back first, then a modest
  side/height offset along the sampled local road axes. Only recalculate when
  the track, view, quality, portrait state or AIRFLOW mode changes (or at
  spaced orbit checkpoints); never raycast or rebuild geometry every frame.
- Retain the landmark-directed look target, original course meshes, details,
  buildings, tunnel scenery and hillside meshes. No transparent/hidden walls,
  scenery wholesale deletion, force-click workaround or copied per-track UI.
- On all five World Tour maps, test AIRFLOW off/on × six camera modes in real
  WebGL, plus actual desktop and phone Home UI interaction and screenshots.
  Require at least four of five sampled vehicle body points unobstructed and
  in frame, and preserve all landmark framing/visibility acceptance checks.
  Inspect the exact CI HEAD and physical-device imagery before shipping.


## Full vehicle silhouette must remain inside the viewport

The existing five sampled roof/corner sight points and 75–80% visibility
threshold are *occlusion* checks, not whole-car framing guarantees. Both
checks are required: raycast actual opaque scenery to preserve visibility,
**and** project the complete vehicle including tires, bumpers and aero pieces
to detect edge clipping. Use the live camera's real aspect ratio (not merely
desktop-vs-portrait) and a small screen-edge safety margin. In particular,
Alpine's high summit-directed look target must not send the vehicle beneath
the bottom of the screen. Reframe shared camera poses minimally (look
adjustment before dolly) while preserving the intended landmark composition,
model scale and scenery. Never hide walls, crop geometry, or add per-map UI.
Keep regression tests for 1440×900, 1777×863 and 390×844 with AIRFLOW on
and off; validate real screenshots for all camera modes on World Tour.
