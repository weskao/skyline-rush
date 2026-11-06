# CourseGraph race runtime: Dune Tempest, then Skyfall Archipelago — design

**Date:** 2026-11-06 · **Branch:** `feature/course-graph-runtime` (cut from
`origin/feature/epic-multiroute-longform-tracks` at `0c951d49`) · **Status:** design, docs only;
no product code on this branch yet.

**Plan:** `docs/superpowers/plans/2026-11-06-course-graph-runtime.md`

Read with: `CLAUDE.md`, `.claude/rules/playable-course-shared-template.md`,
`docs/superpowers/specs/2026-11-03-playable-coursegraph-contract.md`,
`docs/regression-first-workflow.md`, `.claude/rules/module-size.md`,
`.claude/rules/performance-review.md`, `.claude/rules/vehicle-road-stability.md`, and the lifecycle
design on `origin/feature/track-lifecycle-sop`
(`docs/superpowers/specs/2026-11-06-track-lifecycle-design.md`).

## 1. Intent

The shared CourseGraph modules (`src/course-*.ts`) and the Dune / Skyfall adapters exist and are
unit-tested, but nothing races on them: `src/game.js` imports no `src/course-*` module and its
simulation is one-dimensional (`car.distance` along one centreline). This work connects the
existing graph runtime to the existing race loop so that **Dune Tempest**, then **Skyfall
Archipelago**, can be raced START → FINISH on their real branch topology in `make dev-unlocked`,
while `make dev` and production keep both as Coming Soon.

Why: both courses have alternate edges that are 26–69 % (Dune) and 48–65 % (Skyfall) shorter than
the parallel ground edge (measured, §4), and Skyfall's alternates are flight edges with missing road
slabs. A flattened 1D race cannot draw, rank or physically resolve those. The lifecycle's R1 gate
also requires every branch and flight edge to be driven.

## 2. Decisions already made (by the user)

- **Option B: real CourseGraph topology, no flattening.** Option A (alternate edges as same-stretch
  shortcut lanes on the 1D axis, the Frostbite pattern) is rejected: alternates are much shorter
  than the ground edge, so flattened standings and visuals would be wrong, Skyfall's flight edges
  cannot be represented, and release acceptance would force a redo. The shared template rule
  forbids flattening branch topology.
- **Only Dune and Skyfall use the new path.** The ten released courses (coast, neon, canyon, aurora,
  spiral, taipei, tokyo, alpine, coastal, cosmic), Harbor Circuit, Frostbite Canyon, and
  Stormline / Volcanic / Monsoon (made playable via the Frostbite pattern elsewhere) stay on the
  existing 1D engine, unchanged in behaviour.
- **Order:** Dune first — full regression and exact-HEAD CI, merged into the epic alone — then
  Skyfall. This branch merges into the epic only **after** Stormline, Volcanic and Monsoon have
  merged (they all touch `src/game.js`, `src/race-tracks.ts`, `src/upcoming-tracks.ts`,
  `src/world.js`, `TODO.md`). Every merge needs the user's explicit approval.
- **Dev-only access reuses the existing gate:** `UPCOMING_READINESS` in `src/upcoming-tracks.ts`;
  `isUpcomingEnterable` in `src/access/dev-unlocked.ts` (true only for readiness `playable` with a
  race track) vs `src/access/production.ts` (always false); `raceTrack` / `COURSE_TRACKS` /
  `assertTrackMode` in `src/race-tracks.ts`. Classic mode only; never in Daily, Cup or the catalog.
- **Lifecycle D-gate test names:** `tests/dune-tempest-race.test.js`,
  `tests/dune-tempest-race-browser.spec.js`, `tests/skyfall-archipelago-race.test.js`,
  `tests/skyfall-archipelago-race-browser.spec.js`.

## 3. Goals, non-goals, anti-goals

**Goals**

1. Dune Tempest: eight-car classic sprint START → cp1…cp4 → FINISH on the real graph, every legal
   branch selectable, signed 3D checkpoint/finish gates, graph-aware standings, results saved under
   a topology-keyed id, real WebGL road contact, `make dev-unlocked` only.
2. Skyfall Archipelago: the same, plus three flight edges with real missing-slab gaps.
3. One seam in the existing loop that leaves every other course's behaviour identical, proven by a
   characterization replay captured before the first change.

**Non-goals (this work)**

- Traffic, rings, pickups, Ghost, Daily, Cup, Career, unlocks, stars, medals on graph-runtime
  courses (see open questions Q3, Q4).
- Laps or circuits on a graph (both courses are point-to-point sprints; "lap" does not apply).
- Off-road driving outside the engine's `ROAD_LIMIT` (Q2), weather that changes physics, collapsing
  platforms (Skyfall handoff: stay non-collapsing).
- Release promotion (`ready` / released stages) — that is the lifecycle work.

**Anti-goals (must not happen)**

- A second simulation, renderer, car model, camera system, AI engine or swipe/Garage path per
  course (template rule).
- Any behaviour change on a course that is not Dune or Skyfall, including Frostbite.
- Rounding or quantizing production metres, coordinates, road contact, signed checkpoints,
  collisions or flight gaps.
- Browser/UI input deciding progress, checkpoints or flight authorization: those come only from
  the host physics step in `game.js`.
- Production or `make dev` being able to START either course.

## 4. What exists today (verified on `0c951d49`)

| Area | Fact |
|---|---|
| Race loop | `src/game.js` (598 lines, at its `LEGACY_CEILINGS` limit of 598): `createRace` / `stepRace`; per-car `distance`, `x` (clamped to `ROAD_LIMIT` 10.2 m), `altitude` (0–12 m); cross-car checks use `physicalGap(trackId, a, b)`; finish is `distance >= race.length`. |
| Ceilings | `src/world.js` 1115 / 1126, `src/main.js` 677 / 677. New modules ≤ 400 lines, functions ≲ 60 lines (`tests/module-size.test.js`). |
| Graph modules | `course-graph`, `course-route-frame` (24-step Catmull-Rom arc-length LUT; ~0.28 µs per `sampleRoute` in Node, allocates 4 tuples + 1 object per call), `course-travel`, `course-progress`, `course-signed-gates` (default height band −2…5 m), `course-measured-motion`, `course-fleet`, `course-measured-fleet`, `course-ai-standings`, `course-road-geometry`. All pure and immutable (each step returns new objects). |
| Dune | `PLAYABLE_COURSE_GRAPH` (12 nodes, 14 edges, checkpoints cp1–cp4, ground route 13,713.6 m). Splits: `winding-wadi` 1240 m vs `dune-crest-cut` 918 m (ground); `canyon-switchbacks` 3554 m vs **`canyon-air-crossing` 1088 m (flight)**; `natural-arch-pass` 1045 m vs `dry-wash-cut` 743 m (ground). Flight edge solid road only `[0, 60]` and `[983.3, 1088.3]` m, recovery edge `canyon-switchbacks`. Authored gate band −6…22 m. Nine hazards at physical `atFraction`. Scenery `createDuneTempestVisualChunk` samples the shared `sampleRoute`. |
| Skyfall | `PLAYABLE_COURSE_GRAPH` = `SKYFALL_GRAPH` (8 nodes, 10 edges, checkpoints a/b/c-merge, ground route 16,014.5 m). Flight edges `a-air` 1150 m, `b-air` 868 m, `c-air` 1237 m, each with one missing-slab gap. **Scenery and gaps use a separate sampler** (`sampleSkyfallRoad`: 32-step LUT plus bank up to ±0.12 rad); the adapter converts metres proportionally (`skyfallPhysicalDistance`). `createSkyfallWorld(scene, quality).setFocus([...])` streams 420 m chunks. |
| Reference | Frostbite: `src/courses/frostbite-race.ts` (1D flattening), `src/frostbite-race-scene.ts`, `track-paths.ts` dispatch, `record-layout.ts` (`frostbite-canyon@t1l1`), `firestore.rules` best ids, `tests/frostbite-race*.js`. |

**Findings that shape the design** (probe scripts were run against `0c951d49`, not committed):

- **F1 Junction kinks.** Edge-end vs edge-start tangents differ by up to **90.1°** on Dune
  (`dune-s-bends` → `dune-crest-cut`) and **47°** on Skyfall (`approach` → `a-ground`). A car with a
  ±10 m lateral offset crossing a node is **rejected** by `advanceMeasuredCourseTravel` on 16 Dune
  and 12 Skyfall junction probes (its post-junction projection clamps `consumedS` at 0 and then fails
  the 0.25 m forward check); `dune-s-bends` → `dune-crest-cut` rejects even at lateral 0. Wiring
  as-is would freeze cars at forks.
- **F2 Flight on Dune.** Dune is not ground-only: `canyon-air-crossing` is a flight edge with a
  923 m gap. Phase 1 therefore cannot be "ground only" if Dune is to satisfy R1 (Q1).
- **F3 Gate height.** The engine lets any car fly 0–12 m above the road (rivals hop up to 12 m);
  the signed gate's default band is −2…5 m. A legal physics step through a checkpoint at 6–12 m
  would be rejected and desynchronize the graph state.
- **F4 Two Skyfall samplers.** Rendered road (banked, 32-step) and graph frame (unbanked, 24-step)
  differ; at lateral 10.2 m a 0.12 rad bank alone is ~1.2 m of vertical wheel/road mismatch.
  Violates the contract's "one sampler for road mesh, car pose, camera and AI" (Q5).
- **F5 Duplicate API.** `advanceMeasuredCourseFleet` exists in both `course-fleet.ts` and
  `course-measured-fleet.ts` with different rejection semantics. This design uses neither (§5.3).
- **F6 Ceilings.** `game.js` and `main.js` have zero headroom; every hook must be paid for by
  moving existing code out in the same commit.

## 5. Architecture: the seam

### 5.1 Dispatch: `race.course`

`createRace` calls one new line, `attachCourse(race)`, next to the existing `prepareEndless(race)`.
`attachCourse` looks the track id up in a registry (`src/course-runtimes.ts`). For every id not in
the registry it does nothing and `race.course` stays `undefined`. For Dune (later Skyfall) it sets
`race.course` to a `CourseRuntime` and clears the 1D-keyed lists the course does not use
(`rings`, `pickups`, `traffic`, `hazards`, `sections` → empty).

Every hook inside the step is written `race.course ? <graph path> : <existing expression>`, with the
existing expression moved verbatim. Behaviour for a race without `race.course` is therefore
identical by construction, and a characterization replay (§12.1) proves it.

### 5.2 Per-car model: physics stays 1D, position comes from the graph

The engine's per-car kinematics are kept exactly: speed, throttle/brake, BOOST, NITRO, drift,
FLY/glide, fuel, steering → `x`, `altitude`, knock/bump responses. What changes for a graph car is
what `distance` means and where the car is:

- `car.distance` is that car's **odometer along its own chosen path** (metres from START). It is
  never compared across cars on a graph course.
- `race.course.cars[id]` holds a `CourseTravel` (`currentEdgeId`, `localS`, `lateral`, `altitude`,
  `nextCheckpoint`, `finished`) plus the odometer value at which the current edge began.
- After the engine integrates `distance += speed * dt` for a car, `stepCourseCar` builds a
  **measured sweep** from the previous and new travel poses (world positions from `sampleRoute` +
  `x · right` + `altitude · up`) and advances it with `advanceMeasuredCourseTravel`. Forward edge
  progress equals the odometer delta in physical metres; there is no scalar remapping.
- At an edge end the step is split at the node: one sub-step reaches the node plane (signed gate,
  checkpoint order, finish), the remainder continues on the chosen next edge. One frame crosses at
  most one node (shortest Dune edge 737 m, top speed 118 m/s × 0.1 s max `dt` = 11.8 m).
- **Flight authorization** is computed by the host from physics state only: the car is airborne
  (`altitude > 0`), or is on a solid-road interval of a flight edge. Never from input.
- **Gate band** per course: covers the engine's reachable envelope so a legal step never fails
  (F3). Dune uses its authored −6…22 m; Skyfall: −2…(12 + `CAR_HEIGHT`) unless Q6 says otherwise.
- **A rejected measured step is an invariant violation, never a silent desync.** The car is
  recovered (§8) and `course.rejections` is incremented; tests assert it stays 0 across full races.

Per-car stepping is used instead of either `advanceMeasuredCourseFleet`: the atomic variants roll
back the whole field when one car is rejected, which would freeze eight cars for one bad sweep.
Recovery is per car, so stepping is per car.

### 5.3 Hook inventory

| # | Where | Graph path | Legacy expression kept verbatim |
|---|---|---|---|
| H1 | `createRace` | `attachCourse(race)` | — (no-op without registry entry) |
| H2 | after player/rival `distance` integration | `stepCourseCars(race, previous, dt)` | — |
| H3 | slipstream draft, player-vs-car contact, `bumpCars`, AI follow gap in `car-collisions.js` | `carGap(race, a, b)`: same-edge or path-adjacent cars → signed metres along the leading car's path; different branches → `null` (no interaction) | `physicalGap(race.trackId, a.distance, b.distance)` |
| H4 | rival rubber band | `progressGap(race, player, rival)` from graph standings (remaining metres to the next shared target) | `rival.distance - car.distance` |
| H5 | rival finish, player completion, finish-time interpolation | `travel.finished` and the node-plane crossing fraction | `distance >= race.length` and the existing interpolation |
| H6 | gap fall | `courseGapAt(race.course, id)` from per-edge no-road intervals → `dropCar`-style recovery | `skyGapAt` / `section === 'gap'` |
| H7 | `racePosition`, `sprintGaps` (`src/race-standings.ts`) | `rankCourseFleet` result | existing distance ranking |
| H8 | car pose, camera, shadow, visibility (`world.js`, `track-paths.ts`) | per-car `coursePose` (point/forward/right/up, refreshed in H2) | `trackFrame(trackId, distance, …, span)` |
| H9 | scenery host (`world.js`) | `courseScene.update(race)` / `.hide()` / `.dispose()` | circuit/Frostbite scene lines |

H2–H6 live in a new `src/course-race-step.ts`; the pure runtime in `src/course-race.ts`. To keep
`game.js` ≤ 598 lines, the plan extracts an existing self-contained block (builder's call which:
the rival loop or the result/finish block are the natural candidates) into its own module in the
same commit that adds the hook calls, and lowers the ceiling to the new count.

### 5.4 Modules

| Module | Responsibility |
|---|---|
| `src/course-race.ts` | Pure: `CourseRuntime` creation, per-car measured step with node split, branch choice, gap query, gaps between cars, standings. No DOM, no Three.js. |
| `src/course-race-step.ts` | Thin glue called from `game.js` / `car-collisions.js`: H1–H6. |
| `src/course-runtimes.ts` | Registry `trackId → CourseRaceSpec + TrackConfig`; the only place that knows which ids use the graph runtime. |
| `src/courses/dune-tempest-race.ts` | Dune `CourseRaceSpec` from the existing adapter (gaps, recovery edge, gate band, hazards in physical metres) and `DUNE_TEMPEST_TRACK`. |
| `src/courses/skyfall-archipelago-race.ts` | Phase 2 equivalent. |
| `src/course-race-scene.ts` | Scenery host for H9: streams map-owned chunk factories around the eight cars, warms shaders at load, disposes on track change. |
| `src/course-route-map.ts` | Minimap polyline for all edges + marker positions (consumed by `src/route-map.ts`). |

## 6. Player progress, branches, checkpoints, finish

- **Branch choice (player):** at a split node the player takes the edge on the side of `car.x`:
  candidate edges are ordered by their signed turn relative to the incoming edge's end frame
  (`right` · (edge forward 30 m past the node)); `x < −deadband` → leftmost, `x > +deadband` →
  rightmost, otherwise the `groundRoute` edge. Deadband is the builder's call (one lane, 2.5 m, is a
  reasonable default). The roads visibly diverge in the map scenery before the node; extra fork
  signage is Q7.
- **Checkpoints and finish:** only `advanceSignedGate` (via measured motion) collects checkpoints
  and FINISH, in order, at the node plane, within road width and the course gate band. The odometer
  never awards progress.
- **Finish time:** `elapsed − dt + dt · f`, where `f` is the node-plane crossing fraction of the
  finishing sweep (same formula shape as today's interpolation).
- **Result object:** unchanged shape; `position` from graph standings at the player's finish.

## 7. AI fleet

- Rivals keep their existing speed cap, NITRO, hop cycle, lane (`homeX`), rubber band (H4),
  `avoidObstacles`-style lateral dodge and knock responses.
- **Branch choice:** `chooseCourseNextEdge(graph, node, driverIndex, false, seed)` — deterministic,
  ground-only (flight edges excluded). Both Dune ground alternates (`dune-crest-cut`,
  `dry-wash-cut`) are taken by some rivals. Rivals on flight edges are Q8.
- **Hazard avoidance:** Dune hazards (`safePassSide`, `aiPreviewMeters` 120) feed the same lateral
  dodge the rivals use for props; via `DUNE_TEMPEST_AI_HINTS`.
- **Standings:** `rankCourseFleet` once per frame for the field (checkpoint count first, then
  remaining physical metres to the next mandatory target, finish times last). Its memo is per call;
  caching the node→target distance table on the runtime (invalidated never: the graph is immutable)
  is allowed.

## 8. Collision, hazards, recovery

- **Car vs car:** H3. Cars on different branches never collide; at split/merge nodes the path-
  adjacent rule covers the shared node neighbourhood. Contact thresholds stay the engine's (4.4 m,
  1.7 m, 1.8 m).
- **Hazards:** per edge at `atFraction × routeLength(graph, edgeId)`, `lateralMeters`,
  `collisionRadiusMeters`; swept between previous and new `localS` on the car's current edge; a hit
  uses the existing `contact(race, 'barrier', …)` response for the player and `knock` for rivals.
- **Road edge:** `ROAD_LIMIT` (±10.2 m) rail/scrape logic unchanged (Q2).
- **Gap falls (flight edges):** a car over a no-road interval with `altitude < GAP_CLEARANCE` falls:
  existing `dropCar` semantics (speed × `GAP_SLOWDOWN`, grace, `falls`/`fall` recorded), placed on the
  course's recovery edge for that flight edge at the split node (`localS` 5 m, first clear slot —
  never ahead of the split, checkpoints unchanged). Dune: `canyon-switchbacks`. Skyfall: the
  parallel ground edge.
- **Rejected sweep:** same recovery, to the start of the car's current edge if it is ground, else
  the recovery edge. The frame of a recovery collects no gate, hazard or score sweep (Frostbite's
  `fell` rule).

## 9. HUD, minimap, results, save keys

- **HUD:** position and ahead/behind gaps from H7. Distance-to-go shows remaining metres on the
  player's current path to FINISH via the ground route from the next node (builder's call on
  wording; no new strings needed if the existing metres/KM formatter is reused).
- **Track card:** `#track-length` shows the ground-route length (Dune 13.7 KM, Skyfall 16.0 KM).
- **Minimap:** all edges drawn from `sampleRoute` (ground route solid, alternates distinct, flight
  edges dashed — builder's call on styling, appended below the main-UI contract slice of
  `style.css` like Frostbite); markers from each car's `coursePose`.
- **Results and save:** register in `COURSE_TRACKS` with `topologyVersion = graph.version`, so
  records are `dune-tempest@t1l1` and `skyfall-archipelago@t1l1` through `record-layout.ts`; add both
  ids to `firestore.rules` best ids/`validBest`. Settlement follows the Frostbite gated path:
  history + best, no medals, stars, unlocks or NEXT. Ghost is not saved or replayed (Q4).

## 10. Rendering and camera

- `framedRoad` includes the graph-runtime ids; each car's mesh uses its `coursePose` instead of
  `trackFrame(trackId, distance)`; the origin is the player's `coursePose.point`. The pose objects
  are preallocated per car and overwritten in place each step.
- **Camera look-ahead:** sample the player's current edge at `localS + lookAhead`; past the edge
  end, continue on the edge the player would take now (`chooseBranch` with current `x`). Snap (no
  lerp) on recovery, as Frostbite does on a span respawn.
- **Road contact:** Dune road ribbons are built by the map chunk from the same `sampleRoute`
  frames, so wheel contact, gates and the visible surface share one frame. Skyfall needs Q5 first.
- **Junction kinks (F1):** the centreline is continuous but the heading jumps at nodes; a car at
  lateral offset is drawn up to `2|x|·sin(kink/2)` off its previous pose across one frame. The
  runtime fix (Task 2 of the plan) keeps the car's road-frame lateral; the visual snap is Q9.
- **Scenery host:** `createCourseRaceScene(scene)` keeps chunks for the edges within the window
  around each of the eight cars, builds the hidden shader sample for every chunk material at track
  load (`warmupShaders` rule), disposes unique GPU resources on eviction and track change, and never
  rebuilds geometry per frame.

## 11. Flight edges

- Shared mechanic, no new controller: the existing FLY/glide/fuel physics; a flight edge's
  no-road intervals behave like a 1D `gap` section (H6). Feasibility on Dune's 923 m gap: pulsing FLY
  hovers at ~27 % duty (thrust 19 m/s² vs glide 7 m/s²), roughly 1 fuel/s net, so the crossing is
  achievable with skill and fails safely without it. The plan's race test must prove a scripted
  crossing completes.
- `gapChargeWarning` gets the graph equivalent (next no-road interval on the player's current edge
  within `GAP_WARN_DISTANCE`).
- Skyfall: gaps are authored in Skyfall-sampler metres; the race spec stores them in **graph
  metres** (inverse of `skyfallPhysicalDistance`, or directly if Q5 unifies the sampler). Landing
  is legal only on road (`canTraverseSkyfallRoad` semantics).
- Takeoff/landing VFX, jets and the in-race FLY input are the existing ones; AIRFLOW (home preview)
  is unrelated and untouched.

## 12. Performance budget

Measure first (`.claude/rules/performance-work.md`), on the Dune race with eight cars:

| Metric | How | Budget |
|---|---|---|
| `stepRace` time per frame | Node bench, 60 Hz, full race; Dune vs Coast baseline | course overhead ≤ 0.3 ms p95 |
| `sampleRoute` calls per frame | counter in bench | ≤ 6 per car (≤ 48); measured cost ~0.28 µs each |
| Heap bytes per frame | `--expose-gc` bench, heap delta over 10,000 frames | reported; `course-race.ts` own code allocates nothing per frame (preallocated poses, reused sweep objects) |
| Browser frame time p50/p95 | real WebGL, desktop + one phone, Low/Medium/High | not worse than Frostbite at the same tier by > 10 % |
| Draw calls / triangles | scene-cost script like `frostbite-scene-cost.mjs` | reported per tier |
| Chunk stream-in | build ms per chunk | off the frame or < 4 ms |

The shared modules allocate by design (immutable tuples and states). If the heap/GC numbers show in
browser p95, add allocation-free variants (`sampleRouteInto(out, …)`) — not before, and with the
before/after number.

## 13. Test strategy

1. **Characterization guard first** (`tests/legacy-race-replay.test.js`): scripted inputs for every
   1D track id (ten courses, Harbor Circuit, Frostbite) across classic and the other modes the
   track supports, at 30/60/120 Hz; a SHA-256 of the canonical race state after N seconds, values
   captured on `0c951d49` **before** any change. Green before and after every task.
2. **RED first** for every behaviour task; a syntax/import error is not RED.
3. **Physical arc length:** positions and hazards are asserted at fractions of `routeLength`
   (the graph's physical metres), never of an authored scalar parameter.
4. **Float tolerances explicit:** e.g. pose vs `sampleRoute` ≤ 1e-6 m; frame orthonormality
   ≤ 1e-9; finish time across 30/60/120 Hz within a stated tolerance (builder picks and records it).
   No strict equality between results of different floating-point expression orders.
5. **No quantization** of metres, coordinates, road contact, gates, collisions or gaps in code or
   tests.
6. **Race tests (D2):** START → FINISH with a scripted bot for each branch combination (Dune
   3 splits → 8 paths; Skyfall 3 → 8), eight cars, all rivals finish, zero rejections, ordered
   checkpoints, standings consistent with physical remaining metres, recovery after a forced fall.
7. **Browser (D2):** `make dev-unlocked` alias; desktop 1440×900 and phone 390×844; card → START →
   finish → results with real clicks; Coming Soon in release build.

## 14. Cross-course regression matrix

Run after Dune and again after Skyfall:

- All six new-course IDs on Home (card, CTA, preview, swipe, Garage Home ↔ Preview Studio, AIRFLOW
  both states, six camera views) — the template rule's spec list.
- Ten released courses + Harbor Circuit: the replay guard plus their existing unit/browser suites
  and the World Tour long-run (`make verify`).
- Frostbite race (`tests/frostbite-race*.js`) unchanged.
- Dune / Skyfall: every branch, flight edge, hazard, recovery, finish, results, en / zh-TW,
  touch / mouse / keyboard, Reduced Motion, Low/Medium/High, GPU disposal on track switch.
- Release build: both cards Coming Soon, START disabled, stale unlock lists ignored.

## 15. Risks

| Risk | Mitigation |
|---|---|
| A hook changes a legacy track subtly | Replay guard captured before the first change; verbatim legacy branch. |
| Junction kinks freeze or teleport cars (F1) | Plan Task 2 RED on every real junction × lateral {−10, 0, +10} × 30/60/120 Hz. |
| Gate band rejects legal flight (F3) | Course band covers the engine envelope; rejection counter asserted 0. |
| Ceilings block the change (F6) | Extraction in the same commit; ceilings ratcheted down. |
| Parallel 1D courses conflict in shared files | Merge only after Stormline/Volcanic/Monsoon; rebase-free merge of the epic before final CI. |
| Skyfall road/physics mismatch (F4) | Decide Q5 before Phase 2 code. |
| Allocation pressure on phones | Measured budget §12; allocation-free variants only on evidence. |
| 13.7–16 km races hide late-race bugs | Full-length bot runs in unit tests; real START → FINISH in browser. |

## 16. Left to the builder

Which `game.js` block is extracted; branch-choice deadband; the exact path-adjacency rule inside
`carGap`; caching of the node→target distance table; minimap styling; HUD distance-to-go wording;
chunk window size per quality tier; the 30/60/120 Hz finish-time tolerance (recorded in the test);
bench harness shape.

## 17. Open questions for the user

- **Q1 Dune's flight edge in Phase 1?** Recommended: yes — Dune's R1 needs `canyon-air-crossing`
  driven, and Skyfall then reuses the same gap mechanic. Alternative: Phase 1 locks the player to
  ground edges at `split2` and Dune stays below `ready` until Phase 2.
- **Q2 Lateral range.** Keep `ROAD_LIMIT` ±10.2 m on 24–60 m wide roads (recommended for this work;
  Dune off-road zones then unused), or per-edge half-width (touches the core clamp, rail and lane
  logic).
- **Q3 Rings / pickups / traffic** on graph courses. Recommended: none in this work (NITRO still
  comes from drift, slipstream, tricks, landing chains); a follow-up places them by `(edgeId,
  localS)`.
- **Q4 Ghost.** Recommended: no Ghost save/replay on graph-runtime courses until samples carry
  edge ids (a schema change).
- **Q5 Skyfall sampler.** Render Skyfall's road from the shared `sampleRoute` (one sampler, loses
  authored bank), or give the shared frame an optional bank from the map so physics matches the
  banked render. Either touches map-owned or shared code; needed before Phase 2.
- **Q6 Skyfall gate band** (none authored): engine envelope −2…13.2 m (recommended) or an authored
  band from the map owner.
- **Q7 Fork telegraphing.** Diverging road only (recommended minimum) or a HUD fork arrow / signs
  (new strings, en + zh-TW).
- **Q8 Rivals on flight edges.** Recommended: ground-only AI in this work; AI flight later.
- **Q9 Authored junction kinks** (90° Dune `dune-s-bends` → `dune-crest-cut`; up to 47° Skyfall).
  Smooth the map tangents (map-owned data, changes geometry and art alignment) or accept a heading
  snap at nodes.
