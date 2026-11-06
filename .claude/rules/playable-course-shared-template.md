---
paths:
  - "src/courses/**"
  - "src/upcoming-scenes/**"
  - "src/upcoming-showcase.ts"
  - "src/upcoming-tracks.ts"
  - "src/upcoming-scenes/index.ts"
  - "src/track-preview.ts"
  - "src/track-swipe.ts"
  - "src/track-swipe-ui.ts"
  - "src/world.js"
  - "src/main.js"
  - "src/garage-*.ts"
  - "src/GaragePanel.vue"
  - "src/vfx-ui.ts"
  - "src/vfx-settings.ts"
  - "tests/*course*"
  - "tests/*upcoming*"
  - "tests/*garage*"
  - "tests/*swipe*"
  - "tests/*showcase*"
  - "tests/*airflow*"
  - "docs/designs/new-tracks/**"
---

# Shared playable-course template: six new courses and future tracks

## Scope and source of truth

This contract covers Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown,
Stormline Megacity, Frostbite Canyon, and every future course. Reuse one shared UI,
vehicle presentation, simulation and race integration system. A course owns **data,
3D terrain, road/surface geometry, landmarks, obstacle descriptors and disposable
scenery only**; it does not own a second swipe controller, Garage, camera dock,
player car model, AIRFLOW input, flight controller or race engine.

Before touching a course, read `AGENTS.md`, `CLAUDE.md`,
`docs/regression-first-workflow.md`, this file,
`docs/superpowers/specs/2026-11-03-playable-coursegraph-contract.md`,
`.claude/rules/track-showcase.md`, `.claude/rules/vehicle-road-stability.md`,
and the map's source handoff/plan. Honor stricter scoped rules as well.

## Home selection and horizontal swipe (all six courses)

- `src/upcoming-tracks.ts` is the single Coming Soon track catalog;
  `src/upcoming-scenes/index.ts` registers only map-owned environment factories.
  `src/upcoming-showcase.ts` is the single host for shared live Three.js player,
  three rivals, camera, paint, jets/VFX, quality tiers and disposal.
- Reuse `src/track-swipe-ui.ts` and `src/track-swipe.ts` for horizontal touch,
  mouse drag and trackpad wheel navigation, plus keyboard and direct card
  selection. Preserve single-card paging, snap-back, non-wrap boundaries,
  one gesture/one selection, contiguous opaque snapshots, Reduced Motion,
  pointer capture and the browser back-swipe exclusion zone. No per-course
  gesture listeners, duplicate canvases, re-created controllers or
  swipe-triggered race starts.
- Each selection must update the pressed card, name, translated CTA, planned
  kilometres, route mini-map, live WebGL environment and active camera as
  one coherent state; only the map-owned visuals change. Return to a classic
  track must restore its original Start/Locked behavior.
- Preserve the existing `#world` renderer, `#track-swipe` dock,
  `#showcase-camera-dock`, `SHOWCASE_VIEWS`, and 50-degree FOV.
  The default hero camera is calibrated in the local route tangent/right/up
  basis, not fixed global axes or a track-specific CSS workaround.

## Home AIRFLOW and vehicle pose

- Existing home-preview semantics are **AIRFLOW ON = road-grounded (landing,
  no hover jets)** and **AIRFLOW OFF = hovering/takeoff display with jets**.
  Do not silently invert these semantics or confuse the AIRFLOW preview
  toggle with the in-race FLY/NITRO/BOOST physical inputs.
- Use `vfxSettings().airflow`, `previewPlayer`, the shared Roadster car
  mesh/paint, `createAeroVFX`, and `showcaseCameraPose`. Do not hardcode
  a distinct hover height, wing, car scale, quality tier, animated lift, or
  steering/flight visual behavior for one course. Road-grounded cars must
  sit on their map's **actual sampled 3D road surface**, including slopes,
  bridges and forks, without wheel clipping or phantom roads.
- Player and three rivals must remain visible and consistently framed;
  keep six camera dock views (drive/front/rear/left/right/orbit), responsive
  portrait framing, Reduced Motion, and existing paint/wing/VFX state.
  Airflow changes the preview pose only; a map remains Coming Soon unless
  separately admitted to the playable race registry after acceptance.

## Garage Home and Preview Studio

- Reuse `src/garage-ui.ts`, `src/garage-camera.ts`,
  `src/garage-view-state.ts`, `src/garage-stage.ts` and
  `src/GaragePanel.vue` for all courses. These screens operate on the same
  player Roadster, equipped paint, cosmetic entitlement and VFX controls;
  they do **not** need course-specific Garage or Studio implementations.
- Ground, Flight and Wing pose buttons must drive the same camera/vehicle
  state in Garage Home and full-screen Preview Studio, with pose retained
  when moving Home ↔ Studio. Camera rotation, zoom, auto-rotate and reset
  remain available and accessible. Closing Garage restores the selected
  home course and its independent AIRFLOW setting; opening Garage again
  may reset the temporary Studio camera to the existing default.
- Share one WebGL canvas by moving `#world` into/out of `#garage-preview`;
  no second renderer or duplicate `#showcase-camera-dock`. Never use
  artwork/gallery samples as a substitute for a functioning 3D preview,
  and never grant a locked cosmetic entitlement as a side effect.

## Race integration and release boundary

- The shared CourseGraph/arc-length frame must determine physical vehicle
  location, wheel contact, directional signed checkpoints, forks, recovery,
  eight-car AI, altitude/layer-aware collision, HUD/minimap and finish/results.
  Use the existing `src/game.js`, `src/world.js`, RaceFactory and physics;
  never invent a second per-course simulation/renderer or flatten genuine
  branch topology into a fake one-dimensional race.
- **Home preview parity does not prove gameplay parity.** A source course
  may pass FULL CI while it remains unregistered and non-playable.
  Keep all Coming Soon restrictions and preserve the existing playable
  tracks until full physical START→FINISH, ground/flight, collision, AI,
  recovery, save, performance and real WebGL acceptance are recorded.
- Ownership: map-specific branches write only their map-owned files;
  `feature/epic-multiroute-longform-tracks` owns shared integration.
  Never merge map branch history, overwrite newer shared files, change
  sibling branches, `develop` or `main`, or deploy without explicit approval.

## Regression matrix and evidence

- Regression-test **all six IDs**, the ten existing racing tracks, Garage
  Home, Preview Studio, landscape desktop, portrait and landscape phone,
  both AIRFLOW states, six camera views, touch/mouse/trackpad/keyboard,
  Reduced Motion, English/Traditional Chinese, paint persistence,
  Coming Soon/Start CTA and proper GPU disposal when changing tracks.
- Relevant tests: `tests/shared-course-template-browser.spec.js`,
  `tests/upcoming-home-browser.spec.js`, `tests/upcoming-showcase.test.js`,
  `tests/track-swipe-browser.spec.js`, `tests/garage-home-pose-browser.spec.js`,
  `tests/garage-studio-browser.spec.js`, `tests/airflow-wake-browser.spec.js`.
- Follow test-first RED → minimal GREEN → refactor; run focused tests,
  `npm test`, `npm run build`, `make verify`, then check the latest
  **exact-HEAD FULL CI** (Unit/Typecheck/Build, Cloud-save, every
  Browser/World Tour shard, quality-gate). Inspect real desktop/mobile
  WebGL screenshots for car/road contact, cockpit silhouette, takeoff/
  landing, camera composition and artwork matching. Skipped/pending,
  isolated or old-SHA tests never count as final acceptance.
