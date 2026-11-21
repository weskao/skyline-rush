# Task 8h — Cosmic Orbit · 星際軌道: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/cosmic/01-aerial-overview.webp): space, ringed planet, asteroid field, station.
- [02-debris-weave.webp](../track-profiles/cosmic/02-debris-weave.webp), [03-low-gravity-flight.webp](../track-profiles/cosmic/03-low-gravity-flight.webp),
  [04-hyperdrive-channel.webp](../track-profiles/cosmic/04-hyperdrive-channel.webp), [05-docking-sequence.webp](../track-profiles/cosmic/05-docking-sequence.webp).
- [06-route-plan.svg](../track-profiles/cosmic/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/cosmic/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/cosmic/08-cross-section.svg).
- Look items: starfield with a ringed purple planet, asteroids, modular station blocks, a violet-lit road deck on
  pylons, ring flight gates, a square hyperdrive tunnel with violet strip lights.

## Hero landmarks and sources to look for

| Item (`WORLD_THEMES` kind, position) | Source category | Asset |
|---|---|---|
| Space sky, starfield, planets (`planet`, 1,610 m and 6,740 m) | no photo HDRI applies; built dome and planet textures (owned or CC0) | to be chosen and recorded in the manifest |
| Cosmic gate (`cosmic-gate`, 4,100 m) | original geometry; metal textures (CC0 Poly Haven) | to be chosen and recorded in the manifest |
| Station blocks, pylons | original geometry; metal panels (Poly Haven `metal_plate_02` is a candidate) | to be chosen and recorded in the manifest |
| Asteroids | rock scans (CC0 Poly Haven) | to be chosen and recorded in the manifest |

## Reuses from the shared plan

- Lighting and post modules with a new, built environment; PMREM 256.
- Emissive pattern of `src/neon-scenery.ts` for strip lights and gates (items 21–22).
- World Tour road hook and bloom pick (built once, 8d or 8e); GLB pipeline and manifest validation.

## New assets needed

- **Built space environment:** a new `CoastEnvName` variant with its `COAST_ENV_VARIANTS` row, `GLITTER` and
  `MIRROR_LOD` rows, a dome texture and a 1K lighting map built from the same source (item 18). There is no
  sun in the Coast sense: the key light direction is chosen from the planet (item 20).
- No sea: the `sea` opt-out from the shared plan.
- Sci-fi deck road set (KTX2), dry; or the owner accepts an existing set.
- Gate, station, pylon and asteroid GLBs with LODs and masters.

## Budgets

Road type: World Tour framed road (`TOUR_IDS`), 8,000 m, with crosswind sections and a boost tunnel. Pre-pool
budget `WORLD_TOUR_SOFTWARE_BASELINE.cosmic` (438 draws, 38,967 triangles), +10% draws and +65% scenery triangles.
The planets are far objects: one draw each, far LOD only.

## Acceptance checks and guard tests

- Rule items: 13, 15 (dome under the bloom), 18, 19 (gate bearing), 20, 21, 22 (strip lights by lit area).
- `.claude/rules/track-showcase.md`: `HERO_PREVIEWS.cosmic` frames `cosmic-gate`.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/world-tour-showcase-browser.spec.js`,
  `tests/world-tour-mid-race-browser.spec.js`, `tests/world-tour-boost.test.js`, `tests/track-preview.test.js`,
  `tests/performance-evidence-gate.test.js`, `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`.
- New (names to be chosen): space environment manifest test, kit GLB tests, look browser spec.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (planet design, key light, gate style).
- [ ] World Tour road hook, bloom pick and sea opt-out, RED first.
- [ ] Space environment built and measured (items 15, 18, 20); manifest rows; new env variant RED first.
- [ ] Gate, station, pylon and asteroid kits with masters, manifest entries, licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup, framing and budget tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at each landmark and in the boost tunnel, desktop and phone, both orientations; home preview.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
