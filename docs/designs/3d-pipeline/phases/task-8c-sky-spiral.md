# Task 8c — Sky Spiral · 天際螺旋: detailed 3D look

Part of [task-8-track-look-shared-plan.md](task-8-track-look-shared-plan.md) · Proposed (not in spec v2) · Scope tags: [README.md](README.md).

**Status:** built on `feature/sky-spiral-3d-look` (2026-11-19), unit-tested and built; not merged. No browser spec has
been run and no WebGL capture exists: the owner asked for no browser tests on this task. Every browser- and
device-dependent line below is open.

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
| Day sky with cirrus | HDRI, puresky | Coast's `day` sky, reused as it is (`coastEnvPlan('spiral', …)`): no new file or manifest row |
| Tower shell and light strip | painted concrete / metal textures; geometry modelled in Blender | `spiral-landmarks` (`tower`, `tower_far`): Poly Haven `concrete_panels`, `blue_metal_plate` (`assets-src/spiral-landmarks/sources.json`) |
| Cloud sea | cloud GLB models (owner decision) | `spiral-landmarks` (`cloud_a`, `cloud_b`, `cloud_c`), 76 placed on the race lap; snow peaks from `snow_field_aerial`, `aerial_rocks_02` |
| Deck, rails, chevrons | metal and concrete textures | Road deck: the procedural ribbon with the look's KTX2 road set. Rails: the procedural trim, recoloured while the kit is drawn. Chevron signs, gap markers, struts, platforms and stations: `spiral-landmarks` |

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
- Bloom value for this track: Coast `day`'s (strength 0.36, threshold 1.15) while the day look is applied; the kit's
  emissive strength is 3.4 (`SPIRAL_EMISSIVE`), which puts the blue strip at 1.09x the threshold.

## Budgets

Road type: helix (`skyFrame`). Measured on 2026-11-19 from `src/sky-track.ts` and `src/race-tracks.ts`:
`SKY_LENGTH` 10,000 m (`profileLength('spiral')`), helix 1,850–3,250 m, radius 222.2 m, rise 104 m; launches at
4,650, 5,550 and 6,350 m with gaps at 4,720–4,785, 5,625–5,690 and 6,430–6,500 m; shortcut 7,220–7,720 m;
`layoutVersion` 7. The route is inside the 8–12 km art target, so it is frozen unchanged (no new layout id, records,
ghosts and cloud-save ids untouched) and pinned by `tests/sky-spiral-parity.test.js`.
Draw-call caps: home 540 / race 380 on High, as the shared plan (owner decision, 2026-11-19: no track-specific cap).
The tower stays in view for most of the lap, so its LODs and triangle budget matter more than on a chunked route.

Measured without a browser (2026-11-19): `spiral-landmarks.glb` 983,356 bytes and 9,163 triangles (budget 1.5 MB /
11,000), one material, base colour 2048 px and three 1024 px maps; twelve instanced draws, eleven at once; 168
placements on the race lap, at most 135 within the 2.6 km draw range (5,800 m), where the kit draws 56,288 triangles
with the full tower. Draw calls, scene triangles, GPU bytes and p50/p95 need a browser: not run: the owner asked for no browser tests on this task (2026-11-19).

## Owner decisions (2026-11-19)

- Route length may move within 8–12 km to fit the art; outside that range the owner is asked first. Not used: the
  shipped 10 km route fits.
- Time of day: day sky, as the concept art. Low keeps the dark procedural scene.
- Cloud sea: cloud GLB models (not an engine plane, not a dome band).
- Draw-call cap: the shared home 540 / race 380.

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

- [x] Route frozen against the 8–12 km art target and parity pinned before any asset. Evidence: 10,000 m measured,
  `node --test tests/sky-spiral-parity.test.js` 4 of 4 (a pin of shipped behaviour: GREEN from the start, no RED run).
- [x] Look brief with owner decisions (time of day; cloud sea approach). Evidence:
  [sky-spiral-look-brief.md](../../sky-spiral-look-brief.md), decisions recorded above.
- [x] Sky hook and helix road hook in new modules, RED first, Coast and Neon unchanged. Evidence: `src/spiral-look.ts`
  (`5d7710aa`), `node --test tests/spiral-look.test.js` 8 of 8 (RED before the module existed); `src/world.js` did not
  grow; `npm test` at `5fd333d7`: 3,464 pass, 0 fail, 4 skipped (Coast and Neon suites included).
- [x] Sky chosen and bloom value: Coast's `day` sky and bloom, so item 15 is Coast's measurement and no manifest row is
  added. Evidence: `tests/spiral-look.test.js` (*the day sky is Coast's, dome gain and bloom threshold included*).
- [ ] Item 20 on this lap (the sun on the car's rear deck, per straight and lane): needs real WebGL frames; not run: the owner asked for no browser tests on this task (2026-11-19).
- [x] Tower, strut, platform, station, sign, gap-marker, cloud and peak GLB nodes with master, manifest entry and
  licences. Evidence: `e5460e12`, `assets-src/spiral-landmarks/` (master, build scripts, `sources.json`: CC0),
  `SPIRAL_MODELS` in `src/model-manifest-spiral.ts`, `node --test tests/spiral-landmarks-glb.test.js` 12 of 12 (the
  plan-size guard RED on the nominal sizes first). The GLB was checked by its tests and Cycles renders of the master,
  never in three.js/WebGL.
- [ ] Deck and rail GLBs: not built. The deck is the procedural ribbon with the KTX2 road set and the rails are the
  procedural trim in the day palette; whether they need models is an art call on real captures.
- [x] `TRACK_LOOKS` entry; Low and load-failure fallback unit tests GREEN. Evidence: `6b4bdf3a`,
  `node --test tests/spiral-scenery.test.js tests/spiral-scenery-plan.test.js tests/track-look.test.js` 22 of 22, plus the
  lit-instance check in `tests/shader-safety.test.js` and the hook order in `tests/sky-scene-streaming.test.js`.
- [ ] No compile after GO, the home 540 / race 380 draw-call caps, warm-before-GO and the NaN scan: written in
  `tests/spiral-look-browser.spec.js` and `tests/track-look-quality-browser.spec.js` (`5fd333d7`), never executed; not run: the owner asked for no browser tests on this task (2026-11-19).
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI. Feature branches do not run the full remote CI;
  `make verify` includes the browser stages (not run: the owner asked for no browser tests on this task (2026-11-19)).

## By device (repeat per machine; evidence in ignored ../audits/)

- [ ] Real WebGL captures at the approach, helix entry, mid-helix, exit and each launch, desktop and phone, both orientations.
- [ ] Draw calls, triangles, p50/p95 recorded.
- [ ] Owner sign-off on this device.
