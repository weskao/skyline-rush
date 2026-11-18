# Task 8f — Alpine Rail Pass · 山岳鐵道: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/alpine/01-aerial-overview.webp): granite peaks with snow, stacked hairpins, rack railway.
- [02-uphill-hairpin.webp](../track-profiles/alpine/02-uphill-hairpin.webp), [03-granite-rail-portal.webp](../track-profiles/alpine/03-granite-rail-portal.webp),
  [04-avalanche-chute.webp](../track-profiles/alpine/04-avalanche-chute.webp), [05-ridge-descent.webp](../track-profiles/alpine/05-ridge-descent.webp).
- [06-route-plan.svg](../track-profiles/alpine/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/alpine/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/alpine/08-cross-section.svg).
- Look items: clear day, granite and snow, hairpins on retaining walls, a red rack-railway train, a stone tunnel
  portal, a snow-roofed avalanche gallery, an open chute with snow fences and boulders.

## Hero landmarks and sources to look for

| Item (`WORLD_THEMES` kind, position) | Source category (CC0 Poly Haven unless stated) | Asset |
|---|---|---|
| Tunnel portal (`tunnel`, 1,760 m) | stone / masonry textures; geometry modelled | to be chosen and recorded in the manifest |
| Rack railway and train (`railway`, 3,850 m) | painted metal; train modelled from reference | owned geometry; textures to be chosen |
| Summit (`mountain`, 6,180 m) | rock / snow scans or terrain textures | to be chosen and recorded in the manifest |
| Snow fences, boulders, retaining walls | wood, rock, concrete | to be chosen and recorded in the manifest |
| Clear day sky | HDRI, puresky | Coast `day` is a starting candidate; to be chosen and recorded in the manifest |

## Reuses from the shared plan

- Lighting and post modules; daylight sky build (`assets-src/coast-sky/build.py`).
- World Tour road hook and bloom pick (built once, 8d or 8e).
- GLB pipeline and manifest validation; chunk pools of `src/world-tour-scene.js`.
- `.claude/rules/world-tour.md`: the railroad bore stays dark and enclosed with rare amber service lamps; terrain
  joins exactly at chunk boundaries; `TERRAIN_VISTAS` keeps the summit visible.

## New assets needed

- Portal, gallery, rack railway and train, snow fence and retaining wall kits with LODs and masters.
- A mountain road set (dry asphalt, snow edges) or an accepted existing set; `wetness` stays low.
- Summit GLB or far terrain that keeps the landmark framing (`HERO_PREVIEWS.alpine` frames `mountain`).

## Budgets

Road type: World Tour framed road (`TOUR_IDS`), 7,600 m, with uphill, tunnel and boost-tunnel sections.
Pre-pool budget `WORLD_TOUR_SOFTWARE_BASELINE.alpine` (447 draws, 40,297 triangles), +10% draws and +65% scenery
triangles. Tunnel lights keep a constant visible-light count (`.claude/rules/performance-review.md`).

## Acceptance checks and guard tests

- Rule items: 13, 15, 19 (portal and summit bearing), 20 (sun on a straight's axis, lane sweep), 21.
- `.claude/rules/track-showcase.md`: summit framing and the full-car silhouette check on Alpine.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/world-tour-showcase-browser.spec.js`,
  `tests/world-tour-mid-race-browser.spec.js`, `tests/world-tour-tunnels.test.js`, `tests/track-preview.test.js`,
  `tests/performance-evidence-gate.test.js`, `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`.
- New (names to be chosen): kit GLB tests, look browser spec.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (day only; train motion or static).
- [ ] World Tour road hook and bloom pick available, RED first.
- [ ] Sky chosen, built, measured (items 15, 20); manifest rows.
- [ ] Portal, gallery, railway, train and terrain kits with masters, manifest entries, licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup, framing and budget tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at each landmark and inside each bore, desktop and phone, both orientations; home preview.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
