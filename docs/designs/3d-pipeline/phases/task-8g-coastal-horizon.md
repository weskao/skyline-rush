# Task 8g — Coastal Horizon · 海岸天際: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/coastal/01-aerial-overview.webp): golden hour, rocky headlands, lighthouse, surf.
- [02-lighthouse-rise.webp](../track-profiles/coastal/02-lighthouse-rise.webp), [03-windward-headland.webp](../track-profiles/coastal/03-windward-headland.webp),
  [04-sea-wall-turn.webp](../track-profiles/coastal/04-sea-wall-turn.webp), [05-sheltered-bay.webp](../track-profiles/coastal/05-sheltered-bay.webp).
- [06-route-plan.svg](../track-profiles/coastal/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/coastal/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/coastal/08-cross-section.svg).
- Look items: golden hour, a white lighthouse with keeper's houses on a rocky headland, surf, a guard-railed cliff
  road, a concrete sea wall with scaffold and barriers, green headlands, a sheltered bay.

## Hero landmarks and sources to look for

| Item (`WORLD_THEMES` kind, position) | Source category (CC0 Poly Haven unless stated) | Asset |
|---|---|---|
| Lighthouse and keeper's houses (`lighthouse`, 1,180 m) | painted plaster, roof textures; modelled from reference | to be chosen and recorded in the manifest |
| Bridge (`bridge`, 3,160 m) | concrete / steel | to be chosen and recorded in the manifest |
| Sea arch (`arch`, 4,870 m) | rock scans | Coast scans (`coastal_cliff_01`, `coastal_cliff_02`, `coastal_cliff_04`, `coast_rocks_05`) are candidates |
| Sea wall, scaffold, barriers | concrete, metal | to be chosen and recorded in the manifest |
| Golden-hour sky | HDRI, sunset puresky | Coast `dusk` is a starting candidate; to be chosen and recorded in the manifest |

## Reuses from the shared plan

- Coast is the closest look: cliff and rock scans from `assets-src/coast-scenery/`, shrubs from
  `assets-src/coast-greenery/`, the sea shader in `src/coast-sea.ts` and `coast_sea_waves_1k.ktx2`, the dusk variant.
- `.claude/rules/world-tour.md` and rule item 24: this track keeps its own roadside kit and composition; reusing
  Coast scans as raw material is fine, a re-tinted Coast scene is not.
- World Tour road hook and bloom pick (built once, 8d or 8e).

## New assets needed

- Lighthouse, bridge, sea wall and scaffold GLBs with LODs and masters; arch from scans, original layout.
- Water on a World Tour route: `src/world-tour-scene.js` has its own water plane; driving the Coast sea shader
  there, with a shore mask that follows the framed route, is new shared code in a new module.
- Road set: `coast-asphalt` candidate or a new set; `wetness` for spray zones (to verify).

## Budgets

Road type: World Tour framed road (`TOUR_IDS`), 5,800 m. Pre-pool budget `WORLD_TOUR_SOFTWARE_BASELINE.coastal`
(538 draws, 41,037 triangles), +10% draws and +65% scenery triangles. Sky and sea textures within the Coast
manifest budgets.

## Acceptance checks and guard tests

- Rule items: 13, 15, 19 (lighthouse bearing on the rise), 20, 21 (lamp of the lighthouse reaches the bloom), 24.
- `.claude/rules/track-showcase.md`: `HERO_PREVIEWS.coastal` frames `lighthouse`.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/coast-sea.test.js`,
  `tests/world-tour-showcase-browser.spec.js`, `tests/world-tour-mid-race-browser.spec.js`, `tests/track-preview.test.js`,
  `tests/performance-evidence-gate.test.js`, `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`.
- New (names to be chosen): tour water test, kit GLB tests, look browser spec.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (golden hour only; how far Coast scans may be reused).
- [ ] World Tour road hook, bloom pick and tour water, RED first, Coast unchanged.
- [ ] Sky chosen, built, measured (items 15, 20); manifest rows.
- [ ] Lighthouse, bridge, sea wall and arch with masters, manifest entries, licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup, framing and budget tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at each landmark and the sea wall, desktop and phone, both orientations; home preview.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
