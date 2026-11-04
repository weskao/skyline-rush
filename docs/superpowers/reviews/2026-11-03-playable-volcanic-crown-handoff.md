# Playable Volcanic Crown — map-specific delivery and integration contract

**Branch:** `feature/playable-volcanic-crown` (from `347f17940498275fd94152c0ed6005dae59ba323`)
**Scope:** Local map source, scene chunks, collision proxies, AI steering hints, focused tests.
**Current state:** Standalone map-specific implementation. **NOT a playable race in the app** until the shared CourseGraph/Race/AI/World integration branch connects these exports. No change to `RACE_TRACKS`, `src/game.js`, `src/world.js`, `src/App.vue`, the homepage scroll/swipe system or other branches.

## Asset interpretation

- Ground: `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-01.jpg`: rough black basalt, erupting volcano silhouette, ember-lit road bends.
- Flight: `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-02.jpg`: rock arch, lava curtain/rift, elevated crossing with conspicuous landing path.
- Layout: `docs/designs/new-tracks/route-schematics/volcanic-crown.svg`; layout is *not* to scale and may not override world coordinates.
- True WebGL review policy: `docs/designs/new-tracks/visual-acceptance-gate.md`. The existing home showroom (`src/upcoming-scenes/volcanic-crown.ts`) is preserved and is not gameplay.

## Authored topology

- `src/courses/volcanic-crown.ts`: roughly 15–16 km authored **ground** route; START and distinct FINISH; two serpentine rim hairpins, steep climb/drop, ten connected ground edges, three distinct split/merge alternatives (`rift-flight`, `vent-risk`, `gorge-flight`), three ordered checkpoint nodes.
- `sampleVolcanicRoute(edgeId, localS)`: arc-distance interpolation returns local road `point / forward / right / up` with elevation; `volcanicWorldPosition` adds offset in that same frame. This is *map-local*, not permission to create another shared coordinate system. The GPT 6 integration owner should adapt the source controls to shared `CourseGraph` and replace duplicate sampler logic with shared `sampleRoute` when available.
- `advanceVolcanicGate`: **state transition only**. The caller must pass *trusted physically signed crossings* of checkpoint/finish volumes and enforce approach, altitude and edge mode; arbitrary string inputs from clients are not authoritative.
- `volcanicRecovery`: safe ground-edge hint based on last validated checkpoint; shared runtime must choose a collision-safe pose, route heading and recovery penalty. It is **not** a complete recovery controller.
- `src/courses/volcanic-crown-obstacles.ts`: seeded/absolute-time 12-second falling-rock event, physical proxy coordinates reused by visible meshes and AI avoidance guidance. Shared collision callback owns damage/knockback, and AI must use the actual tested blocker paths on active edge only.
- `src/courses/volcanic-crown-scene.ts`: `createVolcanicCrownChunk(edgeId, chunkIndex, quality, reducedMotion)` builds **world-space Three.js BufferGeometry** road, surrounding 3D basalt terrain, glowing lava, genuine crater and arch, bounded embers, flight guidance and landing pad. `update(timeSeconds, reducedMotion)` only updates existing objects. `dispose()` detaches and releases chunk-owned resources. Host retains one renderer and decides chunk streaming/quality.

## Request to GPT 6 — shared, testable integration contract

Only the integration owner should provide and test these **shared** capabilities, then wire these exports:

1. `CourseGraph`, `validateCourseGraph`, `sampleRoute(graph, edgeId, localS)`: use exactly one world-frame source for car pose, the road mesh, obstacles, AI and minimap; verify metre-accurate arc length, bank/height joins and independent layered edges.
2. `RouteRaceState` with `edgeId / localS / lateral / altitude / monotonicProgress / checkpointIndex`; crossings are signed, swept and physically guarded so direct flights to FINISH cannot bypass a checkpoint. No lap counter.
3. `CollisionProvider` reads the same `volcanicObstaclePose` geometry/time shown by the chunk, checks edge-layer separation, routes physical hits through shared knockback. AI consults the blocker lookahead and reserves a viable lane on narrow passes.
4. `RecoveryProvider` chooses a non-hazardous spot on the *validated* ground path and preserves required checkpoint order.
5. `WorldChunkProvider` mounts/dismounts `createVolcanicCrownChunk` in the **existing** renderer; flight branch uses world-space aerial trajectory, visible landing and shared flight rules; no second canvas or frame loop.
6. Shared result timer, minimap (no undiscovered shortcut spoilers), ghost/topology-versioned records, 8-car AI, 30/60/120 Hz deterministic simulation, existing HUD, desktop/mobile input and protected old-track behavior.

## 2026-11-04 scoped sweep follow-up (unverified runtime)

- Branch-only change: `volcanicObstacleSweptContact(edgeId, from, to)` samples the same `volcanicObstacleContact` and `volcanicObstaclePose` as scene geometry and AI, at ≤2 m / ≤1/60 s increments to catch frame-endpoint tunneling.
- Added `tests/playable-volcanic-crown-sweep.test.js`: static boulder crossing, time-dependent rockfall warning/impact/clear, other-edge and altitude exclusion, and 30/60/120 Hz slices.
- **TDD evidence boundary:** missing exported function verified structurally on the preceding test-only SHA `d8018084`. Its actual GitHub unit RED remained queued at the time of this change; do **not** claim observed runtime RED or GREEN until logs prove it.
- The new helper is a map-local adapter, **not a separate collision engine**. Runtime wiring, authoritative swept gate crossing, eight-car AI, landing, recovery and end-to-end race are still owned by the shared integration layer.
- Source `feature/epic-multiroute-longform-tracks` HEAD `679dd6b8` did **not** have successful exact-HEAD full CI at inspection; merge was correctly blocked. Volcanic previous HEAD `68d8131a` full CI failed Browser / World Tour / Quality Gate, despite Unit/Cloud Save success. Do not claim the map playable or merge-ready.
- Pending: focused test output, `npm test`, Typecheck, Build, `make verify`, exact final-HEAD FULL CI, actual desktop/mobile WebGL visuals, 20 races/performance evidence and shared-runtime acceptance.

## Verification ledger (do not conflate separate gates)

- [ ] Test-first RED reproduced with actual failure output.
- [ ] Map-specific unit tests GREEN on the exact final commit (`npm test`).
- [ ] `npm run typecheck`, `npm run build`, Playwright and `make verify` observed.
- [ ] Latest exact-HEAD FULL GitHub `quality-gate` (not focused feature CI) observed green.
- [ ] Drive the entire ground mainline and optional branches with actual 8-car AI/physics and safe recovery; no checkpoint bypass.
- [ ] Measure 20+ completed races (median target 3–5 minutes); **length alone is not timing evidence**.
- [ ] Capture actual 1440×900 and 390×844 game WebGL images: Ground, Aerial, Crater Hairpin, Lava Gorge, Landing, Obstacle; compare against both JPEGs and document six visual criteria per view.
- [ ] Verify Low/Medium/High, Reduced Motion, 30/60/120 FPS, GPU dispose, draw calls, triangles, frame p50/p95, and touch-device geometry clearance.

Until these are evidenced, the branch is **not merge-ready or playable**, regardless of unit compilation or standalone mesh tests.


## 2026-11-04 lateral sweep regression handoff

The existing `volcanicObstacleSweptContact` interpolated only by longitudinal `localS` (and elapsed time). A same-edge, in-lane lateral move can therefore cross a fissure without either endpoint touching it at 60/120 Hz. Test-first commit `1fdee9c` adds a `crack-01` lateral traversal and per-edge isolation regression. An isolated execution of the unchanged sweep function with equivalent obstacle geometry reproduced missed 60/120 Hz hits; the GitHub RED workflow was still queued, not counted as proven. The follow-up correction now bounds sample spacing by total `(deltaS, deltaLateral, deltaAltitude)` route-frame movement as well as elapsed time. The collision provider remains shared-system owned. Full remote CI, real WebGL captures and actual playable-race acceptance are separate pending gates. The concept JPEG references have an unrelated adjoining artwork strip at the bottom; do not interpret that strip as part of the Volcanic Crown environment.

## 2026-11-04 canonical vent bypass mode
The authored `vent-risk` option has a solid basalt roadway and is a hazardous *ground* alternative, not a flight edge. It now advertises canonical `mode: 'ground'` for the shared `CourseGraph` validator while preserving the `vent-risk` ID, full physical geometry, fissure collision and original split/rejoin. The two actual flight shortcuts still use `mode: 'flight'`. Test-only SHA `7c115982492242902b65d07ab289a48b43e20ee1` proves the old `risk` tag fails a structural contract check (not an observed GitHub test run). The integration owner should map `topologyVersion` to canonical `version`, `groundEdgeIds` to `groundRoute`, and use shared `sampleRoute` rather than cloning the local sampler. Coming Soon and shared-race wiring remain unchanged.

## 2026-11-04 flight pad visibility
Test-first SHA `6d951b7feac130ac99a14c8d97b316e745b86dcf` checks Low/Medium/High and Reduced Motion for both launch/landing pads on `rift-flight` and `gorge-flight`, position to the sampled 3D route frame, non-black emissive material and two static edge lights. Existing dark rock-only pad was the visual legibility gap. The implementation retains its 26×32 m physical location, adds an emissive basalt surface plus two cyan rectangular edge markings as child meshes, all with chunk-owned disposal. No new collider, input state, physics or renderer is introduced. Real WebGL daytime/ash visibility and mobile frame-time evidence are still unverified.

## 2026-11-04 continuation: road-frame hazard contact and visual plane
Test-first SHA `75dfe6d416748627ec9d16842ec2e901a5cb5247` adds on-slope `heat-vent` contact, elevated clearance over `crack-01`, and low-quality mesh/ring orientation checks. The old production contact function was run in isolation against grade-matched sloped road stubs: it missed the ground-5 heat vent and incorrectly hit the elevated ground-3 crack. This proves the model-level failure, NOT a full npm RED run. Fix: project hazard-to-car displacement onto the obstacle's sampled `frame.up` for local-plane radial and vertical separation; rotate fissure/vent cylinder meshes and warning rings into the same road frame, and place rings exactly 0.12m above the shared `volcanicWorldPosition`. Preserve the collision handler, existing obstacle pose and 12s clock. GitHub full CI, real WebGL comparison, 8-car race and all device acceptance remain independently pending.

## 2026-11-04 continuation: Low/Medium hairpin road contact
Test-first SHA `2e7b0c47a5d7379e82a9dd9f0b4dd85f849da18e` measures actual streamed road vertex midpoints against the authoritative `sampleVolcanicRoute` physical centre, chunk by chunk on both crater-rim hairpins at Low and Medium. Isolated computation from authored Catmull-Rom points found ground-6 Low deviation ~0.979 m and Medium ~0.370 m, exceeding the 0.3m target, before this change (not a full Three.js test run). Selectively use >=24 road/terrain/lava rows per 240m chunk on ground-2 and ground-6; unchanged rows elsewhere and High retains 28. Predicted Low/Mid maximum ground-6 deviation ~0.256m, ground-2 ~0.140m. Mesh LOD still needs genuine WebGL wheel/tire, draw-call/FPS and memory acceptance.

## 2026-11-04 continuation: flight landing tangent continuity
Test-only SHA `17bde72f63e1696e964c5fc2694d7bb4360f901b` checks the authored `rift-flight → ground-2` and `gorge-flight → ground-8` endpoint position and heading (<=15° discontinuity). Source-inspection geometric RED: previous endpoint direction changes were about 48.8° and 47.6°. Only the penultimate 3D flight waypoints were adjusted to match the next real ground edge tangent; split and merge nodes, 10 ground edges, mandatory checkpoints, actual landing node, obstacle IDs and authored ground length are unchanged. Intermediate flight rock poses still derive from the SAME revised route sampler as collision and scene. The canonical runtime must still validate landing physics, edge transitions and ground clearance before making the course playable. Avoid global road-point surgery just to smooth every join: an isolated simulation of such a change erased the authored ground-6 hairpin reversal, so it was intentionally rejected.

## 2026-11-04 continuation: direct shared CourseGraph data handoff
Test-first SHA `c3fc009fb01d29fb0d36c770d49ed910ed2fdc8c` requires an exported `VOLCANIC_CROWN_COURSE_GRAPH` with canonical `id/version/start/finish/nodes/edges/checkpoints/groundRoute`, the exact same node/edge identities and no new runtime physics. The map source now exposes this plain immutable shape, mapping local `topologyVersion → version` and `groundEdgeIds → groundRoute`. The integration owner can pass it directly to shared `validateCourseGraph` and `sampleRoute`, then take responsibility for signed checkpoint crossings, simulation, AI, collisions, recovery and results. Local legacy sampler still serves independent map scene until integration switches to canonical; Coming Soon remains enforced. Runtime integration and exact-CI are NOT completed by a data export.

## 2026-11-04 continuation: shared-AI safety descriptors
Test-first SHA `59b00b731bc3f1fdf4ecdb6943f75b0cbd529169` specifies map-local `volcanicAIAvoidanceHints`: same `volcanicObstaclePose` used by visible 3D mesh and physical contact, per-edge/distance filter, warning vs active state, and two passing corridors clamped inside authored road width with 2.3m vehicle margin. The existing `volcanicAIChooseLateral` now reads the identical hints rather than recalculating obstacle active/warning twice. This is read-only, data-only guidance, not a new eight-car race AI implementation or damage controller. Integration must apply hints with branch choices, physically checked lane changes, recovery and shared collision. Unit and exact-HEAD full CI pending.

## 2026-11-04 continuation: real lava UVs and streamed seam
Test-first SHA `97f3ef07f99cf84a15bce3fd97bdcdb11b096ca3` requires `physical-road` and `lava-river` ribbons to include a nonconstant `uv` attribute with equal vertex count and identical absolute-`s` V coordinates on neighboring chunk boundaries. The original custom `BufferGeometry` only supplied positions/normals/index: the lava ShaderMaterial read an unprovided `uv`, leaving the moving pattern without mapped route coordinates. Fix adds one 2D UV for each road/lava ribbon vertex using lateral side (0/1) and absolute authored route metres / 240. No new shader, renderer, textures, particle budget or physical road data. Quality modes and resource disposal still require exact-HEAD tests and actual WebGL screenshots.

## 2026-11-04 continuation: physically oriented checkpoint / finish gate metadata
Test-first SHA `603b6c566d335101dc584d42d559ca51929940d8` requires ordered directional checkpoints and finish gate frames, derived from actual incoming ground-edge `sampleVolcanicRoute` at their exact endpoint, with physical position, direction, local up, width, and incoming edge identity. The new readonly `VOLCANIC_CROWN_DIRECTIONAL_GATES` contains only authored presentation/QA metadata, not a new gate transition or exploit-prone race-state authority. Shared `advanceRouteProgress` still owns signed-swept physical crossings and ordered checkpoint enforcement. Coming Soon remains protected.

## 2026-11-04 continuation: inactive vent visibility
Test-first SHA `67e0b12b9c2386119bc74ab2402fade98376a872` checks `heat-vent` at 1/3/5.5/8/13 seconds under Reduced Motion: the actual mesh must be visible iff the same shared `volcanicObstaclePose.active` used by collision is true, and its independent warning ring must follow `pose.warning`. The previous scene always rendered vents outside the 3–6s active window, despite collision being inactive. The implementation updates `mesh.visible=pose.active` for all obstacle kinds; boulders/fissures remain always visible since their physical pose is always active, and rockfall still uses its existing cycle. No new animation or physics model.
