# Scene graph, draw calls and track streaming (Wave 1, workstream 11)

Scope: fewer draw calls, less scene traversal and correct chunk streaming, with zero visual change.
Nothing visible was removed. Quality tiers, materials, UVs, shadows, transparency order, positions,
and fixed 60 Hz physics are unchanged. Off-screen rival AI, physics, collision, ranking and items are
not touched, because these changes only affect what is drawn.
Base: `9d3c2e69` (perf-thermal-00-baseline).

## Environments

| Label | What it is | What it can show |
|-------|------------|------------------|
| **LOCAL-CHROME** | `node scripts/thermal-baseline.mjs` (all tracks): local Chrome, real WebGL, 390x844 at DPR 3, 180 fixed ticks, seed 12345, `?perf=deep`. Backend is "unclassified-browser-webgl". | Draw calls, triangles and geometries from `renderer.info`, which counts every pass. Frame and GPU timings are from one desktop GPU run, not a device. |
| **LOCAL-NODE** | Node 24 with Three r186, no renderer: `scripts/scene-graph-census.mjs`, `scripts/course-streaming-probe.mjs` and the unit tests. | Object and compose counts, CPU timings (noisy) and streaming behaviour. It shows no GPU numbers. |
| **DEVICE** | iPhone, Android or Mac thermal, power and GPU. | **UNVERIFIED.** Nothing here was measured on a device; see the SOP at the end. |

Raw probe JSON lives in the ignored `docs/performance/local/`. Before and After both used the
same harness on the same machine. The After run used the working tree that became commits
`d0e45255`..`156c0eb0`.

## Per-track Before / After (LOCAL-CHROME, renderer.info, all passes)

| Track | Phase | Draws before → after | Triangles before → after | Geometries before → after |
|-------|-------|----------------------|--------------------------|---------------------------|
| Taipei | racing | **623 → 479** | 112755 → 112685 | 476 → 483 |
| Taipei | home | **471 → 346** | 102685 → 102685 | 476 → 483 |
| Tokyo | racing | **471 → 459** | 88933 → 88981 | 474 → 479 |
| Tokyo | home | **305 → 249** | 76219 → 76219 | 474 → 479 |
| Monsoon Ruins | racing | **353 → 271** | 150941 → 151469 | **1670 → 1021** |
| Monsoon Ruins | home | **294 → 260** | 135681 → 135891 | **1670 → 1021** |
| Alpine | home | 313 → 309 | 80247 → 80247 | 508 → 511 |
| Coastal | home | 224 → 221 | 71837 → 71837 | 507 → 511 |
| Cosmic | racing / home | 355 → 353 / 242 → 238 | ≈ | 477 → 482 |
| Volcanic Crown | racing / home | 334 → 334 / 184 → 184 | 63655 → 63927 | 1062 → 1062 |
| Stormline | racing / home | 358 → 358 / 243 → 243 | ≈ | 897 → 897 |
| Frostbite | racing / home | 237 → 237 / 229 → 229 | ≈ | 468 → 468 |
| Dune Tempest | racing / home | 285 → 285 / 143 → 143 | ≈ | 680 / 678 |
| Skyfall | racing / home | 265 → 265 / 171 → 171 | ≈ | 494 → 494 |
| Coast, Neon, Canyon, Aurora, Spiral, Alpine, Coastal (racing), Harbor | all | ±1 | ≈ | = |
| Six Coming Soon showcases | showcase | identical (134–163) | identical | identical |

- **±1 draws and small triangle changes** on tracks that were not touched come from the rival and
  traffic positions at the sampled frame. Static scenery triangle counts are unchanged; the merge
  tests check this directly.
- **The +5 to +7 geometries** on World Tour tracks are the merged landmark buffers: one per
  landmark material group. The source meshes they replace shared one geometry each.
- **Frame and timing columns** (frame interval, CPU submit, GPU) are in the raw JSON. They are a
  single desktop run that is vsync-locked at 16.7 ms, so no frame-rate gain is claimed from them.
- **Volcanic, Stormline and Frostbite** draws are unchanged by design. Their gain is CPU traversal
  (next table).

## Scene-graph CPU (LOCAL-NODE, `scripts/scene-graph-census.mjs`, rebasing every frame)

| Scene | Composes per frame (before → after) | Notes |
|-------|-------------------------------------|-------|
| Monsoon Ruins | **1443 → 437** | matrixWorld ≈ 1.2–1.5 ms → 0.24–0.38 ms. Scene update ≈ 0.64–0.80 → 0.85–1.14 ms, because the instanced fern matrices are now written explicitly (a trade-off). The net is lower. Two alternating runs each; the machine was noisy. |
| Volcanic Crown | 673 → **115** | Before: 529 objects in hidden chunks were recomposed each frame. After: 0. |
| Stormline | 493 → **180** | Before: 286 hidden objects. After: 0. |
| Frostbite | 294 → **106** | Before: 122 hidden objects. After: 0. |
| World Tour while parked on another track | 1359 → **0** | |

## What changed

1. **World Tour landmark merge**:
   - Code: `src/world-tour-batching.ts` (`mergeStaticMeshes`) and `src/world-tour-scene.js`
     (`configure` / `clearHeroes`).
   - Same-material, same-flag meshes in each landmark are baked into one non-instanced mesh in the
     landmark's local space.
   - World-space vertices are identical, so showcase framing (`landmarkVertices`), world.js landmark
     inspection, raycasts and Box3 still see the same data. It uses the same shader program, so
     there are no new variants.
   - Mirrored meshes (determinant ≤ 0) are skipped.
   - Merged buffers are disposed when the track changes.
2. **Monsoon ferns**:
   - Code: `src/courses/monsoon-ruins-scene.ts`.
   - The 12 meshes plus 12 cone geometries per chunk became one `InstancedMesh`. Positions are the
     same, and so is the per-fern sway (zero under reduced motion).
   - The cone's bounding sphere is centred on its origin, so the sway never leaves the culling
     sphere.
3. **Hidden matrix skip**:
   - Code: `src/scene-matrix-culling.ts`, applied to the chunks and root of Volcanic, Stormline,
     Monsoon and Frostbite and to the World Tour root.
   - A hidden subtree skips `updateMatrixWorld` and runs one forced catch-up the first time it is
     shown again.
   - `updateWorldMatrix` (Box3, getWorldPosition) is untouched. Shader warmup unhides objects before
     it renders, so the catch-up runs first.
4. **Dune / Skyfall course streaming**:
   - Code: `src/course-race-scene.ts`.
   - Each predecessor edge keeps its tail until the car is 120 m past the node. Before, the road
     behind the car vanished at every node.
   - A live chunk is released only 40 m past the window that created it (hysteresis).
   - Probe (`scripts/course-streaming-probe.mjs`, 8 cars at 70 m/s over 150 s): "no road 100 m
     behind the player" went 89 of 1488 → **0** (forward) and 106 of 1489 → **0** (oscillating).
     Chunk creations went 39 → 41 forward and 39 → **27** oscillating.
   - `update()` median stays ≈ 0.006–0.011 ms.

## Visual comparison

There are no pixel screenshots, and the owner waiver covers manual visual review. Equivalence is
checked by automated geometric comparison, which is stricter than a screenshot for these changes:

- **Landmarks** (`tests/world-tour-landmark-merge.test.js`):
  - Covers every landmark of all five World Tour tracks.
  - For each material colour, it compares vertex count, world bounds, mean and RMS against a fresh
    un-merged landmark, within 1e-3 m.
  - It also checks that no two remaining meshes share a material or flag key.
- **Ferns** (`tests/monsoon-ruins-scene.test.js`): per-instance sway equals the old per-mesh
  rotation, and is exactly zero under reduced motion.
- **Matrices** (`tests/scene-matrix-culling.test.js`):
  - Every visible object's `matrixWorld` equals an independent compose of its ancestors, across
    distances, chunk transitions, hide/show and World Tour track switches.
  - No object under a hidden chunk is recomposed.
- **Streaming** (`tests/course-race-scene.test.js`):
  - Road remains 100 m behind the car after a node.
  - The tail is released once clear.
  - No chunk is rebuilt by boundary jitter.

Browser specs run against `dist/` (see the work log for results): shader warmup, World Tour
mid-race and showcase framing, Monsoon, Volcanic, Stormline, Frostbite, Dune, Skyfall, upcoming
Home, track swipe and World Tour.

## RED evidence (observed before each fix; each test is committed together with its fix)

- `world-tour-landmark-merge`: "taipei office: repeated material draws"; "merged landmark geometry is
  owned by the scene".
- `monsoon-ruins-scene`: "ferns share one draw".
- `scene-matrix-culling`: Volcanic 529, Stormline 286, Monsoon 641 and Frostbite 122 objects inside
  hidden chunks recomposed (at 120 m). World Tour: "hidden World Tour scenery recomposed".
- `course-race-scene`:
  - "the chunk the car just left was disposed at the node" (actual 5 disposals, expected 0).
  - "swing 2 at 118,122: 1 chunk groups rebuilt".
- `scene-resource-cycles`:
  - This is a guard, not a fix. It passed on the current code: no accumulation across four cycles of
    9 tracks × restart.
  - A mutation check confirmed it can fail: removing the merged-landmark dispose gives undisposed
    resources of 3032, 3049, 3066 and 3083 per cycle.

## p03 item status

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Audit all tracks + Coming Soon showcase | DONE | 36 LOCAL-CHROME records before and after (table above) |
| 2 | Find heavy tracks | DONE | Taipei 623, Tokyo 471, Alpine 412, Coastal 404, Aurora 398, Stormline 358, Cosmic 355, Monsoon 353, Volcanic 334 racing draws |
| 3 | Deep-dive the 8 tracks | DONE | Taipei/Tokyo: landmark merge. Monsoon: ferns plus matrix skip. Volcanic, Stormline, Frostbite: matrix skip. Dune: streaming fix. Skyfall: no change, since its streaming is a single world and the per-frame focus array is about 8 small objects, below measurable cost. |
| 4 | InstancedMesh / static batching | DONE | `mergeStaticMeshes`; Monsoon fern `InstancedMesh` |
| 5 | Preserve object count, materials, UVs, shadows, transparency order, positions | DONE | `preserveRenderState`, geometric tests; `canBatch` excludes transparent, non-depth-writing, render-ordered, dynamic and skinned meshes |
| 6 | Static matrix updates correct under rebasing | DONE | Hidden skip. Freezing `matrixAutoUpdate` inside *visible* chunks is **REJECTED**: about 115–437 composes per frame remain, and freezing risks animated objects going stale for a sub-0.4 ms CPU gain. |
| 7 | Cache invariant route data | REJECTED | `update()` median is 0.006–0.011 ms for 8 cars (LOCAL-NODE). A per-graph length cache or edge map would have no measurable benefit. `samplesFor` already caches route samples. |
| 8 | Stream only on boundary change, with hysteresis | DONE (hysteresis) / REJECTED (signature short-circuit) | Same cost argument as item 7: the active-set rebuild is already below 0.011 ms. |
| 9 | Safe culling, no popping | DONE | Predecessor tail: 89 → 0 missing-road checks |
| 10 | Fewer geometry/material create, clone, dispose and uploads | DONE | Monsoon −649 geometries (12 cones per chunk → 1); hysteresis cuts oscillation churn 39 → 27 |
| 11 | GLB / Meshopt / KTX2 / material sharing | REJECTED | The 8 deep-dive tracks are procedural (no GLB), so converting them would mean regenerating art. GLB tracks already go through `src/asset-model-loader.ts` with Meshopt/KTX2 support. Material sharing is already done by the scenery kit and `appearanceKey`. |
| 12 | All routes keep working | DONE (unit + browser) | Branch and merge nodes (all predecessors keep tails), flight edge, Finish runout, World Tour Endless window untouched; browser specs |
| 13 | No resource accumulation | DONE | `tests/scene-resource-cycles.test.js`. Coming Soon stages: a bounded cache with eviction disposal already exists (`src/upcoming-showcase.ts` `cachedStages`/`disposeStage`); showcase draw counts are identical before and after. |
| 14 | Home and Garage modules | PARTIAL | Home draws: Taipei 471 → 346, Tokyo 305 → 249, Monsoon 294 → 260 through the shared scene modules. Garage-specific modules were **not** changed: no measured Garage bottleneck in this workstream's harness, so this is UNVERIFIED. |

## Local gates (LOCAL, after merging the latest `feature/perf-thermal-00-baseline`)

| Gate | Result |
|------|--------|
| `node --test tests/module-size.test.js` | 3/3 pass |
| `pnpm test` | 3975 tests, 3971 pass, 0 fail, 0 cancelled |
| `pnpm run typecheck` | exit 0 |
| `pnpm run build` | exit 0 |
| Focused browser specs (12 files: shader warmup, World Tour mid-race/showcase/routes, Monsoon, Volcanic, Stormline, Frostbite, Dune, Skyfall, Coming Soon home, track swipe), `--workers=1` against `dist/` | 56/56 pass (8.7 min), run before the baseline merge; the merge touched no scene code |

## Wiring needs (world.js / main.js are out of scope)

- None are required. All changes sit behind existing factory APIs.
- Optional: `world.js` could wrap other parked hosts (`circuitScene`, `courseScene`, `coastScenery`)
  with `skipHiddenMatrixWork` at creation. `courseScene` already disposes when hidden, so it gains
  nothing; the others were not measured.

## Device SOP (UNVERIFIED: run manually)

1. `pnpm run build`, then serve `dist/` on the LAN (`scripts/perf.mjs`).
2. Open `?perf=deep&seed=12345` on the device, set fixed 60 FPS and High quality, and run Taipei,
   Tokyo and Monsoon in racing for 20 minutes at the same commit before and after.
3. Export `#perf-overlay` `dataset.deep` every 5 minutes. Record surface temperature, power (Xcode
   Energy gauge or Android `dumpsys batterystats`) and the GPU frame p50/p95.
4. Store the raw files in `docs/performance/local/`, and only summarized numbers labelled DEVICE here.
