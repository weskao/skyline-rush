# Task 8d — Taipei Heritage · 台北古都: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/taipei/01-aerial-overview.webp): dusk city with heritage landmarks and a river.
- [02-presidential-office-boulevard.webp](../track-profiles/taipei/02-presidential-office-boulevard.webp), [03-historic-city-gate.webp](../track-profiles/taipei/03-historic-city-gate.webp),
  [04-temple-market-chicane.webp](../track-profiles/taipei/04-temple-market-chicane.webp), [05-riverside-return.webp](../track-profiles/taipei/05-riverside-return.webp).
- [06-route-plan.svg](../track-profiles/taipei/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/taipei/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/taipei/08-cross-section.svg).
- Look items: dusk, a red-brick office building with a central tower on a palm boulevard, a historic city gate,
  a lantern-lit temple street, a tall tower in the skyline, a riverside return.

## Hero landmarks and sources to look for

Real buildings are modelled from reference photos as original geometry; no ripped meshes. Licence of every
reference and texture recorded. The flag shown in the art is an owner decision (to verify).

| Landmark (`WORLD_THEMES` kind, position) | Reference | Textures (CC0 Poly Haven) |
|---|---|---|
| Presidential Office (`office`, 1,750 m) | public reference photos | brick / plaster: to be chosen and recorded in the manifest |
| City gate (`gate`, 2,630 m) | public reference photos | stone / roof tile: to be chosen and recorded in the manifest |
| Temple street (`temple`, 4,480 m) | public reference photos | painted wood, roof tile: to be chosen and recorded in the manifest |
| Skyline tower silhouette | public reference photos | far-LOD only, to verify |
| Dusk sky | HDRI | Coast `dusk` is a starting candidate; to be chosen and recorded in the manifest |

## Reuses from the shared plan

- Lighting and post modules; dusk HDRI variant if accepted; emissive pattern for lanterns (items 21–23).
- Neon street furniture as a pattern (lamps, railings), re-dressed for this city (`.claude/rules/world-tour.md`:
  shared placement is fine, shared-looking scenery is not).
- The World Tour renderer: `src/world-tour-scene.js` chunk pools and `src/world-tour-landmarks.js` stay; a GLB
  landmark replaces a procedural one only at Medium and above.

## New assets needed

- Three landmark GLBs (office, gate, temple) with LODs and masters, placed at the existing `WORLD_THEMES` entries
  (`at`, `side`, `offset`, `scale`, `yaw` unchanged unless the landmark framing tests ask otherwise).
- A road hook for World Tour: `src/world-tour-scene.js` has its own `roadMat`, and the classic road swap does not
  reach it. New code goes in a new module: `world-tour-scene.js` is at its module-size ceiling (453).
- Boulevard and temple-street kits; river surface decision (the tour scene has its own water plane).
- Bloom: `src/world.js` uses a fixed 0.085 on `TOUR_IDS`; a per-look value is new shared code.

## Budgets

Road type: World Tour framed road (`TOUR_IDS`, `framedRoad`), 6,200 m. Pre-pool budget: `WORLD_TOUR_SOFTWARE_BASELINE.taipei`
(839 draws, 52,455 triangles) within +10% draws and +65% scenery triangles. A High draw-call cap for the detailed
look is an owner decision (shared plan, Budgets).

## Acceptance checks and guard tests

- Rule items: 13, 15, 19 (each landmark from the driver's seat), 21, 22, 23 (lantern light on paint).
- `.claude/rules/track-showcase.md`: `HERO_PREVIEWS.taipei` frames `office`; landmark `unobstructed > 0.6`.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/world-tour-showcase-browser.spec.js`
  and `tests/world-tour-mid-race-browser.spec.js` (`playwright.world-tour.config.js`), `tests/track-preview.test.js`,
  `tests/performance-evidence-gate.test.js`, `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`.
- New (names to be chosen): road hook test, landmark GLB tests, look browser spec.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (dusk only; flag; skyline tower).
- [ ] World Tour road hook and bloom pick in new modules, RED first, other tour tracks unchanged.
- [ ] Sky chosen, built, measured (items 15, 20); manifest rows.
- [ ] Landmark GLBs and street kits with masters, manifest entries, references and licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup, framing and budget tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at each landmark approach, desktop and phone, both orientations; home preview.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
