# CourseGraph race runtime (Dune Tempest, then Skyfall Archipelago) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Race Dune Tempest, then Skyfall Archipelago, START → FINISH on their real CourseGraph
topology in `make dev-unlocked`, while `make dev` and production keep both Coming Soon and every
other course behaves exactly as before.

**Architecture:** One dispatch seam, `race.course`, set by `attachCourse(race)` only for ids in a
new registry. Per-car kinematics stay in `src/game.js`; for a graph car `distance` is its own path
odometer and its position, checkpoints, finish and standings come from the existing measured-motion
/ signed-gate / standings modules, stepped per car. Every hook keeps the legacy expression verbatim
in its non-course branch; a replay hash captured before the first change proves it.

**Tech Stack:** Vue 3, TypeScript (strict), Vite, Three.js r186 per current lockfile (obey the
installed API), `node:test` (`npm test` = `node --test tests/*.test.js`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-course-graph-runtime-design.md`

## Global Constraints

- Branch `feature/course-graph-runtime` only. No PR, merge, push to `develop`/`main`, deploy or
  force-push without the user's explicit approval. Merge into the epic only after Stormline,
  Volcanic and Monsoon have merged, Dune alone first, then Skyfall.
- Only `dune-tempest` and `skyfall-archipelago` use the graph runtime. Ten released courses, Harbor
  Circuit, Frostbite, Stormline, Volcanic, Monsoon: behaviour unchanged (Task 1 guard green after
  every task).
- Classic mode only; never in `RACE_TRACKS`, Daily, Cup, Career, catalog, unlocks, stars, medals.
- Production `isUpcomingEnterable` stays constant `false`; readiness flips to `playable` only in the
  task that adds the browser D2 spec.
- `src/game.js` ≤ 598 lines and `src/main.js` ≤ 677 (zero headroom); `src/world.js` ≤ 1126. New
  modules ≤ 400 lines, functions ≲ 60 lines. A shrunk legacy file lowers its `LEGACY_CEILINGS` entry
  in the same commit; never raise one.
- Geometry tests compare **physical arc-length** fractions (`fraction × routeLength(graph, edgeId)`),
  explicit float tolerances, no strict equality across expression orders; never round/quantize
  metres, coordinates, road contact, gates, collisions or gaps.
- Progress, checkpoints, finish and flight authorization come only from the host step; never from
  UI/input.
- Public repo: no personal absolute paths, device names or machine ids in code, tests or docs.
- RED must be a semantic assertion failure (not an import/syntax error); record command + observed
  result in `TODO.md`. Never delete or weaken a test; replacing a hard-coded id list with an extended
  one is an update, not a weakening.
- Browser runs: `npm run build` (or `node scripts/build-garage-browser.mjs` for direct Playwright
  runs) first; use `PLAYWRIGHT_PORT=<free port>` when 5178 is busy.
- A test that reads a new doc must be listed in `NEEDS_CI` in `scripts/ci-changes.mjs`.

## Review Focus

1. **Lateral offset at forks:** a car at x = ±10 m entering any real junction (Dune kinks up to 90°,
   Skyfall 47°) must continue, not freeze or teleport — Task 2 pins every junction.
2. **Checkpoint crossed in the air:** a car (player FLY or rival hop) passing a node at 6–12 m
   altitude must collect it, and the same car above the band must not — Task 3.
3. **Two cars on parallel branches at equal odometer** must not bump, draft or rubber-band off each
   other — Task 5.
4. **Fall in a flight gap, then immediately cross a gate** in the recovery frame: no checkpoint,
   hazard or score sweep is collected — Task 6.
5. **Switching from Dune to a classic track and back** restores the classic Start/Locked state and
   disposes Dune chunks (GPU memory returns to baseline) — Task 8.

---

## Phase 1 — shared seam + Dune Tempest

### Task 1: Legacy replay guard (characterization, before any change)

**Files:**
- Create: `tests/legacy-race-replay.test.js`
- Create: `tests/fixtures/legacy-race-replay.json`

**Interfaces:**
- Produces: `replayHash(trackId: string, config: object, hz: 30|60|120, seconds: number): string` (test-local helper) — SHA-256 hex of a canonical JSON of `race.player`, `race.rivals`, `race.traffic`, `race.result`, `race.elapsed`, `race.phase` after a scripted input timeline.

- [ ] **Step 1: Write the test.** For every id in `RACE_TRACKS`, `harbor-circuit` (`CIRCUIT_ID`) and `frostbite-canyon`: classic at 30/60/120 Hz for 45 s with a fixed timeline (throttle, steer ±1 pulses, BOOST, NITRO press, FLY 2 s, brake+steer drift); plus, at 60 Hz on `coast`, one run per other mode in `MODES` (`src/race-config.ts`) that `coast` accepts (`custom`, `free`, `time`, `gauntlet`, `checkpoint`, `stunt`, `elimination`, `endless`; `cup` with its default track list) and `circuit` on `harbor-circuit`; plus the three Daily modifiers on `canyon`. Assert `replayHash(...) === fixture[key]`. Canonical JSON: keys sorted, numbers via `Number.prototype.toString` (no rounding).
- [ ] **Step 2: Capture the fixture on `0c951d49`** (no source change yet): run a one-off `RECORD_REPLAY=1 node --test tests/legacy-race-replay.test.js` that writes the JSON. Then run without the env var. Expected: PASS. Also confirm it is sensitive: temporarily change `MAX_SPEED` locally → expected FAIL on every key; revert (do not commit the change).
- [ ] **Step 3: Commit** `test(course-runtime): characterize legacy race replays before graph wiring`.

### Task 1A: Tangent-continuous junctions for Dune (Q9 decided: smooth the map)

**Files:**
- Modify: Dune graph data (`src/courses/dune-tempest-graph.ts` / `src/courses/dune-tempest.ts`, tangent / control-point data near nodes only)
- Create: `tests/course-junction-tangents.test.js`
- Update (new measured values, same commit): `tests/dune-tempest-graph.test.js`, `tests/dune-tempest-course.test.js` and any other Dune test that hard-codes lengths, hazard positions or route totals

**Interfaces:**
- Produces: Dune `PLAYABLE_COURSE_GRAPH` with unchanged node ids / positions, edge ids, checkpoints, split/merge structure and flight gaps; only tangents near nodes change.

- [ ] **Step 1: Write the failing test.** For every connected pair `a → b` in Dune's `PLAYABLE_COURSE_GRAPH`: heading of `sampleRoute(a, length(a))` vs `sampleRoute(b, 0)` ≤ 1°. Also assert node positions and edge-id sets equal the `0c951d49` values.
- [ ] **Step 2: Run** `node --test tests/course-junction-tangents.test.js`. Expected: FAIL (`dune-s-bends → dune-crest-cut` ≈ 90°).
- [ ] **Step 3: Smooth** the tangents (method is the builder's call; spec §17). Keep hazards and gates at the same physical fraction of their edge; none may fall inside a blend span. Update hard-coded Dune lengths / totals to the new measured values; never loosen an assertion.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including Task 1's replay guard (no 1D track changes).
- [ ] **Step 5: Real WebGL check** of Dune's home Coming Soon 3D preview and route SVG (if graph-derived) on desktop and phone; record in `TODO.md`.
- [ ] **Step 6: Commit** `fix(dune): tangent-continuous junctions (Q9)`.

### Task 2: Junction crossings at lateral offset (`course-measured-motion.ts`)

**Files:**
- Modify: `src/course-measured-motion.ts` (post-junction projection only)
- Test: `tests/course-measured-junctions.test.js`

**Interfaces:**
- Consumes: `advanceMeasuredCourseTravel(graph, state, motion)` (unchanged signature).
- Produces: same function; after a node crossing the new state has `localS = overflow` (metres past the node along the next edge) and `lateral` equal to the incoming lateral within 1e-6 m.

- [ ] **Step 1: Write the failing test.** For both adapters' `PLAYABLE_COURSE_GRAPH`, every edge pair `a → b` with `b.from === a.to`, lateral ∈ {−10, 0, +10}, overflow ∈ {0.5, 1.5, 3.0} m (≈ 30/60/120 Hz at 90 m/s): build `state` at `routeLength(a) − 0.8` with the correct `nextCheckpoint`, `fromPosition = courseTravelPosition(graph, state)`, `toPosition` = `sampleRoute(b, overflow)` + lateral·right, `flightAuthorized: true`, `gateHeight: { minHeight: -2, maxHeight: 13.2 }`. Assert `next !== state`, `next.currentEdgeId === b.id`, `Math.abs(next.localS - overflow) < 0.05`, `Math.abs(next.lateral - lateral) < 1e-6`. Keep the negative cases: reverse sweep, wrong next edge, skipped checkpoint, altitude 20 m → still rejected.
- [ ] **Step 2: Run** `node --test tests/course-measured-junctions.test.js`. Expected: FAIL (≈16 Dune and 12 Skyfall junction cases rejected; `dune-s-bends → dune-crest-cut` also at lateral 0).
- [ ] **Step 3: Implement.** In the crossing branch, derive the next-edge state from the host's road-frame quantities instead of re-projecting the world point onto the next edge's tangent: `localS = toS − length` (the overflow), `lateral`/`altitude` carried from the motion. Keep the signed gate (plane at the node, direction, width, height, order) and the 3D step bound unchanged; validate the new pose against `sampleRoute(next, overflow)` with the same width and altitude rules. Add `readonly lateral: number; readonly altitude: number` to `MeasuredCourseMotion` if the host must supply them (then update `tests/course-measured-motion.test.js` call sites, assertions unchanged).
- [ ] **Step 4: Run** the new test plus `node --test tests/course-measured-motion.test.js tests/course-measured-fleet.test.js tests/course-signed-gates.test.js tests/course-fleet.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(course-graph): carry road-frame lateral across kinked junctions`.

### Task 3: Pure course runtime (`src/course-race.ts`)

**Files:**
- Create: `src/course-race.ts`
- Test: `tests/course-race.test.js`

**Interfaces:**
- Consumes: Task 2; `sampleRoute`, `routeLength`, `createCourseTravel`, `courseTravelPosition`, `advanceMeasuredCourseTravel`, `chooseCourseNextEdge`, `rankCourseFleet`, types `CourseGraph`, `CourseTravel`, `GateHeightBand`, `CourseStanding`.
- Produces:
```ts
export interface CourseHazard { readonly id: string; readonly edgeId: string; readonly localS: number;
  readonly lateral: number; readonly radius: number; readonly safePassSide: 'left' | 'right' }
export interface CourseRaceSpec {
  readonly graph: CourseGraph; readonly gateHeight: GateHeightBand;
  readonly noRoad: Readonly<Record<string, readonly (readonly [number, number])[]>>; // graph metres
  readonly recoveryEdge: Readonly<Record<string, string>>;  // flight edge id -> ground edge id
  readonly hazards: readonly CourseHazard[];
}
export interface CoursePose { readonly point: number[]; readonly forward: number[]; readonly right: number[]; readonly up: number[] } // length 3, overwritten in place
export interface CourseKinematics { readonly distance: number; readonly x: number; readonly altitude: number }
export interface CourseCar { travel: CourseTravel; edgeStart: number; last: CourseKinematics;
  readonly pose: CoursePose; finishFraction: number | null }
export interface CourseRuntime { readonly spec: CourseRaceSpec; readonly cars: Map<string, CourseCar>;
  rejections: number; standings: CourseStanding[] }
export type CourseStepEvent = 'moved' | 'crossed' | 'finished' | 'rejected';
export function createCourseRuntime(spec: CourseRaceSpec, grid: readonly { id: string; distance: number; x: number }[]): CourseRuntime;
export function stepCourseCar(rt: CourseRuntime, id: string, now: CourseKinematics, maxStepMetres: number,
  chooseEdge: (nodeId: string) => string | null): CourseStepEvent;
export function chooseBranchByLateral(graph: CourseGraph, incomingEdgeId: string, lateral: number, deadband: number): string | null;
export function courseNoRoadAt(rt: CourseRuntime, id: string): boolean;
export function courseCarGap(rt: CourseRuntime, from: string, to: string): number | null;
export function rankCourseRuntime(rt: CourseRuntime, finishTimes: Readonly<Record<string, number>>): CourseStanding[];
export function placeCourseCar(rt: CourseRuntime, id: string, edgeId: string, localS: number, kinematics: CourseKinematics): void;
```

- [ ] **Step 1: Write the failing tests** (fixture: the Dune `PLAYABLE_COURSE_GRAPH`, `gateHeight {−6, 22}`, empty hazards/noRoad):
  - `createCourseRuntime` with grid `[{id:'YOU',distance:24,x:2.5}, …8]` → each `travel.currentEdgeId === 'sunset-start'`, `localS === distance`, pose point within 1e-6 m of `sampleRoute(..., 24).point + 2.5·right`.
  - Driving `YOU` at 1.5 m/step, x = 0, `chooseEdge = groundRoute` → visits exactly `graph.groundRoute` in order, `nextCheckpoint` goes 0→4, last event `'finished'`, final odometer within 0.5 m of 13,713.6, `rt.rejections === 0`.
  - Same at x = −10 and +10, and at step sizes 3.0 / 1.5 / 0.75 (30/60/120 Hz) → identical edge sequence; finish odometers agree within 0.5 m.
  - Altitude 9 m across `cp2` → `'crossed'`, checkpoint collected; altitude 30 m → `'rejected'`, travel unchanged, `rejections === 1`.
  - `chooseBranchByLateral(graph, 'dune-s-bends', -5, 2.5)` and `(…, +5, 2.5)` return the two different `split1` edges, and `(…, 0, 2.5) === 'winding-wadi'`; a non-split incoming edge returns its only successor.
  - `courseCarGap`: two cars on `sunset-start` at localS 100 and 104 → `4`; one on `winding-wadi`, one on `dune-crest-cut` at equal odometer → `null`; `merge1` neighbourhood (one 2 m before the node, one 1 m after on `rock-gate-descent`) → `3` within 0.01.
  - `rankCourseRuntime`: car on `dune-crest-cut` near `merge1` outranks a car on `winding-wadi` with a larger odometer.
- [ ] **Step 2: Run** `node --test tests/course-race.test.js`. Expected: FAIL (module missing first; then semantic failures once a stub exports the names — record the semantic RED).
- [ ] **Step 3: Implement** in `src/course-race.ts`. `stepCourseCar` splits a step that reaches the edge end into node-plane + remainder (§5.2 of the spec), calls `advanceMeasuredCourseTravel` with `flightAuthorized = now.altitude > 0 || onSolidPad`, writes `pose` in place, stores `last`, sets `finishFraction` from the gate-plane crossing. No per-call allocation in this module's own code beyond what the shared modules return.
- [ ] **Step 4: Run** the test. Expected: PASS. Run `npm test`. Expected: PASS (including Task 1).
- [ ] **Step 5: Commit** `feat(course-runtime): pure per-car CourseGraph race runtime`.

### Task 4: Dune race spec and registry (no readiness change)

**Files:**
- Create: `src/courses/dune-tempest-race.ts`, `src/course-runtimes.ts`
- Modify: `src/race-tracks.ts` (`COURSE_TRACKS`, `raceTrack`, `assertTrackMode`)
- Test: `tests/dune-tempest-race.test.js` (first cases)

**Interfaces:**
- Consumes: `PLAYABLE_COURSE_GRAPH`, `DUNE_TEMPEST_RUNTIME_METADATA`, `DUNE_TEMPEST_COURSE`, `DUNE_TEMPEST_GATES` from the Dune modules; Task 3 types.
- Produces:
```ts
export const DUNE_TEMPEST_ID = 'dune-tempest';
export const DUNE_TEMPEST_RACE: CourseRaceSpec;
export const DUNE_TEMPEST_TRACK: TrackConfig & { topology: 'course-graph-runtime'; topologyVersion: 1 };
// src/course-runtimes.ts
export interface CourseRuntimeEntry { readonly spec: CourseRaceSpec; readonly track: TrackConfig & { topologyVersion: number } }
export const COURSE_RUNTIMES: Readonly<Record<string, CourseRuntimeEntry>>;
export const isCourseRuntime: (id: string) => boolean;
```

- [ ] **Step 1: Write the failing tests:** `DUNE_TEMPEST_TRACK.length === Math.floor(Σ routeLength(groundRoute))` (13,713); `trafficDensity === 0`; `sections` empty; `DUNE_TEMPEST_RACE.gateHeight` equals the authored −6 / 22; `noRoad['canyon-air-crossing']` equals the complement of `solidRoadIntervals` (`[[60, 983.306…]]`, compared within 1e-9); `recoveryEdge['canyon-air-crossing'] === 'canyon-switchbacks'`; every hazard `localS === atFraction × routeLength(graph, edgeId)` within 1e-9; `raceTrack('dune-tempest') === DUNE_TEMPEST_TRACK`; `assertTrackMode('dune-tempest', 'time')` throws `RangeError`; `RACE_TRACKS` has no `dune-tempest`; `upcomingReadiness('dune-tempest') === 'preview'` still.
- [ ] **Step 2: Run** `node --test tests/dune-tempest-race.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** `COURSE_TRACKS` = Frostbite entry + `COURSE_RUNTIMES` tracks; `raceTrack` resolves `COURSE_TRACKS[id]` (Frostbite result identical); `assertTrackMode` keeps the Frostbite message verbatim and adds `'<Name> is a gated classic sprint'` for runtime ids. Seed: a new value not used by any track.
- [ ] **Step 4: Run** the test, `tests/frostbite-race.test.js`, `tests/coming-soon-release.test.js`, Task 1. Expected: PASS.
- [ ] **Step 5: Commit** `feat(dune-tempest): register gated CourseGraph race spec`.

### Task 5: Engine wiring (H1–H5, H7) and Dune START → FINISH

**Files:**
- Create: `src/course-race-step.ts`; one extraction module from `src/game.js` (builder's choice, e.g. `src/rival-step.js` or `src/race-finish.js`)
- Modify: `src/game.js`, `src/car-collisions.js`, `src/race-standings.ts`, `tests/module-size.test.js` (lower `src/game.js` ceiling to the new count)
- Test: `tests/dune-tempest-race.test.js`, `tests/course-race-step.test.js`

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces:
```ts
export function attachCourse(race: object): void;                       // H1
export function stepCourseCars(race: object, dt: number): void;           // H2, after distance integration
export function carGap(race: object, a: object, b: object): number | null; // H3; legacy: physicalGap(race.trackId, a.distance, b.distance)
export function progressGap(race: object, from: object, to: object): number; // H4; legacy: to.distance - from.distance
export function courseFinished(race: object, car: object): boolean;       // H5; legacy: car.distance >= race.length
```
`racePosition` / `sprintGaps` use `race.course.standings` when present.

- [ ] **Step 1: Write the failing tests.**
  - `course-race-step.test.js`: for a Coast race, `carGap`/`progressGap`/`courseFinished` return exactly the legacy expressions for 1,000 random distance pairs; `attachCourse` leaves `race.course === undefined` and the race object deep-equal to before.
  - `dune-tempest-race.test.js`: `createRace('dune-tempest')` → `race.course` defined, `rings`, `pickups`, `traffic`, `hazards` empty; a throttle+BOOST bot at 60 Hz with player x held per path reaches `phase === 'finished'` for all 4 ground-only path combinations (split2 via ground until Task 6); `result.position` in 1..8; every rival `finishTime !== null`; `race.course.rejections === 0`; player checkpoints collected in order cp1..cp4; finish time at 30/60/120 Hz within the recorded tolerance; a rival on `dune-crest-cut` and the player on `winding-wadi` at equal odometer never trigger `contact` (player `collisions` unchanged over that window).
  - Bot time window: assert 150 s ≤ finish ≤ 330 s, record the measured value in a comment (Frostbite precedent: measured, not the spec's hypothesis).
- [ ] **Step 2: Run** both tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Hooks per spec §5.3; legacy expressions moved verbatim; callers treat `carGap(...) === null` as "no interaction". `maxStepMetres = speed·dt·(1 + |x|·curvature) + |Δx| + |Δaltitude| + 0.01`. Extract one existing `game.js` block in the same commit so `wc -l src/game.js` ≤ 598, then set its ceiling to that count.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`. Expected: PASS, Task 1 hashes unchanged, module-size green.
- [ ] **Step 5: Commit** `feat(course-runtime): dispatch graph courses through the shared race loop`.

### Task 6: Hazards, flight gap, recovery (Dune) — Q1 decided: flight edge ships in Phase 1

**Files:**
- Modify: `src/course-race.ts` (`recoverCourseCar`), `src/course-race-step.ts` (H6, hazard sweep, `courseGapWarning`)
- Modify: `src/game.js` only at the existing `gapNow` / `gapChargeWarning` expressions (net line count ≤ ceiling)
- Test: `tests/dune-tempest-race.test.js`, `tests/course-race.test.js`

**Interfaces:**
- Produces: `recoverCourseCar(rt, id, isClear: (edgeId: string, localS: number) => boolean): { edgeId: string; localS: number; odometer: number } | null`; `courseGapWarning(race): { from: number; need: number } | null` (same shape as `gapChargeWarning`).

- [ ] **Step 1: Write the failing tests.**
  - Player chooses `canyon-air-crossing` (x toward it at `split2`) with no FLY → falls inside `[60, 983.3]`: `falls === 1`, `fall` recorded, speed ×0.4, placed on `canyon-switchbacks` at `localS` ∈ [5, 65], `nextCheckpoint` unchanged, odometer not ahead of the `split2` odometer.
  - Scripted FLY pulse controller crosses the gap and lands in `[983.3, 1088.3]`, then reaches FINISH; all 8 path combinations finish; `rejections === 0`.
  - Recovery frame collects no gate/hazard/score even when the recovery point is inside a hazard sweep window.
  - A hazard at `atFraction × routeLength` on the player's edge within `collisionRadiusMeters` laterally → `collisions` +1 with `impact.kind === 'barrier'`; the same hazard on the parallel branch → no contact. Rivals' x moves to `safePassSide` within `aiPreviewMeters`.
  - `courseGapWarning` non-null within 300 m before the gap when fuel < the computed need.
  - Rivals never select `canyon-air-crossing` (Q8 decided: ground-only AI).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** using existing `dropCar` semantics and `GAP_SLOWDOWN`; `isClear` rejects slots within 4.4 m of another car on that edge or inside a hazard footprint.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(dune-tempest): flight gap, hazards and recovery on the graph runtime`.

### Task 7: Results, save keys, Ghost off

**Files:**
- Modify: `firestore.rules` (best ids + `validBest` for `dune-tempest@t1l1`), `src/ghost.ts` or `src/ghost-store.ts` (graph-runtime ids never valid), `src/race-results.ts` only if the gated path needs it
- Test: `tests/dune-tempest-race.test.js` (persistence cases), existing `tests/firestore-rules.test.js` (derives ids)

- [ ] **Step 1: Write the failing tests** (Frostbite persistence pattern): a finished Dune race settles → localStorage keys exactly `skyline-rush-best-tracks`, `skyline-rush-history`, `skyline-rush-unlocked`; best keys `['dune-tempest@t1l1']`; unlocked unchanged; `next === null`; no medals; a 600-sample trace saves **no** Ghost; `recordTrackId('dune-tempest') === 'dune-tempest@t1l1'`.
- [ ] **Step 2: Run.** Expected: FAIL on rules id / Ghost.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`; `npm run test:cloud` if Java 21 + emulators are available, else record the blocker (CI runs Cloud-save).
- [ ] **Step 5: Commit** `feat(dune-tempest): topology-keyed results without Ghost`.

### Task 8: Rendering, camera, scenery host, minimap, HUD

**Files:**
- Create: `src/course-race-scene.ts`, `src/course-route-map.ts`
- Modify: `src/world.js` (≤ 1126 lines), `src/track-paths.ts`, `src/route-map.ts`, `src/race-hud.ts` (only if `sprintGaps` shape needs it), `src/style.css` (append below the contract slice; if anything above the NITRO marker changes, update `cssBlob` in the main-UI contract)
- Test: `tests/course-race-scene.test.js`, `tests/course-route-map.test.js`

**Interfaces:**
- Produces: `createCourseRaceScene(scene: THREE.Scene): { update(race: object, quality: 'low'|'medium'|'high'): void; hide(): void; dispose(): void }` with a registry `trackId → (parent, edgeId, sample, quality) => { group, dispose }` (Dune: `createDuneTempestVisualChunk`); `courseRouteOverview(graph: CourseGraph, count: number): { edgeId: string; mode: 'ground'|'flight'; ground: boolean; points: { x: number; y: number }[] }[]`.

- [ ] **Step 1: Write the failing tests.** Scene: chunks exist for every edge within the window of each of 8 cars spread over 3 edges; moving all cars 3 km disposes the old chunks (geometry `dispose` spy count equals created unique geometries, shared materials never disposed); a hidden shader sample for every chunk material exists after the first `update`; `dispose()` leaves zero children. Track switch: Dune → Coast → Dune in one `world` instance hides the course scene on Coast, restores Coast's own scenery and Start/Locked state, and `renderer.info.memory.geometries` returns to the Coast baseline (browser case in `tests/dune-tempest-race-browser.spec.js`, Task 9). Route map: one polyline per edge (14 for Dune), endpoints within 1e-6 of node `at` after the shared projection, flight edge flagged. Camera/pose: for a Dune race, the player mesh position equals `coursePose.point − origin + offsets` (unit test on the pure pose helper in `track-paths.ts`), look-ahead past an edge end follows `chooseBranchByLateral`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `world.js`: `framedRoad` includes `isCourseRuntime(id)`; pose/origin `car.coursePose ?? trackFrame(...)` on existing lines; one line each for `courseScene.update/hide` and `dispose`. Visibility gate uses `carGap` or 3D distance for graph cars. Snap camera on recovery.
- [ ] **Step 4: Run** `npm test`, `npm run build`, `PLAYWRIGHT_PORT=<port> npx playwright test tests/shader-warmup-browser.spec.js tests/black-frame-browser.spec.js tests/legacy-minimap-browser.spec.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(course-runtime): render graph cars, Dune scenery and minimap`.

### Task 9: Dev-only access and the D2 browser spec

**Files:**
- Modify: `src/upcoming-tracks.ts` (`'dune-tempest': 'playable'`), `tests/coming-soon-release.test.js` (playable list `['dune-tempest', 'frostbite-canyon']`), `tests/frostbite-race.test.js` (the `unlocked('dune-tempest') === false` line moves to a still-preview id, e.g. `monsoon-ruins`), `tests/ci-durations.json`
- Create: `tests/dune-tempest-race-browser.spec.js`

- [ ] **Step 1: Write the failing browser spec** (Frostbite spec pattern, `unlockedAccess: true`, desktop 1440×900 and phone 390×844 with touch): click `[data-upcoming-track="dune-tempest"]` → `#start-button` enabled, `#track-length` `13.7 KM SPRINT`; race with real key/touch input to FINISH (test hook may raise speed only through existing debug paths used by the Frostbite spec); results screen shows position; history/best saved under `dune-tempest@t1l1`; no page errors; capture frames at START, `split1`, a hairpin, `canyon-air-crossing` takeoff and landing, `stone-ring-corridor`, FINISH when `DUNE_CAPTURE_DIR` is set. Track switch Dune → Coast → Dune restores Coast's Start/Locked state and returns `renderer.info.memory.geometries` to the Coast baseline. Release-build check: card Coming Soon, START disabled.
- [ ] **Step 2: Run** `npm run build && PLAYWRIGHT_PORT=<port> npx playwright test tests/dune-tempest-race-browser.spec.js`. Expected: FAIL (card not enterable).
- [ ] **Step 3: Implement** the readiness flip and test-list updates; add the new spec's entries to `tests/ci-durations.json` (estimate, refreshed later with `node scripts/ci-shards.mjs refresh <run-id>`).
- [ ] **Step 4: Run** the spec, `node --test tests/coming-soon-release.test.js tests/upcoming-unlock-access.test.js tests/frostbite-race.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(dune-tempest): enter the race from make dev-unlocked only`.

### Task 10: Performance measurement

**Files:**
- Create: `scripts/course-race-bench.mjs`
- Modify: `TODO.md` (numbers)

- [ ] **Step 1:** Bench full Dune race vs Coast, 8 cars, 60 Hz, `node --expose-gc`: report `stepRace` mean/p95 µs, `sampleRoute` calls/frame, heap bytes/frame. Pass criteria per spec §12 (course overhead ≤ 0.3 ms p95; ≤ 48 samples/frame).
- [ ] **Step 2:** Real WebGL desktop + one phone, Low/Medium/High: frame time p50/p95 over a full race, draw calls, triangles, chunk build ms; compare with Frostbite at the same tier (≤ 10 % worse).
- [ ] **Step 3:** If a budget fails, apply the first fix in `.claude/rules/performance-work.md` order (e.g. `sampleRouteInto(out, …)` with a RED test asserting identical frames within 1e-12), re-measure, record before/after.
- [ ] **Step 4: Commit** `perf(course-runtime): measure Dune race step and render budget`.

### Task 11: Dune acceptance gate (merge-ready, not merged)

- [ ] **Step 1:** Integrate the latest epic (after Stormline, Volcanic, Monsoon have merged); resolve conflicts keeping both sides; re-run Task 1 (re-capture the fixture only for courses whose own merged changes legitimately moved their hashes, documented per id).
- [ ] **Step 2:** `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser` (desktop + mobile projects), `make verify`. Expected: all PASS; list any test that could not run.
- [ ] **Step 3:** Real WebGL screenshots desktop 1440×900 and phone 390×844: every split branch, flight takeoff/landing, a hazard hit, a recovery, FINISH and results; inspect wheel/road contact against the mesh; regression matrix (spec §14) with real clicks.
- [ ] **Step 4:** Push with `[full-regression]`; record the exact-HEAD `quality-gate` run id (Unit/Typecheck/Build, Cloud-save, all Browser and World Tour shards). Any skipped/failed/old-SHA run is not green.
- [ ] **Step 5:** Update `TODO.md` with evidence; ask the user for approval to merge into the epic. No merge without it.

## Phase 2 — Skyfall Archipelago (flight edges)

### Task 12: One road frame and smooth junctions for Skyfall (Q5, Q9 decided)

**Files:** `src/courses/skyfall-world.ts` and its road builder (render the road from the shared `sampleRoute`; drop the authored bank; `skyfallPhysicalDistance` becomes the identity); Skyfall graph data in `src/courses/skyfall-course-graph.ts` / `src/courses/skyfall-archipelago.ts` (Q9 tangent smoothing). Do **not** modify `src/course-route-frame.ts` or `src/course-graph.ts`.
**Test:** `tests/skyfall-road-contact.test.js`; extend `tests/course-junction-tangents.test.js` (from Task 1A) to Skyfall.

- [ ] **Step 0: Q9 for Skyfall.** Add Skyfall's `PLAYABLE_COURSE_GRAPH` to `tests/course-junction-tangents.test.js` (RED: up to 47° today), smooth the tangents per spec §17, update hard-coded Skyfall lengths / gap positions to the new measured values in the same commit (assertions not loosened), run until GREEN. Commit `fix(skyfall): tangent-continuous junctions (Q9)`.
- [ ] **Step 1: Failing test:** for every Skyfall edge at physical fractions 0, 0.1 … 1.0 and lateral {−10.2, 0, +10.2}: rendered road surface point vs physics pose point ≤ 0.05 m, normals within 1°. Expected today: FAIL (bank ≈ 1.2 m at the edge).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the chosen option; existing `tests/skyfall-*.test.js` and `tests/course-route-vertical-frame.test.js` keep passing (no weakening).
- [ ] **Step 4: Run** `npm test`. Expected: PASS (Task 1 unchanged).
- [ ] **Step 5: Commit.**

### Task 13: Skyfall race spec, registration and START → FINISH

**Files:**
- Create: `src/courses/skyfall-archipelago-race.ts`, `tests/skyfall-archipelago-race.test.js`
- Modify: `src/course-runtimes.ts`, `firestore.rules`

**Interfaces:** `SKYFALL_ARCHIPELAGO_ID`, `SKYFALL_ARCHIPELAGO_RACE: CourseRaceSpec`, `SKYFALL_ARCHIPELAGO_TRACK` (same shapes as Task 4).

- [ ] **Step 1: Failing tests:** track length `Math.floor(16,014.5…)`; `noRoad` for `a-air`, `b-air`, `c-air` in graph metres equal the authored gaps mapped through the Q5 sampler within 1e-6 m; gate band per Q6; `recoveryEdge` = `a-ground` / `b-ground` / `c-ground`; all 8 path combinations finish with scripted FLY pulses on chosen air edges; falling in each gap recovers onto the parallel ground edge at the split, never ahead; landing only on road (`canTraverseSkyfallRoad` semantics); checkpoints `a-merge`, `b-merge`, `c-merge`, FINISH in order; 30/60/120 Hz agreement; `rejections === 0`; obstacles from `SKYFALL_OBSTACLES` collide via the Task 6 hazard path; persistence `skyfall-archipelago@t1l1`, no Ghost; still `preview` readiness.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(skyfall-archipelago): gated CourseGraph race with flight gaps`.

### Task 14: Skyfall scenery, minimap, access and D2 browser spec

**Files:**
- Modify: `src/course-race-scene.ts` (registry: `createSkyfallWorld(scene, quality).setFocus(...)` with the eight cars' `{ edgeId, localS }`), `src/upcoming-tracks.ts` (`'skyfall-archipelago': 'playable'`), `tests/coming-soon-release.test.js`, `tests/ci-durations.json`
- Create: `tests/skyfall-archipelago-race-browser.spec.js`

- [ ] **Step 1: Failing tests:** scene host streams/disposes Skyfall chunks for 8 cars (unit); browser spec as Task 9 with `#track-length` `16.0 KM SPRINT`, captures on each air edge takeoff/landing and each ground alternative.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit + browser spec + shader-warmup + black-frame specs. Expected: PASS.
- [ ] **Step 5: Commit** `feat(skyfall-archipelago): enter the race from make dev-unlocked only`.

### Task 15: Skyfall acceptance gate

- [ ] Repeat Task 10 (bench and real WebGL budgets on Skyfall) and Task 11 (epic integration after Dune merged, full local gate, regression matrix including Dune, real screenshots, exact-HEAD `[full-regression]` CI, `TODO.md` evidence, ask before merging).
