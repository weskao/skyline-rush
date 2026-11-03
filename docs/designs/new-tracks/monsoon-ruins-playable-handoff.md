# Monsoon Ruins — playable course implementation handoff (2026-11-03)

**Branch:** `feature/playable-monsoon-ruins`  
**Integration owner:** `feature/epic-multiroute-longform-tracks`  
**Reference baseline:** `347f17940498275fd94152c0ed6005dae59ba323`

## Scope and current boundary

This branch owns the **map-specific** route geometry, forks, surface hints, props and disposable Three.js course chunks. It intentionally does **not** register Monsoon Ruins in `RACE_TRACKS`, enable the Start button, modify existing World/Game/AI/HUD/Scroll controllers or claim a finished playable race. Stage 1 Coming Soon behavior and the existing homepage 3D environment are unchanged. The integration branch must implement shared CourseGraph and connect these interfaces before a full 3–5 minute drive can be tested.

## Public map-specific interfaces

`src/courses/monsoon-ruins.ts`:

- `MONSOON_RUINS_COURSE`: fixed ~12.5 km point-to-point graph manifest, distinct START/FINISH, eight ordered ground graph edges and three optional distinct side edges; route and landmark metadata; solid obstacles; ordered checkpoints. Version `graphVersion: 1`.
- `sampleMonsoonRoute(edgeId, routeProgress)`: world-space position plus orthonormal forward/right/up basis. `routeProgress` is **canonical shared progress**, not physical edge metres. Bounds are checked; both forks and ground have exactly matching 3D entry/exit positions.
- `monsoonEdgeLength(edgeId)`, `sampleMonsoonEdge(edgeId, localDistance)`: arc-length based route travel in **physical metres**, including separate per-fork lookup tables. Use for road rendering, car pose and movement. It returns both canonical progress and local distance; do **not** advance cars using `routeProgress` alone.
- `monsoonGraphEdgeLength(graphEdgeId)`, `sampleMonsoonGraphEdge(graphEdgeId, localDistance)`: direct adapter for all eight `ground-0..7` node-to-node main edges and the three alternate edges. Returns the graph edge ID with shared 3D frame, canonical progress, and edge-local physical metres; consecutive main-edge endpoints agree without hidden teleporting.
- `monsoonWetContact(edgeId, routeProgress)`: deterministic `{ depth, wetness, gripScale }` material hints; the shared tire-contact solver must decide whether/how to apply them without changing old track physics.
- `monsoonObstacleHit(edgeId, previousProgress, progress, lateral, altitude, previousLateral?)`: conservative distance-and-lateral swept query, including diagonal lane crossing,, not an alternate collision response engine. `monsoonAvoidance(edgeId, progress, preferredLateral)`: a target lane hint; use existing `knock` and shared AI speed/turning mechanics.
- `monsoonPassedCheckpoints(from, to)`, `monsoonCanFinish(distance, passed)`, `monsoonRecovery(progress, passed)`: **prototype rules/helpers only**. The shared CourseGraph gate controller must confirm each checkpoint's signed world-space crossing via map-local `monsoonCrossedCheckpoint(gate, previousPoint, nextPoint, edgeId)`, correct edge and altitude and ordered sequence; never trust an arbitrary progress jump or caller-supplied `passed` list to finish.

`src/courses/monsoon-ruins-scene.ts`:

- `createMonsoonRuinsChunk({ edgeId, from, to, quality })` returns `{ group, update(timeSeconds, reducedMotion), dispose() }`. The **existing** World renderer must add `group` and stream chunks on the road and optional branches; this module creates no renderer, canvas, camera, car model or independent loop.
- Ground chunks contain an actual 3D road, layered valley terrain, a moving-river watercourse, deterministic mixed-height instanced rainforest, reflective puddles, collision-aligned stone/wood debris, and animated rain and ferns.
- Authored landmark positions: 5300 m colossal guardian temple with a headdress and carved face and stepped ruins, 6740 m triple waterfall, 6950 m elevated viaduct and stone supports. `river-ford` draws a shallow water surface; the `waterfall-skybridge` draws an elevated road with piers and an obstacle.
- Tier-specific *initial* foliage/rain budgets (Low/Medium/High); changing tiers at runtime requires the host to swap/recreate streamed chunks. Reduced Motion disables falling rain and sway updates. Resources (meshes/materials/geometries) are disposed when a chunk leaves the stream.
- The venue does **not** depend on a second physics implementation. Existing homepage `src/upcoming-scenes/monsoon-ruins.ts` must remain available.

## Visual evidence and acceptance gates

Original source of truth:

- `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-01.jpg`: guardian face, giant sanctuary, wet mud S-bend, river and lush natural canopy.
- `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-02.jpg`: high stone bridge, waterfall, upper jump and visible landing.
- `docs/designs/new-tracks/route-schematics/monsoon-ruins.svg`: schematic only, not a geometric raster trace.
- `docs/designs/new-tracks/visual-acceptance-gate.md`: requires actual running WebGL screenshots, performance and six-category acceptance records.

**Still pending** until the shared adapter is integrated and an executable host is available: full-drive player+AI physics; signed checkpoint validation; compare 3–5 minute measured races on 8 cars; road/vehicle wheel contact; no invisible collision and recovery; screenshots for 1440×900 and 390×844 of ground+air landmark views; Low/Medium/High and Reduced Motion mobile/desktop frame and memory metrics; full local `make verify` and exact-HEAD **full** CI. Source-code presence, isolated unit tests and homepage showroom images do **not** prove those gates.

## Integration ordering

1. Adapt this map's nodes and edge-local arc-length sampler to the shared typed CourseGraph without duplicating a second path/physics system. Place/check signed gates on every option and keep original ten race tracks unchanged.
2. Render the shared player/rivals and map-owned scene chunks in the existing scene/camera/renderer; gate weather/contact and solid props through the current physics and AI, not parallel gameplay logic.
3. Run failing/fixed browser + headless tests, then real WebGL captures and measured full-drive acceptance. Only then allow the integration branch to separately switch the Coming Soon registry status; this branch must never unlock it.
