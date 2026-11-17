# Task 8b — Aurora Pass · 極光山道: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/aurora/01-aerial-overview.webp): night, green aurora, snowy peaks, frozen lake.
- [02-black-ice-lakeshore.webp](../track-profiles/aurora/02-black-ice-lakeshore.webp), [03-fir-lined-s-bends.webp](../track-profiles/aurora/03-fir-lined-s-bends.webp),
  [04-avalanche-gallery.webp](../track-profiles/aurora/04-avalanche-gallery.webp), [05-aurora-switchback.webp](../track-profiles/aurora/05-aurora-switchback.webp).
- [06-route-plan.svg](../track-profiles/aurora/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/aurora/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/aurora/08-cross-section.svg).
- Look items: aurora over snow peaks, black ice that mirrors the aurora, snowy fir forest, guard-railed lakeshore
  with bollard lamps, a lit concrete avalanche gallery.

## Hero landmarks and sources to look for

| Item | Source category (CC0 Poly Haven unless stated) | Asset |
|---|---|---|
| Night sky with aurora | no photo HDRI is expected to give it; built sky (procedural or painted dome) | to be chosen and recorded in the manifest |
| Snow peaks, rock | rock / snow textures, terrain modelled | to be chosen and recorded in the manifest |
| Fir trees | vegetation models | to be chosen and recorded in the manifest |
| Avalanche gallery | concrete textures; geometry modelled in Blender | to be chosen and recorded in the manifest |
| Bollard lamps, guard rail | Neon street-furniture pattern, re-dressed | owned geometry |

## Reuses from the shared plan

- Classic road path and the existing road swap; `wetness` table for the ice sections (900–1500, 2800–3500, 4300–4900 m).
- Wet mirror layer (`REFLECT_LAYER` in `src/wet-reflection.ts`) for the lamps and the gallery lights.
- Emissive pattern of `src/neon-scenery.ts` (items 21–23); chunk placement pattern.
- The existing procedural aurora sky uniform in `src/world.js` stays for Low.

## New assets needed

- Aurora night sky: a new `CoastEnvName` variant, its `COAST_ENV_VARIANTS` row, `GLITTER` / `MIRROR_LOD` rows in
  `src/coast-sea.ts`, and a 1K lighting map consistent with the dome (item 18).
- Snow and fir kit GLBs, gallery GLB, lakeshore rail and lamp set; masters and LODs.
- Ice / wet asphalt road set, or `neon-asphalt` if the owner accepts it; `surfaceMarks` stay as they are.
- Water decision for the frozen lake: the `sea` opt-out from the shared plan, or a frozen-lake surface (to verify).

## Budgets

Road type: classic authored route, 5,500 m. Shared-plan budgets as for Coast (home 540 / race 380 draws on High).
Lamps along the shore count against the mirror pass: one draw per lit piece kind, as Neon N6.

## Acceptance checks and guard tests

- Rule items: 13, 15, 18, 20 (key light from the aurora side, lane sweep), 21, 22, 23 (lamp light on snow and paint).
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/shader-warmup-browser.spec.js`,
  `tests/black-frame-browser.spec.js`, `tests/wet-reflection.test.js`, `tests/classic-track-scenery.test.js`.
- New (names to be chosen): route parity pin, aurora sky manifest test, lighting test, scenery plan test, look browser spec with the draw-call cap.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (night only or also day presets).
- [ ] Aurora sky built, measured (items 15, 18, 20); manifest rows; new env variant RED first.
- [ ] Road set and ice `wetness`; lake surface decision.
- [ ] Snow, fir, gallery and lakeshore kits with masters, manifest entries, licences; placement module and tests.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup and draw-call tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures per section, desktop and phone, portrait and landscape.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
