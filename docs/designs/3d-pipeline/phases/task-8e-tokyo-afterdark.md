# Task 8e — Tokyo Afterdark · 東京夜行: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/tokyo/01-aerial-overview.webp): rain night city.
- [02-scramble-crossing.webp](../track-profiles/tokyo/02-scramble-crossing.webp), [03-construction-s-bends.webp](../track-profiles/tokyo/03-construction-s-bends.webp),
  [04-flat-rail-underpass.webp](../track-profiles/tokyo/04-flat-rail-underpass.webp), [05-tower-sprint.webp](../track-profiles/tokyo/05-tower-sprint.webp).
- [06-route-plan.svg](../track-profiles/tokyo/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/tokyo/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/tokyo/08-cross-section.svg).
- Look items: rain night, a scramble crossing with large LED screens and traffic lights, wet reflections,
  an elevated rail line over a column-lined underpass with sodium lamps, a red lattice tower ahead.

## Hero landmarks and sources to look for

Real structures are modelled from reference photos as original geometry; no ripped meshes.

| Landmark (`WORLD_THEMES` kind, position) | Reference | Textures (CC0 Poly Haven) |
|---|---|---|
| Scramble crossing (`crossing`, 1,200 m) | public reference photos | facade, glass, signage: to be chosen and recorded in the manifest |
| Lattice tower (`tower`, 3,300 m) | public reference photos | painted metal: to be chosen and recorded in the manifest |
| Elevated railway (`railway`, 5,180 m) | public reference photos | concrete, steel: to be chosen and recorded in the manifest |
| Night rain sky | city-night HDRI | Neon `nightRain` is a candidate, but it is a Shanghai panorama: a Tokyo or neutral night HDRI to be chosen |

## Reuses from the shared plan

- Neon Downtown is the closest look: `neon-asphalt` road set and its `wetness`, wet mirror layer, Neon street
  furniture (lamps, traffic lights, railings, kerbs) as a pattern, emissive pattern (items 21–23), neon-sky
  measurements (items 15–18, 20).
- `.claude/rules/world-tour.md`: the track keeps its own roadside kit and palette; Neon pieces are re-dressed, not copied.

## New assets needed

- Three landmark GLBs with LODs and masters at the existing `WORLD_THEMES` entries; LED screen content owned or CC0.
- World Tour road hook and bloom pick (shared with 8d, built once).
- Rain default: `RAINY_TRACKS` in `src/board-effects.ts` holds `neon`, `stormline-megacity`, `monsoon-ruins`, not
  `tokyo`, so the `track` preset is dry today. Whether the default becomes rain is an owner decision with
  gameplay and effects impact (to verify); the look maps presets only.
- Construction S-bend kit (barriers, cranes) and underpass columns with sodium lamps.

## Budgets

Road type: World Tour framed road (`TOUR_IDS`), 6,800 m. Pre-pool budget `WORLD_TOUR_SOFTWARE_BASELINE.tokyo`
(657 draws, 40,833 triangles), +10% draws and +65% scenery triangles. Mirror pass: one draw per lit piece kind.

## Acceptance checks and guard tests

- Rule items: 13, 15–18 (city panorama), 19, 20 (key on a street axis, lane sweep), 21, 22 (screens judged by lit area), 23.
- `.claude/rules/track-showcase.md`: `HERO_PREVIEWS.tokyo` frames `tower`; car occlusion checks on Tokyo.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/world-tour-showcase-browser.spec.js`,
  `tests/world-tour-mid-race-browser.spec.js`, `tests/track-preview.test.js`, `tests/performance-evidence-gate.test.js`,
  `tests/wet-reflection.test.js`, `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`.
- New (names to be chosen): sky manifest test, landmark GLB tests, look browser spec.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (rain default, sky source, screen content).
- [ ] World Tour road hook and bloom pick available (8d or here), RED first.
- [ ] Night sky chosen, built, measured (items 15–18, 20); manifest rows.
- [ ] Landmark GLBs and street kits with masters, manifest entries, references and licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup, framing and budget tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at each landmark and the underpass, desktop and phone, both orientations; home preview.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
