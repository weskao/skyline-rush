# Task 8c — Sky Spiral · 天際螺旋: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** plan only. No asset, test or capture exists for this look yet.

## Look target and sources

Concept art and mood reference only (rule item 7). No concept-board panel exists for this track.

- [01-aerial-overview.webp](../track-profiles/spiral/01-aerial-overview.webp): tall white tower, banked helix, cloud sea.
- [02-tower-approach.webp](../track-profiles/spiral/02-tower-approach.webp), [03-banked-tower-helix.webp](../track-profiles/spiral/03-banked-tower-helix.webp),
  [04-launch-gap.webp](../track-profiles/spiral/04-launch-gap.webp), [05-cloud-slalom.webp](../track-profiles/spiral/05-cloud-slalom.webp).
- [06-route-plan.svg](../track-profiles/spiral/06-route-plan.svg), [07-longitudinal-profile.svg](../track-profiles/spiral/07-longitudinal-profile.svg),
  [08-cross-section.svg](../track-profiles/spiral/08-cross-section.svg).
- Look items: day sky with cirrus, a white tower with a blue light strip, banked helix road with blue rail lights,
  a cloud sea below, floating spire platforms, an S-bend sky deck with chevron signs.
- The procedural scene in `src/sky-scene.js` uses a darker palette with magenta skyline lights; which time of day
  the detailed look targets is an owner decision (to verify against the brief).

## Hero landmarks and sources to look for

| Item | Source category (CC0 Poly Haven unless stated) | Asset |
|---|---|---|
| Day sky with cirrus | HDRI, puresky | Coast `day` is a starting candidate; to be chosen and recorded in the manifest |
| Tower shell and light strip | painted concrete / metal textures; geometry modelled in Blender | to be chosen and recorded in the manifest |
| Cloud sea | built in engine or as a dome band; no photo source expected | to verify |
| Deck, rails, chevrons | metal and concrete textures | to be chosen and recorded in the manifest |

## Reuses from the shared plan

- Lighting and post modules (`coastEnvPlan`, `coast-look.ts`), HDRI at PMREM 256.
- GLB pipeline, manifest validation, emissive pattern for the rail lights (items 21–22).
- `skyFrame` / `skyPosition` in `src/sky-track.ts` for placement; the procedural tower and skyline stay for Low.

## New assets needed

- **Sky hook in the course's own scene.** `src/coast-sky.ts` parents its dome to the shared `sky` mesh, which
  `src/world.js` hides on `spiral` (`src/sky-scene.js` draws its own backdrop sphere). The detailed sky must
  hang under the Sky Spiral backdrop instead; this is new shared code, written in a new module because
  `src/world.js` is at its module-size ceiling.
- **Road hook.** The classic `road` mesh is hidden on `spiral`, so the KTX2 road swap in `src/coast-assets.ts`
  does not reach this road: a new target for the helix ribbon is needed.
- Tower GLB (one landmark visible through the whole climb, two absolute-distance copies as today), spire platforms,
  deck and rail kit; masters and LODs.
- Bloom value for this track: `src/world.js` picks bloom by track group; the Spiral value is to verify.

## Budgets

Road type: helix (`skyFrame`, `SKY_LENGTH` 5,600 m, helix 1,100–2,200 m, radius 165 m, rise 82 m; launches and gaps
at 2,800, 3,700 and 4,550 m). Draw-call caps as the shared plan (home 540 / race 380 on High) until the owner sets a
track-specific one. The tower stays in view for most of the lap, so its LODs and triangle budget matter more than
on a chunked route.

## Acceptance checks and guard tests

- Rule items: 13, 15, 19 (tower bearing at the approach and on the helix), 21, 22.
- `.claude/rules/vehicle-road-stability.md`: the road frame is untouched; a new road material must not change the
  rendered surface the car sits on.
- Extend: `tests/track-look.test.js`, `tests/track-look-quality-browser.spec.js`, `tests/sky-track.test.js`,
  `tests/sky-scene-streaming.test.js`, `tests/shader-safety.test.js` (scene root), `tests/shader-warmup-browser.spec.js`,
  `tests/black-frame-browser.spec.js`.
- New (names to be chosen): sky hook test (RED today: the dome is hidden on `spiral`), helix road material test,
  look browser spec with the draw-call cap.

**Keeps:** no change to track frame, lanes, collisions, checkpoints or VFX ports; no shader compile after GO;
Low keeps the procedural scene; the course keeps its own in-race song; exact-HEAD CI; owner sign-off by device.

## By project (committed once)

- [ ] Route frozen against the 8–12 km art target and parity pinned before any asset.
- [ ] Look brief with owner decisions (time of day; cloud sea approach).
- [ ] Sky hook and helix road hook in new modules, RED first, Coast and Neon unchanged.
- [ ] Sky chosen, built, measured (items 15, 20); manifest rows; bloom value.
- [ ] Tower, platform, deck and rail GLBs with masters, manifest entries, licences.
- [ ] `TRACK_LOOKS` entry; Low, fallback, warmup and draw-call tests GREEN.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at the approach, helix entry, mid-helix, exit and each launch, desktop and phone, both orientations.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
