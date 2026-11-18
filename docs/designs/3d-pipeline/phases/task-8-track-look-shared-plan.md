# Task 8 — Shared track-look plan: one recipe for a track's detailed 3D look

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · **Proposed (not in spec v2)** · Scope tags: [README.md](README.md).

**What this is:** the reusable recipe for giving one track a detailed look on Medium and above, taken from how Coast
([task-5-coast-pbr-road.md](task-5-coast-pbr-road.md), [coast-full-scene-gap.md](coast-full-scene-gap.md)) and
Neon Downtown ([task-5b-neon-downtown.md](task-5b-neon-downtown.md)) were actually built. Per-track plans 8a to 8h
apply it; [Task 6](task-6-new-tracks-showcase.md) applies it to the six Phase 4–5 courses.
**Docs only.** Code was read at the branch HEAD on 2026-11-18, not verified at runtime. Rule item numbers refer to
`.claude/rules/3d-asset-pipeline.md`.

## Inventory (2026-11-18)

Source: `TRACK_NAMES` in `src/i18n.ts` (its `upcomingNames` spread reads `UPCOMING_TRACKS` in
`src/upcoming-tracks.ts`, which takes Frostbite Canyon from `src/stage2-tracks.ts`) and `TRACK_LOOKS` in
`src/track-look.ts`.

**17 tracks, 2 with a registered detailed look, 6 covered by Task 6, 8 need a plan (Tasks 8a–8h); 1 has no plan and
no track-profile art yet: needs an owner brief first.**

| Id | Name (en · zh-TW) | Road type (`src/world.js`) | Detailed look |
|---|---|---|---|
| `coast` | Coast · 海岸公路 | classic, authored route (`classicRoadRoute`) | Registered (Task 5) |
| `neon` | Neon Downtown · 霓虹都會 | classic, authored loop | Registered (Task 5b) |
| `canyon` | Canyon Skyway · 峽谷天橋 | classic, authored route | [Task 8a](task-8a-canyon-skyway.md) |
| `aurora` | Aurora Pass · 極光山道 | classic, authored route | [Task 8b](task-8b-aurora-pass.md) |
| `spiral` | Sky Spiral · 天際螺旋 | helix (`src/sky-track.ts`, `src/sky-scene.js`) | [Task 8c](task-8c-sky-spiral.md) |
| `taipei` | Taipei Heritage · 台北古都 | World Tour framed (`TOUR_IDS`) | [Task 8d](task-8d-taipei-heritage.md) |
| `tokyo` | Tokyo Afterdark · 東京夜行 | World Tour framed | [Task 8e](task-8e-tokyo-afterdark.md) |
| `alpine` | Alpine Rail Pass · 山岳鐵道 | World Tour framed | [Task 8f](task-8f-alpine-rail-pass.md) |
| `coastal` | Coastal Horizon · 海岸天際 | World Tour framed | [Task 8g](task-8g-coastal-horizon.md) |
| `cosmic` | Cosmic Orbit · 星際軌道 | World Tour framed | [Task 8h](task-8h-cosmic-orbit.md) |
| `harbor-circuit` | Harbor Circuit · 港灣環道 | circuit (`CIRCUIT_ID`, `src/circuit-track.ts`) | **No plan and no track-profile art yet: needs an owner brief first** |
| `dune-tempest`, `monsoon-ruins`, `skyfall-archipelago`, `volcanic-crown`, `stormline-megacity`, `frostbite-canyon` | Dune Tempest · 沙暴裂谷, Monsoon Ruins · 雨林失落神殿, Skyfall Archipelago · 浮空群島, Volcanic Crown · 熔火天脊, Stormline Megacity · 霓虹暴雨都市, Frostbite Canyon · 極地冰原峽谷 | CourseGraph courses | [Task 6](task-6-new-tracks-showcase.md) |

**Route first.** The game routes of tracks 03–10 are 5.5 to 8 km today (`src/race-tracks.ts`); the
[track-profile art](../track-profiles/README.md) draws 10 km routes with an 8–12 km integration target. Scenery is
placed by route distance, so a route change after look-dev moves every placement. Neon reshaped its route first
and pinned it (`tests/neon-parity.test.js`); each 8x plan does the same: route frozen and pinned, then art.

## How Coast and Neon were built

| Layer | Coast | Neon Downtown | Shared runtime |
|---|---|---|---|
| Look brief | `../coast-look-brief.md` | `../neon-look-brief.md` | — |
| Sky + lighting HDRI | `assets-src/coast-sky/build.py` (four Poly Haven puresky HDRIs, sun direction, p90 dome gain) | `assets-src/neon-sky/` (`fetch.py`, `build.py`, `hdr_io.py`, `manifest.json`, `sources.json`; city panorama: `FILL`, `SOFTEN`, `on_street_axis`) | `src/coast-lighting.ts` (`COAST_ENV_VARIANTS`), `src/coast-sky-manifest.ts`, `src/coast-sky.ts`, `src/coast-environment.ts`, `src/coast-look.ts`; files in `public/environments/` and `public/environments/sky/` |
| Road | `assets-src/coast-asphalt/` (`bake.py`, `preview.py`, `.blend`) | `assets-src/neon-asphalt/` (+ `README.md`), land: `assets-src/neon-pavement/` | `src/coast-road-material.ts`, `src/wet-reflection.ts`, `src/material-manifest.ts`; files in `public/materials/<id>/` |
| Scenery | `assets-src/coast-scenery/` (scans, `build/`, `asset-brief.md`), `coast-greenery/`, `coast-boats/` | `assets-src/neon-city/` (`modules.json`, `sources.json`, `summary.json`, `build/`), `neon-landmarks/` (`contract.json`, `build/lighting.py`) | `src/model-manifest.ts`, `src/model-manifest-neon.ts`; GLBs in `public/models/<id>/` |
| Placement | `src/coast-scenery-glb.ts` (120 m chunks, 480 m far slots), `src/coast-greenery.ts`, `src/coast-boats.ts` | `src/neon-scenery-plan.ts` (sectors, chunk plan), `src/neon-scenery.ts` (kit pools, emissive) | — |
| Water | `assets-src/coast-sea/build.py` → `public/environments/sea/coast_sea_waves_1k.ktx2`, `src/coast-sea.ts` | sea plane kept as the canal | — |
| Host | `src/coast-assets.ts` (`createCoastAssets`, `createWorldCoastAssets`) | same | `src/asset-model-loader.ts` |
| Pipeline | `scripts/assets/fetch_polyhaven.py`, `export-glb.mjs` + `export_glb.py`, `optimize-glb.mjs`, `check-glb.mjs`, `common.mjs` | `neon-city/fetch_sources.py`, `neon-landmarks/fetch_sources.py` | — |

## Runtime contract (every new look keeps it)

- One entry in `TRACK_LOOKS` (`src/track-look.ts`): `env`, `road`, `wetness`, optional `scenery`, `boats`,
  `landmarks`, `ground`. Lighting, sky, sea and asset host read the entry, never the track id
  (`tests/track-look.test.js`). Rule item 13.
- `detailedTrackLook()` is the only quality gate: Low returns no look, so Low keeps RoomEnvironment and the
  procedural scene. There is no URL switch; the historical `?look=3d` gate (`src/look-gate.ts`) no longer exists.
- Required scenery attaches and warms before GO (`sceneryPending`); swaps happen only outside a race; a failed set
  keeps its fallback and reports `fallback:<reason>` in the canvas dataset.
- `PMREM_CUBE_SIZE` 256 for every HDRI, so swapping `scene.environment` compiles nothing; programs stay constant
  after GO.
- Track frame, lanes, collisions, checkpoints, rings and VFX ports never move for art (rule item 5).
- Each course keeps its own in-race song (`src/music-tracks.ts`); the look does not touch audio.

## Reuse table

| Area | Reusable as-is | Needs a parameter change (which) | Must be new |
|---|---|---|---|
| Source fetch | `scripts/assets/fetch_polyhaven.py` run flow, cache outside the repo, sha256 record | add ids to its `SOURCES` (and `survey` terms) | sources outside Poly Haven need their own `sources.json` record (pattern: `neon-city/sources.json`) |
| GLB pipeline | `export-glb.mjs`, `export_glb.py`, `optimize-glb.mjs`, `check-glb.mjs`, `common.mjs` | per-asset slot override in `optimize-glb.mjs` when an atlas misses its byte budget | — |
| Road bake | `coast-road-material.ts` shader (3 maps, `packed.b` puddle mask, wetness, mirror, Ultra detail normal) | copy of `neon-asphalt/bake.py` with `SCAN`, `FILES`, `CROP`, `GRADE_*`, `TILE_M`, `LANE_CENTRES_M`, `SEED` (the three bakes are near-copies: 137 and 259 differing lines; generalising them is optional cleanup) | a road whose width or lane layout differs from the 24 m classic road |
| Road sets | `coast-asphalt`, `neon-asphalt`, `neon-pavement` as candidates where the owner accepts their look | `TrackLook.road` / `ground`, `wetness` table per preset | a set for a surface no set covers (snow, ice, sci-fi deck) |
| Daylight sky | `assets-src/coast-sky/build.py` (dome KTX2, sun direction, p90 gain, disc) | its HDRI list; `COAST_SKY_MANIFEST.skies` rows | — |
| City or night sky | `assets-src/neon-sky/build.py` measurements (`sky.horizon`, `sky.bandByLon`, `key.elevationDeg`) | gain from `sky.horizon` (item 15), fill wedge, street axes | a sky no photo HDRI gives (space, aurora) |
| HDRIs on disk | Coast `day`/`dusk`/`rain`/`fog`, Neon `night`/`nightRain` | — (reuse by name in `env`) | any new HDRI: new `CoastEnvName` member + `COAST_ENV_VARIANTS` row + `GLITTER` / `MIRROR_LOD` rows in `src/coast-sea.ts` |
| Lighting/post | `coast-look.ts`, `coast-environment.ts` (`capRadiance`), `coastEnvPlan()` | per-variant `intensity`, `exposure`, `grade`, `bloom`, `radianceCap`, `sun`, `sky.*`, `carSky` | bloom pick for World Tour and Sky Spiral (`src/world.js` uses a fixed 0.085 on `TOUR_IDS`) |
| Sky dome | `coast-sky.ts` on classic roads | sun azimuth (`COAST_SUN_AZIMUTH` is shared by every sun sky; per-look value to verify) | Sky Spiral: the dome is a child of the shared `sky` mesh, which `world.js` hides on `spiral` |
| Water | `coast-sea.ts` shader and `coast_sea_waves_1k.ktx2` | a `sea` flag on `TrackLook` (today the water shows on **any** track with an HDRI plan) | water on World Tour routes (`world-tour-scene.js` has its own `water` plane); shore mask for a non-classic route |
| Close scenery | instanced-pool pattern of `createCoastModelLayer` / `createNeonScenery` (one `InstancedMesh` per piece and LOD band, chunk eviction) | piece list (`COAST_PIECES`, `PIECE_DEPTH`, `MAX_PER_CHUNK`; `NEON_PIECES`), chunk metres, `AHEAD` window | a placement module per track (`<track>-scenery-plan.ts`); World Tour / helix placement from `trackFrame` / `skyFrame`, not `classicRoadRoute` |
| Kits | Coast cliff/rock scans (Coastal Horizon), `coast-greenery` shrubs, Neon street furniture (lamp, traffic light, railing, kerb) | Neon painter `assets-src/neon-city/build/` with a new atlas (`cells.py`, `atlas.py`; the Neon atlas is 98.2% full, item 24) | every hero landmark (Blender, owned or CC0, `contract.json` pattern) |
| Emissive | `EMISSIVE` / `PIECE_EMISSIVE` pattern in `src/neon-scenery.ts` | per-kit and per-piece strength (items 21–23) | — |
| Asset host | `lateModel()`, `roadSet()`, `sweep()`, `sceneryPending` in `src/coast-assets.ts` | — | slots are hard-coded per id (`coast-scenery`, `coast-boats`, `neon-city`, `neon-landmarks`) and the road swap reaches only the classic `road` mesh (hidden on `spiral` and `TOUR_IDS`): generalise to a list of slots per look and a road target per road type |
| Manifests | `validateManifestEntry`, `MATERIAL_MANIFEST` shape | — | per-track model file like `src/model-manifest-neon.ts` (`src/model-manifest.ts` is 354 of 400 lines) |
| Tests | `tests/rendering-quality.test.js`, `tests/model-manifest.test.js` (every entry), `tests/shader-warmup.test.js`, `tests/wet-reflection.test.js` | `tests/track-look.test.js` (cases), `tests/track-look-quality-browser.spec.js` (its track table), `tests/shader-safety.test.js` (add the new scene root), `tests/black-frame-browser.spec.js` and `tests/shader-warmup-browser.spec.js` (run the track) | per-track copies of `neon-sky-manifest`, `neon-lighting`, `neon-scenery-plan`, `neon-scenery`, `neon-asphalt-material`, `neon-landmarks-glb`, `neon-parity`, `neon-assets` tests and a `<track>-look-browser.spec.js` with the draw-call cap |

Module size: `src/world.js` (994) and `src/world-tour-scene.js` (453) sit at their `LEGACY_CEILINGS` in
`tests/module-size.test.js`; new wiring goes in new modules.

## Budgets (per track, High unless stated)

| Budget | Value to meet | Where it is pinned today |
|---|---|---|
| Draw calls | home 540, race 380 (Neon N6: "the same caps as Coast") | `DRAW_CALL_CAP` in `tests/coast-scenery-browser.spec.js`, `tests/neon-look-browser.spec.js` |
| Programs | no compile after GO; HDRI at PMREM 256 | `tests/shader-warmup-browser.spec.js`, `PMREM_CUBE_SIZE` |
| Sky dome | 4096 wide (8192 on Ultra with `maxTextureSize >= 8192`); download 2.6 / 8.6 MB, GPU 5.6 / 22.4 MB, one sky on the GPU | `COAST_SKY_MANIFEST.budgets` |
| Road set | 1024 on Medium, 2048 on High/Ultra; `coast-asphalt`: download 3.3 / 13 MB, GPU 4.5 / 17.5 MB | `TIERS`, `MATERIAL_MANIFEST[...].budgets` |
| GLB | per entry `triangles` / `bytes` / `textureMaxPx` (Coast scenery 63.5k / 6 MB / 1024; Neon city 11k / 1.3 MB / 2048; Neon landmarks 32k / 4 MB / 2048) | `src/model-manifest.ts`, `src/model-manifest-neon.ts` |
| Scene triangles | no cap test; record per sector (Coast High race 406k to 495k, Task 5) | ignored `../audits/` |
| Chunk window | Medium 4, High 6 chunks ahead; far slots Medium 3, High 4 | `AHEAD`, `FAR_SLOTS` (`src/coast-scenery-glb.ts`, `src/neon-scenery-plan.ts`) |
| Frame time | p50/p95 per device class, Mac and phone | `make perf`, `make perf-phone`, `make phone-diag` (by device) |
| World Tour pre-pool budget | draws within +10% and scenery triangles within +65% of `WORLD_TOUR_SOFTWARE_BASELINE` (software WebGL: taipei 839, tokyo 657, alpine 447, coastal 538, cosmic 438 draws) | `src/performance-evidence.ts`, `scripts/verify-performance-evidence.mjs`, `tests/performance-evidence-gate.test.js` |

The World Tour software baselines already sit above the Coast/Neon race cap of 380, and they are measured on a
different renderer path, so the 380 cap cannot be copied to 8d–8h as is. Which cap applies (a new per-track cap
measured on High, or the pre-pool budget alone) is an owner decision recorded in each 8d–8h brief: to verify.

Road type changes placement, not the caps: a classic road keys chunks by `classicRoadRoute` distance and seed; a World
Tour route already draws its own pools (`src/world-tour-scene.js`, `world-tour-batching`, `world-tour-pool-culling`
tests), so its baseline draw count is measured before any GLB is added; Sky Spiral keeps one tower in view for the
whole climb.

## Ordered steps

1. **Route frozen** and gameplay parity pinned (frame, lanes, sections, rings, pickups), as `tests/neon-parity.test.js`.
2. **Look brief** (`../<track>-look-brief.md`): per concept view the camera, preset, time of day, weather and the spec
   v2 §8.1 items it scores. Concept art is mood reference only (rule item 7).
3. **Sky / HDRI**: choose the CC0 source, record it, build the dome and 1K map, measure sun or key, gain, horizon,
   band by longitude before look-dev (items 15–18, 20).
4. **Road**: bake the KTX2 set, register it in `MATERIAL_MANIFEST`, set `wetness` per preset.
5. **Scenery and landmarks**: kit GLBs with `.blend` masters at `assets-src/<asset>/<asset>.blend`, LODs, ground
   pivots, manifest entry with licence; placement module keyed by distance and seed; landmarks checked from the
   driver's seat (items 19, 21).
6. **Effects**: wet mirror layer for opaque unlit lights; per-piece emissive (items 21–23); weather from existing
   presets only; no new VFX ports.
7. **Budgets**: draw-call cap test, triangles and GPU bytes recorded, phone p50/p95.
8. **Verification**: guard tests RED → GREEN, `make verify`, real WebGL captures desktop and phone in both
   orientations, concept parity review, owner sign-off, exact-HEAD CI.

## Traps to re-check per track

| Check | Rule item | When it applies |
|---|---|---|
| Dome horizon under the bloom threshold | 15 | every visible dome; city panoramas use the horizon gain |
| No floodlit wall fills a driven heading or aims the key | 16, 18 | any panorama with near lit facades |
| Soften only signs, keep sharpness | 17 | any panorama with readable LED text |
| Landmark bearing on approach (~200 m) and alongside | 19 | every roadside hero landmark |
| Landmark's own dressing off the sightline; lamps reach bloom | 21 | every lit hero landmark |
| Emissive judged by lit area, captured at the nearest pass | 22 | screens, lit facades, floodlit walls |
| Baked night light checked up the height and against paint | 23 | night tracks with baked light |
| Colourway is not a second design; atlas space | 24 | any painted building cell |
| Key light on a street axis, per-straight lane sweep | 20 | street-grid laps, any night key |
| Required scenery warms before GO; Low keeps procedural | 13 | every track |
| Water shows only where the look asks for it | — (new, see reuse table) | any non-sea track with an HDRI plan |
| One rolling World Tour renderer, no copied scene; landmarks from original geometry; props keyed by `trackId + chunkIndex` | `.claude/rules/world-tour.md` | 8d–8h |
| Home preview frames the signature landmark (`HERO_PREVIEWS` in `src/track-preview.ts`), `unobstructed > 0.6` on approach | `.claude/rules/track-showcase.md` | 8d–8h (and any landmark a new GLB replaces) |
| Visible-light count constant; every new material warmed before GO | `.claude/rules/performance-review.md` | every track |

## Per-track checklist template

Copy into `task-8x-<track>.md`; tick only with evidence (commit, test, capture in ignored audits).

**By project (committed once)**
- [ ] Route frozen and parity pins RED → GREEN before any asset.
- [ ] Look brief; owner decisions recorded (times of day, weather, what the look removes).
- [ ] Shared-code generalisation the track needs (reuse table "must be new"), RED first, Coast and Neon unchanged.
- [ ] Sky and lighting: source, licence, build script, manifest rows; items 15–18, 20 measured.
- [ ] Road set baked and registered; `wetness` per preset; fallback test.
- [ ] Scenery and landmark GLBs with masters, LODs, manifest entries, licences; placement module and tests; items 19, 21–24.
- [ ] `TRACK_LOOKS` entry; Low and load-failure fallback tests; no compile after GO; draw-call cap test.
- [ ] Licence review, owner art approval, `make verify`, exact-HEAD CI.

**By device (repeat per machine; evidence in ignored `../audits/`)**
- [ ] Blender/MCP live scene query re-verified before modelling.
- [ ] Real WebGL captures per sector, desktop and phone, portrait and landscape; draw calls, triangles, p50/p95.
- [ ] Concept parity review on a real-GPU desktop; owner sign-off on the scored sheet.
