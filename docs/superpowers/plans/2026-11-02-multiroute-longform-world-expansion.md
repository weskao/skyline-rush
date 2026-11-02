# Multi-route Long-form Tracks — Implementation Plan (Future Work)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the proposed five original 3–5-minute graph-based courses without regressions.
**Architecture:** Add an opt-in authored route graph that owns shared world frames, branch-aware game progress and open-terrain recovery. Preserve legacy centreline adapters and introduce weather as seeded, quality-tiered visual zones.
**Tech Stack:** Vue 3 + strict TypeScript, Three.js, existing JS simulation/render islands as justified, Node unit tests, Playwright, GitHub Actions.
**Spec:** `docs/superpowers/specs/2026-11-02-multiroute-longform-world-expansion-design.md`.

**User-approved topology:** five brand-new point-to-point single-finish tracks only, same race model as existing ten sprint tracks; distinct START and FINISH; NO circuit closure and NO lap counting. Current GitHub visual references: five two-view SVG storyboards under `docs/designs/new-tracks/concept-art/`, five route schematics, index `docs/designs/new-tracks/README.md`, fidelity checklist `docs/designs/new-tracks/visual-fidelity.md`, and `concept-manifest.json`. Original **PNG bytes** still exist only in the chat ZIP, but all **10 scene views have been converted to JPEG and actually committed** to `docs/designs/new-tracks/source-concept-jpeg/`; use them for visual direction alongside SVG storyboards. Stage 2 five additional maps have separately committed JPEGs, [spec](docs/superpowers/specs/2026-11-02-stage2-five-longform-tracks-design.md) and [TDD plan](docs/superpowers/plans/2026-11-02-stage2-five-longform-tracks.md). No implementation work, CI pass or merge implied by these planning documents.

## Input artwork and ground/flight screenshot acceptance

The branch now contains **10 standalone SVG images**—two distinct source-of-truth *camera composition* references for each of five open-ended races—indexed in `docs/designs/new-tracks/README.md`, `visual-fidelity.md`, and `concept-manifest.json`. They are separate views clipped from five original vector storyboard boards; **AI high-detail PNG files are not yet committed to this branch** and require the archive import process. For every vertical slice, capture a matching true WebGL ground view + aerial branch view on desktop and phone; retain separate START/FINISH and no laps, and record deviations against committed SVG and **actual committed JPEG** references. Treat image references as art-direction evidence, not physics or course graph.

## Visual implementation evidence gate — mandatory per map

Before any Stage 1 course art is declared complete, use [the shared JPEG-to-WebGL visual acceptance gate](../../designs/new-tracks/visual-acceptance-gate.md) and BOTH committed JPEG views under `docs/designs/new-tracks/source-concept-jpeg/<id>/`. Lock camera world pose, weather/seed, scene tier and viewport; review 1440×900 desktop and 390×844 phone ground+air true WebGL frames, six categories and deviation notes. Compare the original JPEG **art direction**, not exact 2D pixels; combine with geometry/finish/AI tests and performance. The original PNG isn't a prerequisite: the original **JPEG crops are already in GitHub**. Stage 2 adds five additional course designs with its own JPEG gallery and same acceptance gate.

## Global Constraints

- The five course layouts and times are initial design targets; performance, median durations and visual acceptance are not verified in this planning branch.
- Existing 10 sprint routes and circuit must preserve positioning, item economy, bests and game modes.
- All new UI/controller code typed TS; engine JS exceptions need profiling/rationale. No source module >400 lines; ratchet legacy ceilings down.
- Source of truth is one route sampling frame for road, physics, props, AI, camera, pickups and minimap.
- No bypassing mandatory checkpoints from free flight; no undiscoverable dead-end route; valid safe ground fallback per course. Each new course must have separate START and FINISH and complete once, with no lap counters.
- No new independent weather-quality settings; inherit saved Low/Medium/High and Reduced Motion. Generated in-game raster art has 3× originals.
- RED→GREEN→Refactor per task, `make verify`, real WebGL screenshots and exact-HEAD full CI; keep human phone QA as pending until performed.
- No PR or merge without separate authorization.

## Review Focus

- Physical adjacency of different branches: no ghost collision/ranking/drafting across disconnected edges.
- High-altitude free flight: cannot cross finish/skip gates, can safely recover from invalid terrain.
- Hairpin at variable timesteps: tangent and car pose remain finite; wheels contact curved terrain; camera readable.
- Weather transition and low quality: no shader stalls, invisible walls, or unreadable decision forks.
- Long race restart/ghost/versioning: no stale minimap or legacy save corruption.

## Task 1 — Graph schema and validation (M1)

**Files:** Create `src/course-graph.ts`, `tests/course-graph.test.ts` (adapt Node runner's existing test convention); leave legacy `src/race-tracks.ts` semantics.
**Interfaces:** `validateCourseGraph(graph: CourseGraph): CourseGraph`, nodes/edges/checkpoint set, versioned ID.
- [ ] RED tests: reachable split/merge/finish, reject invalid cycle/dead end, missing checkpoint, edge mismatch, same-node/same-world-position START and FINISH, and accidental closed-course lap semantics.
- [ ] Implement types, deterministic validation and test GREEN.
- [ ] Refactor/minimize, verify typecheck, unit suite, commit on future implementation branch.

## Task 2 — Arc-length route sampling and 3D pose (M1)

**Files:** Create `src/course-route-frame.ts`, `tests/course-route-frame.test.ts`; integrate additive dispatcher in `src/track-paths.ts`.
**Interfaces:** `sampleRoute(graph: CourseGraph, edgeId: string, localDistance: number): RouteFrame`; legacy tracks still call original `trackFrame`.
- [ ] RED tests: all graph joins, U-turns, near-vertical tangent stability, arc-length monotonicity, constant travel speed, finite orthonormal frames.
- [ ] Implement shared frame and RED→GREEN, avoid copy of `skyFrame` calculation where reusable.
- [ ] Verify actual road mesh and wheel alignment screenshots before calling complete.

## Task 3 — Route-aware gameplay progress and checkpoint gates (M1/M2)

**Files:** Create `src/course-progress.ts`, `tests/course-progress.test.ts`; adapt `src/race-objectives.ts`, `src/race-standings.ts`, `src/game.js` via a small owned module.
**Interfaces:** `advanceRouteProgress(state, crossing): RouteProgress`; route-specific `edgeId/localS` vs monotonic event progress.
- [ ] RED: both forks legally finish, shortcut never grants repeated progress, shortcut doesn't bypass required gate, adjacent overpass cannot satisfy gate, stable rank on joins and resume.
- [ ] Implement ordered checkpoint envelope and split-aware standings; observe GREEN and legacy parity.
- [ ] Verify deterministic 8-car AI with separate branches and serialize graph/layout version for saves/ghosts.

## Task 4 — Opt-in terrain and flight freedom (M2)

**Files:** Create `src/course-terrain.ts`, `src/course-recovery.ts`, `tests/course-terrain.test.ts`; adapt `src/car-collisions.js`, `src/game.js`.
**Interfaces:** `sampleTerrain(worldX, worldZ)`, `classifyDriveable(worldPose)`, `recoverToCheckpoint(state)`.
- [ ] RED: +/-10.2 only legacy, open zone steering and flight beyond, recover after falling, genuine cliff barrier and landing surface on correct edge.
- [ ] Implement per-course soft bounds; terrain/obstacle physical truth shared between AI and player, not invisible hard clamp.
- [ ] Verify 30/60/120 dt and real WebGL car/camera contact at terrain transitions.

## Task 5 — Dune Tempest vertical slice (M3)

**Files:** Create `src/courses/dune-tempest.ts`, `src/course-scenery.ts`, tests for authored layout, small route-select and minimap integration.
- [ ] RED: minimum two hard hairpins, 1 real ground/air split and one accessible offroad corridor; route continuity; weather seed replay; median target test recorded as pending empirical gate.
- [ ] Build 13.5 km authored path with one meaningful fork, instanced dunes and readable entry gates. GREEN all structural assertions.
- [ ] Playwright desktop/phone snapshot, screenshot true WebGL; verify ai driving and finish through both route options.

## Task 6 — Localized weather and particle budget (M4)

**Files:** Create `src/course-weather.ts`, `src/course-particles.ts`, `tests/course-weather.test.ts`; integrate existing `src/race-visuals.ts` and `src/vfx-settings.ts`.
- [ ] RED: seeded event reproducibility, transitions, reduced-motion override, Low budget bounded, graphical quality does not alter race outcome.
- [ ] Implement shared zone pipeline, material reactions, emission budgets and cleanup; test GREEN and switching presets mid-race.
- [ ] Record frame-time/draw-call/texture screenshots Low/Medium/High and long race 5-min performance.

## Task 7 — Remaining four course art/layout data (M5/M6)

**Files:** Create one small file under `src/courses/` per track, tests per layout and themed scene; reuse graph/weather/pickup/AI APIs.
- [ ] RED per map: every optional branch can reach the distinct one-way FINISH, ≥3 safe forks, ≥2 hairpins, no lap completion, a grounded finish and scenic reveal, balanced flight+ground options.
- [ ] Implement Monsoon, Skyfall, Volcanic and Stormline independently and GREEN tests/map, maintaining unique material/biome silhouette.
- [ ] Before implementation, read `docs/designs/new-tracks/visual-fidelity.md` and both SVG references for each course; retain intended biome, camera composition and weather without tracing the illustrative path as exact 3D geometry.
- [ ] User gameplay sessions: record ≥20 finish times per track/difficulty and compare median to 3–5-minute goal; revise if out of range.

## Task 8 — UI, metadata, persistence, release gate (M7)

**Files:** `src/race-select-ui.ts`, `src/route-map.ts`, `src/i18n.ts`/locales, `src/record-layout.ts` and related cloud rules/tests.
- [ ] RED: branch overlays, green START + red FINISH, no lap counter, discovered shortcut policy, no central HUD obstruction, all device sizes, cloud/ghost version isolation.
- [ ] Implement readable future route layers and weather signposts; GREEN browser and storage migration tests.
- [ ] Run `make verify`, all relevant `npm run test:browser`/World Tour suites, real WebGL evidence, `[full-regression]` on exact HEAD, and manual phone signoff. Only then seek approval to merge into `develop`.
