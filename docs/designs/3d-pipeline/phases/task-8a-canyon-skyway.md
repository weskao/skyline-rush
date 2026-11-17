# Task 8a — Canyon Skyway · 峽谷天橋: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only, never a screenshot target (rule item 7). No concept-board panel exists for
this track ([../concept-art/README.md](../concept-art/README.md)).

- [01-aerial-overview.webp](../track-profiles/canyon/01-aerial-overview.webp): red sandstone mesas, start grid with service buildings, gorge.
- [02-cliff-ledge.webp](../track-profiles/canyon/02-cliff-ledge.webp), [03-broken-slab.webp](../track-profiles/canyon/03-broken-slab.webp),
  [04-rock-cut-hairpin.webp](../track-profiles/canyon/04-rock-cut-hairpin.webp), [05-mesa-sweep.webp](../track-profiles/canyon/05-mesa-sweep.webp).
- [06-route-plan.svg](../track-profiles/canyon/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/canyon/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/canyon/08-cross-section.svg).
- Look items: clear desert sky with a hard sun, layered red sandstone walls, a broken concrete slab bridge on piers
  over the gorge (the `gap` sections), chevron signs and dust at the rock-cut hairpin.

## Hero landmarks and sources to look for

| Item | Source category (CC0 Poly Haven unless stated) | Asset |
|---|---|---|
| Sandstone walls and mesas | rock / cliff scans | to be chosen and recorded in the manifest |
| Broken slab bridge, piers | concrete textures; geometry modelled in Blender | to be chosen and recorded in the manifest |
| Desert floor, scree | ground / sand textures | to be chosen and recorded in the manifest |
| Clear sky | HDRI, sunny clear sky | Coast `day` is a starting candidate; a clear desert puresky to be chosen |
| Service buildings at the grid | modelled from reference | owned geometry |

No ripped meshes. Every source keeps its licence and sha256 in a `sources.json` as `assets-src/neon-city/sources.json` does.

## Reuses from the shared plan

- Classic road path: the road swap in `src/coast-assets.ts` already reaches the classic `road` mesh this track uses.
- Coast daylight sky build (`assets-src/coast-sky/build.py`) and the shared lighting, post and dome modules.
- Instanced chunk placement pattern of `src/coast-scenery-glb.ts`, keyed by `classicRoadRoute('canyon')` distance and seed (signature to verify).
- GLB pipeline in `scripts/assets/`; manifest validation; wetness table (dry by default).

## New assets needed

- Sandstone kit GLB (wall segments, mesa silhouettes, boulders) with LODs and `.blend` master.
- Slab bridge and pier GLB fitted to the existing gap sections (1500–1560, 3000–3070, 4400–4470 m in `src/race-tracks.ts`) without moving them.
- Desert road set (KTX2) if the owner rejects `coast-asphalt` for this track.
- A `sea` opt-out: `src/coast-sea.ts` shows water on any track with an HDRI plan, and this track has no sea.
- A per-track model manifest module (`src/model-manifest-canyon.ts`, name to verify) and a placement module.

## Budgets

Road type: classic authored route (not in `TOUR_IDS`, not `framedRoad`), 6,000 m. Shared-plan budgets apply as for
Coast: draw calls home 540 / race 380 on High, no compile after GO, dome and road set per `COAST_SKY_MANIFEST` and
`MATERIAL_MANIFEST` limits, GLB entries with their own triangle and byte caps.

## Acceptance checks and guard tests

- Rule items to check: 13, 15, 19 (bridge and mesas from the driver's seat), 21.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/shader-warmup-browser.spec.js`,
  `tests/black-frame-browser.spec.js`, `tests/classic-track-scenery.test.js` (procedural scenery still drawn on Low).
- New (names to be chosen): route parity pin, sky manifest test, scenery plan test, look browser spec with the draw-call cap, sea opt-out test (RED on today's code).

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (time of day, presets that get the look).
- [ ] Sea opt-out in shared code, RED first, Coast and Neon unchanged.
- [ ] Sky source chosen, built, measured (items 15, 20); manifest rows.
- [ ] Road set decision; `wetness` per preset.
- [ ] Sandstone kit, bridge GLB, masters, manifest entries, licences; placement module and tests.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup and draw-call tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures per section, desktop and phone, portrait and landscape.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
