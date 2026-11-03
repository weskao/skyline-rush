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
