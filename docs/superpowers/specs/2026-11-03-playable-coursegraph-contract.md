# Playable five-track shared CourseGraph contract — 2026-11-03

**Owner:** feature/epic-multiroute-longform-tracks (integration only). Five feature/playable-* source branches remain independently owned and are not to be modified by this chat.

**Status:** Core topology validator and deterministic 3D route-frame sampler implemented as an additive, opt-in baseline. They are **not connected to RaceFactory, world.js, AI, player physics, collision, finish state, save/ghost, or UI**. All five new tracks remain Coming Soon until those gates and exact-HEAD full CI pass.

## Canonical v1 TypeScript APIs

- `src/course-graph.ts`: `CourseGraph`, `CourseNode`, `CourseEdge`, `CoursePoint3`, `validateCourseGraph(graph): CourseGraph`.
- `src/course-route-frame.ts`: `sampleRoute(graph, edgeId, localS): CourseRouteFrame`, `routeLength(graph, edgeId): number`.
- World coordinates: `readonly [x,y,z]` metres, **Y up**, negative Z generally forward. Each `CourseNode` has `id`, `kind` (start/split/merge/checkpoint/finish), `at`. Each `CourseEdge` has `id`, `from`, `to`, `points` including matching endpoints, `width` in metres, `mode: 'ground' | 'flight'`; optional `surface` / `layer`.
- `CourseGraph` has `id`, positive integer `version`, `start`, `finish`, `nodes`, `edges`, **ordered mandatory checkpoint node IDs** in `checkpoints`, and the complete, ordered, all-ground `groundRoute` edge IDs.
- Graphs are authored as readonly data. Nodes and edges must be unique, reachable from START, capable of reaching FINISH, acyclic and geometrically connected; START/FINISH differ in ID and world position. Every start-to-finish route must pass every checkpoint in order, and at least one full ground route must reach FINISH without flight.
- The frame returns `point`, orthonormal `forward/right/up`, `edgeId`, clamped `localS`, `width` and estimated `curvature`. Curves use a deterministic 24-step-per-control-segment Catmull-Rom arc-length lookup, cached by readonly edge. One sampler must serve future road mesh, car pose, camera and AI; the old `trackFrame` remains unchanged.

## Adapter handoffs for five concurrently developed maps

Keep source authored layouts and their authored route geometry. Do **not** rename or overwrite their course files; build small adapters after each source feature reaches the needed gate:

- Dune Tempest: transform keyed `nodes[id].position` and edge `widthMeters/controlPoints/allowedModes` into canonical nodes/edges; keep its labelled ground alternatives and mandatory CP nodes.
- Monsoon Ruins: `nodes[].distance`, `mainEdges` and per-branch `from/to` are currently distance-based; derive real world positions from `sampleMonsoonRoute`, split edges at graph nodes and convert numeric checkpoint distances into explicit gate nodes. Do not equate scalar distance alone with a valid physical checkpoint.
- Skyfall Archipelago: transform object `{x,y,z}` points into tuples; `mode:'air'` maps to `'flight'`; authored road gaps are separate physics/landing metadata, **not** silently drivable asphalt.
- Volcanic Crown: existing `nodes[].at`, `edges[].points`, width and named checkpoints map directly. `mode:'risk'` must be explicitly assigned to a verified ground or flight route after examining that segment.
- Stormline Megacity: keyed tuple `nodes`, `mainRoute`, `graphVersion` and edges map readily; `'drive'` becomes `'ground'`, `'flight'` is unchanged; checkpoint altitude envelopes and road layers remain mandatory runtime collision conditions.

Source feature chats should read this contract before extending their own exported route models. If a map needs more metadata, propose it through a tested addition to this contract on the integration branch. **Do not create five competing runtime engines.**

## Verification and remaining gates

Observed in an isolated Node 22.16 runner: `node --experimental-strip-types --test tests/course-graph.test.js`: 7/7 pass after test-first RED. Strict `tsc --noEmit` on both new TS files also passed locally. These are **not whole-repository npm tests, browser tests, WebGL acceptance or full GitHub CI**.

Next TDD tasks (not yet done): (1) deterministic physical checkpoint crossing and edge transitions, (2) vehicle contact/soft terrain bounds, 8-car AI branch navigation, recovery and standings without cross-layer collision, (3) seeded weather and shared quality/reduced-motion pipeline, (4) existing renderer/camera and minimap integration, (5) safe per-map race registration only after full playable validation. Do not bypass Coming Soon with fake Race objects.

Keep the 10 legacy sprint tracks and Harbor Circuit behavior unchanged. The homepage's existing `track-swipe-ui.ts` / `#world` remain the only gesture/renderer flow; never duplicate them. Verify latest exact-HEAD unit, typecheck, build, 13 browser shards, 5 World Tour shards, cloud and quality-gate, plus real WebGL desktop/mobile ground/aerial frames, before claiming completion or importing source maps.

## TDD milestone: ordered physical checkpoint / finish progress

- `src/course-progress.ts` now exports `createRouteProgress(graph: CourseGraph): RouteProgress` and `advanceRouteProgress(graph: CourseGraph, state: RouteProgress, crossing: RouteCrossing): RouteProgress`.
- `RouteProgress` is a pure immutable state containing `currentEdgeId`, `nextCheckpoint` (index into `graph.checkpoints`) and `finished`. It does **not** replace the legacy distance-axis `Race` yet.
- The runtime caller supplies validated, forward-direction edge-end crossings with `edgeId`, `fromS`, `toS`, measured world-space `position`, and the connected `nextEdgeId` (absent only at FINISH). The helper rejects wrong branches, reverse travel, off-edge heights/positions, duplicate gates and finishes missing mandatory ordered checkpoints. It is not an authority for vehicle motion/physics; do not pass arbitrary user-reported positions or assume this check replaces validated collision and checkpoint volumes.
- Isolated Node 22.16 test run: `node --experimental-strip-types --test tests/*.test.js` PASS 13/13 in the minimal contract fixture; focused TypeScript `tsc --noEmit --strict` PASS. Full repository `npm test`, `make verify`, Playwright, actual gameplay WebGL and exact-HEAD GitHub Actions remain independent, pending gates.
- Next shared work: join this gate to the authoritative simulation world pose and per-edge travel, then build split-aware AI/standings/recovery. A distance scalar or screenshot alone cannot authorize a new course to start.


## 2026-11-04 — opt-in CourseGraph physical-distance travel slice

- `src/course-travel.ts`: per-car `currentEdgeId / localS / lateral / altitude / nextCheckpoint / finished` state; consumes the existing canonical `routeLength`, `sampleRoute` and `advanceRouteProgress` APIs. Meter-based travel handles graph edge transitions, deterministic ground route fallback and explicitly authorized flight branches without modifying existing race tracks.
- Route-end position is computed from the vehicle's sampled right/up frame and its actual lateral/altitude offsets (not fabricated from road centre alone). Off-road/high-altitude gate attempts do not collect a checkpoint; invalid direction, edge, non-finite distance and unauthorized flight do not advance.
- `tests/course-travel.test.js`: nine opt-in cases including branches, checkpoints/finish, eight independent car states, bad inputs, offset pose, airborne bypass, and 30/60/120 Hz equivalents. A separate isolated mirror observed test-first RED, then GREEN 9/9 with Node 22.16; focused strict TypeScript typecheck passed there. These are **not full-repository results**.
- **Safety boundary:** This pure helper is not connected to `game.js`, `world.js`, RaceFactory, actual eight-car AI, collision/flight physics or checkpoint authority. The caller must supply *trusted physics-derived metres* and flight permission; production still needs signed swept world-space gate crossings from real vehicle poses, physical landing, recovery and visual road contact. No new map is playable; preserve Coming Soon.
- **Pending:** exact-HEAD FULL GitHub CI with all Browser/World Tour shards, `make verify`, authentic desktop/mobile WebGL screenshots and JPEG comparison, 20 measured races, 30/60/120 FPS and GPU disposal acceptance; no source-map import until all gates pass.


## 2026-11-04 — graph fleet, swept gates and physical recovery

- Shared opt-in helpers: `src/course-fleet.ts` supports up to eight separate CourseTravel states, atomic trusted-metre updates, 3D collision **candidates** (not physics responses), and checkpoint-preserving ground recovery only after a caller-provided world-pose clearance check. Existing `knock`, `bumpCars`, AI, traffic and actual obstacle physics are still authoritative.
- `src/course-signed-gates.ts` accepts measured before/after vehicle poses and physical step budgets. Signed 3D plane crossing, direction, lane width, relative height, finite coordinates, step bounds, correct next edge and ordered checkpoints are required; flying over/around or teleporting through a gate does not count. The gate sweep must be supplied by **trusted host simulation**, never browser-supplied positions or arbitrary flight permission.
- `src/course-travel.ts` now rejects non-finite lateral/altitude state before advancing on any edge.
- Isolated test-first runs: `tests/course-fleet.test.js` (12/12) and `tests/course-signed-gates.test.js` (8/8) observed RED before new helpers / invalid-state guards and GREEN after; 20/20 combined pass with Node v22.16.0 in an exact-SHA mirror of the existing graph/travel dependencies. Isolated strict TypeScript (tsc 5.8.3) passed. **These checks are not the full repo's npm tests, typecheck, build, Browser, World Tour, Cloud-save, or actual WebGL.**
- Still **not connected** to `game.js` / RaceFactory authoritative stepping, `world.js` renderer, eight-car navigation/standings, actual signed gate dispatch, shared collision response, recovery clearance provider, actual landing or race-result persistence. Remain opt-in and keep all five courses Coming Soon. No source branch files imported.
- Required next gate: exact-HEAD FULL GitHub CI (including every required Browser/World Tour shard), then connect shared simulation/world/AI without rewriting legacy modes, verify complete physical races and two real WebGL/JPEG comparisons per course.


## 2026-11-04 — provisional graph-aware AI route choices and race order

- `src/course-ai-standings.ts` adds deterministic, index/seed-stable branch hints for the shared eight-car AI; it never selects a flight edge without explicit flight authorization. These are **branch hints**, not completed AI steering, driving or hazard avoidance.
- `rankCourseFleet` compares the count of validated checkpoint nodes before edge-local physical metres remaining to the next mandatory gate (or finish), using the canonical `routeLength` graph. It rejects invalid edge, uncollected checkpoint bypass and invalid/nonfinite route positions. Finished racers may be ordered by *host-provided trusted* finish times; this is provisional standings logic, not a complete on-screen result or persistence mechanism.
- Isolated test-first `tests/course-ai-standings.test.js`: RED before implementation; a separate forged-checkpoint standing RED was observed then corrected. GREEN 9/9; existing shared fleet + signed-gate suites GREEN 20/20 (combined 29/29), strict TypeScript 5.8.3 PASS on a minimal exact-SHA dependency mirror. Whole repo and real WebGL remain unverified.
- **Still pending:** connect existing AI speed, steering and obstacle detection to selected edges; authoritative telemetry/poses and signed gates to the actual Race loop, altitude-layered collision knock, player/drift/fuel/flight/landing, camera, minimap, results, ghost/save/versioning; no course unlocked or source files imported until exact-HEAD FULL CI and physical desktop/mobile/JPEG acceptance.


## 2026-11-05 — measured physical CourseGraph step (opt-in)

- `src/course-measured-motion.ts`: `advanceMeasuredCourseTravel(graph, state, motion)` consumes **trusted physics-derived** previous/current world poses, edge-local physical metres, measured max displacement, and an optional flight authorization; the browser/UI must never choose those authority inputs. It shares the existing `sampleRoute`, `courseTravelPosition` and `advanceSignedGate` instead of treating an invented road-center endpoint as a signed gate crossing.
- One frame may continue on the active edge or cross **one** physically signed graph node. Signed crossings reject reverse direction, disconnected next edge, wrong altitude/lane, unauthorized flight and skipping mandatory checkpoint or finish. Post-junction progress is projected onto the new edge's frame to reduce distance loss. Near-edge road width and 3D position must match the authoritative route frame; nonfinite/teleport/spurious progress is rejected.
- TDD in a detached Node 22.16/TypeScript harness using mirrored existing graph/travel/gate runtime: 9 tests RED before implementation; GREEN after implementation, then a new FINISH-next-edge regression RED and GREEN; final 10/10 passed, strict `tsc --noEmit` passed. Source/test Git Blob SHAs were matched before commit. **These isolated results do not establish whole-repo tests, actual physics wiring, browser/World Tour or real WebGL acceptance.**
- **Pending:** hook this measured step into authoritative `game.js`/RaceFactory and World, integrate actual physics/collision/AI/landing/recovery/finish/records, run `make verify`, source exact-HEAD FULL CI, real desktop/phone screenshots against both concept JPEGs, 8-car races and performance budgets. No playable registration or import of uncertified source courses; Coming Soon remains.


## 2026-11-05 — signed eight-car sweeps and continuous steep-road frames

- `src/course-measured-fleet.ts`: opt-in atomic measured-motion stepping for eight independent cars. Reject unknown/duplicate driver IDs; if any car's trusted physical sweep is rejected, the entire frame is rolled back (including forged zero-distance motion), preserving consistent state. Only `advanceMeasuredCourseTravel` determines progress; existing `game.js` collision/knock/flight systems remain authoritative and are not replaced.
- `src/course-route-frame.ts`: fixed an observed 90-degree right/up frame discontinuity at the previous near-vertical tangent threshold (|forward.y|≈0.95). The sampled road right vector is anchored to the horizontal heading; the up vector is orthogonalized. This avoids artificial road-roll flips for steep ascending/descending graph ramps while leaving the legacy track samplers untouched.
- `src/course-road-geometry.ts`: road-ribbon `lift` now offsets along the **sampled road up normal in 3D**, rather than world-Y only, so elevated or banked road meshes maintain the same physical frame as car pose and collision.
- Isolated regression evidence (detached Node 22.16; minimal Three.js BufferGeometry stand-in for road-vertex checks): eight-driver fleet 8/8 RED→GREEN including a forged-stationary-frame regression; steep-frame continuity RED→GREEN 1/1; road-normal 3D lift RED→GREEN 1/1; combined with prior measured-motion 10/10 yields **20/20 PASS**, and strict TypeScript checks of the pure modules pass. The stubbed Three.js test is **not** a real WebGL rendering or complete project test.
- Pending: actual `npm test`, full project Typecheck/Build, `make verify`, full exact-HEAD GitHub CI with 13 Browser and 5 World Tour shards, and real 1440×900/390×844 WebGL screenshots. True player/rival physics integration, map-source full acceptance, complete 3–5 minute races and human review remain open. No new playable track is registered; Coming Soon remains.


## 2026-11-05 — authorized air-over-ground travel, signed gate unchanged

- In `advanceMeasuredCourseTravel`, authorized flight physics may move a car at high altitude above an existing *ground* CourseGraph edge; this is independent of declaring an edge as flight mode and is necessary for takeoff/glide/landing. Without authorization, high-altitude ground-edge progress remains invalid. Underground travel remains rejected.
- Signed checkpoint and FINISH intersections are **still separately height-gated by `advanceSignedGate`**, so an airplane cannot skip a checkpoint at high altitude merely by accumulating distance. The new regression first failed (authorized flight frozen at 10m rather than advancing to 16m) and then passed after the minimal fix in an isolated Node 22.16/strict TypeScript harness; 21/21 combined opt-in tests PASS. This does not imply trusted flight physics is wired into the live game.
- No changes to the existing ten race tracks, `game.js`, `world.js`, source map branches, UI selection or Coming Soon. Exact-HEAD full GitHub CI, all Browser/World Tour jobs, full mobile/desktop WebGL acceptance and real vehicle/AI flight remain independent mandatory gates.
