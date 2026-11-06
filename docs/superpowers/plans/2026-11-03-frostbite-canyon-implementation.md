# Frostbite Canyon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a near-reference, original Frostbite Canyon cover + animated real Three.js homepage scene + physically playable 13.8 km point-to-point map with graph-safe branches.
**Architecture:** Add one authored Frostbite `CourseGraph`, road/terrain kit and scene factory on top of the existing shared graph and single WebGL renderer. Preserve existing ten sprint maps and Stage 1 proposals, gate new track registration until physics/AI/finish/replay/CI checks succeed.
**Tech Stack:** Vue 3, TypeScript strict, Three.js 0.180, Vite, Node 22.12+, node:test, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-03-frostbite-canyon-visual-and-gameplay-design.md`.

## Global constraints

- Repository `weskao/skyline-rush`; doc baseline branch `feature/epic-multiroute-longform-tracks`. When executing, work on isolated `feature/playable-frostbite-canyon` (reuse it if present, create from latest integration branch if absent). Preserve existing work, no reset/force push/PR/deploy/merge.
- Source references: `docs/designs/new-tracks/stage-2/source-concept-jpeg/frostbite-canyon/concept-view-01.jpg` and `concept-view-02.jpg` (same folder), plus `docs/designs/new-tracks/stage-2/route-schematics/frostbite-canyon.svg`. Inspect **image pixels**, not only descriptions.
- Current baseline helpers exist in `src/course-graph.ts`, `src/course-route-frame.ts` and `src/course-progress.ts`; they are NOT yet race runtime/physics/AI integrations. Reuse and extend shared logic by verified tests rather than create a second physics/rank engine.
- Stage 1 five home cards only remain live; Stage 2 artwork/showcase is gated until approved. All existing games, garages, NITRO/FLY, touch and save history remain functional.
- Target 13.8 km / 3:20–4:40 is an unmeasured design hypothesis. Point-to-point START ≠ FINISH, 0 laps, ≥2 hairpins, ≥3 real decisions, all-ground safe route and at least one elevated crossing.
- Follow `CLAUDE.md`, `AGENTS.md`, `docs/regression-first-workflow.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/rendering-performance.md`, and applicable `.claude/rules/`. TDD **RED → GREEN → REFACTOR** and per-task small commits.
- Real WebGL screenshots, actual device/viewport QA, local verify and exact-HEAD GitHub CI are **separate gates**. Never fill evidence boxes based on design-only sources.

## Review focus: failure modes to test

1. Ice bridge and lower canyon overlap in XY yet collisions, checkpoint credit and AI proximity apply only to a valid edge/altitude.
2. A player using flight may not skip required gates by jumping directly to FINISH; an aborted jump gets a deterministic safe recovery.
3. Road under the preview car and during live play matches the visual ice mesh, with no floating wheels or buried vehicle at hairpins and bridge joints.
4. Tiered snow gusts and glow do not hide the next bend or landing; Reduced Motion never hides necessary guidance.
5. Stage 2 cover/preview does not silently enable `RACE_TRACKS`, add a sixth Stage 1 card, unlock history or disturb the ten existing sprint tracks.

## Planned file ownership

| Primary file | Responsibility |
| --- | --- |
| `src/courses/frostbite-canyon.ts` (create) | Immutable node/edge graph, checkpoints, groundRoute, branded landmarks and deterministic seed metadata |
| `src/upcoming-scenes/frostbite-canyon.ts` (create) | Bounded authored 3D hero slice, icy terrain/arch/bridge/crystals, seeded aurora/snow, `update`/`dispose` |
| `src/upcoming-showcase.ts`, `src/world.js` (modify only if needed) | Reuse one renderer and existing car/camera/quality lifecycle for Stage 2 opt-in preview |
| `src/race-factory.ts`, `src/game.js`, `src/route-map.ts` (only as shared foundation permits) | Gated graph-race creation, collision/progress/minimap; do not implement fake course-specific physics hacks |
| `src/upcoming-tracks.ts` and card/selector Vue files (only after approval) | Stage 2 preview visibility and bilingual Coming Soon; leave Stage 1 existing contract intact |
| `public/track-teasers/` or current asset catalog location (confirm before write) | Native 3× cover source + optimized displayed asset following raster-artwork rules |
| `tests/frostbite-canyon-course.test.js` (create) | Graph length, safe path, hairpins, forks, checkpoints and off-graph rejection |
| `tests/frostbite-canyon-scene.test.js` (create) | Landmark, actual road/bridge mesh, scene lifecycle, quality/reduced-motion |
| `tests/frostbite-canyon-browser.spec.js` (create) | Live 3D, home cover, actual race route/finish when enabled, desktop/mobile visual gates |
| `artifacts/new-tracks/visual-evidence/frostbite-canyon/` (output or CI artifact) | Deterministic real-WebGL screenshots/review; never treat source art as proof |

Names above are implementation targets; check existing project conventions and avoid duplicating an equivalent shared module. Do not add big abstractions only for this one map.

---

### Task 1 — Branch and visual-source preflight

**Files:** no code edits. Review `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, Stage 2 specs, active CourseGraph contract and both JPEGs/SVG.

- [ ] Inspect latest integration and feature HEAD; do not reset or overwrite preexisting work. Record exact SHA(s) in `TODO.md` / implementation log.
- [ ] Open both JPEGs as **images**, record P01 road/arch/crystals/car/aurora and P02 bridge/chasm/approach/rails; verify paths, dimensions, image provenance and license.
- [ ] Inspect the current `src/course-graph.ts`, `src/course-progress.ts`, `src/course-route-frame.ts`, `src/upcoming-showcase.ts`, `src/race-factory.ts` and scene factories. Draw call/dataflow boundaries before editing.
- [ ] Confirm shared 3D runtime gate availability. If absent, implement/test independent graph/showroom first and explicitly leave gameplay/unlock registration disabled.

**Checkpoint:** a short table of actual paths/current HEAD/shared APIs; no claimed code acceptance.

### Task 2 — Authored 13.8 km physical route graph (RED → GREEN)

**Files:** create `src/courses/frostbite-canyon.ts`, `tests/frostbite-canyon-course.test.js`; reuse `src/course-graph.ts` and `src/course-route-frame.ts`.

**Interfaces:** export `frostbiteCanyonGraph: CourseGraph`, optionally `frostbiteLandmarks` and deterministic `frostbiteSeed`. Consume `validateCourseGraph(graph)`, `routeLength(graph, edgeId)`, `sampleRoute(graph, edgeId, localS)`.

- [ ] **RED:** test stable ID/version, distinct start/finish coordinates, no laps, all-ground path, mandatory ordered checkpoints on every fork, ≥3 split nodes with genuine divergent XY/Y edges, ≥2 significant horizontal direction reversals and at least one physically elevated bridge route. Assert groundRoute summed arc length lies within 2% of 13,800 m, then tune exact length.
- [ ] **Run RED:** `node --test tests/frostbite-canyon-course.test.js`; capture expected assertion failure, not just missing import/parse error.
- [ ] **GREEN:** author route points in metres with broad basin, canyon walls, two hairpins, F1/F2/F3 forks, safe ground path, approved bridge crossing/landing and non-identical endpoint coordinates. Route SVG is **directional** and must not be traced literally as physics coordinates.
- [ ] **Run GREEN:** `node --test tests/frostbite-canyon-course.test.js` and `npm test`; inspect actual outputs; no marked PASS if runner blocks.
- [ ] **Refactor and commit:** share graph helpers only if needed by multiple maps; keep map-authored data isolated and straightforward.

### Task 3 — Road, glacier terrain, bridge and physical contact

**Files:** extend the smallest necessary shared graph-road / graph-terrain adapter; new Frostbite-specific scene data in `src/courses/frostbite-canyon.ts` or small dedicated terrain kit. Test in `tests/frostbite-canyon-course.test.js` and browser suite.

- [ ] **RED:** visual mesh height and physical contact agree at straight, packed snow, first hairpin, bridge deck, split, merge and aerial landing; no invisible sidewall on broad terrain, visible rails on actual chasm edges; 30/60/120 Hz finite car pose.
- [ ] **Run RED:** focused test; record assertions showing geometry contact/collision unavailable or incorrect on baseline.
- [ ] **GREEN:** drive road and scenery geometry from the same `sampleRoute` basis; add high/low layer collision identity and soft off-road bounds; physically plausible ramp, bridge and landing surfaces. Only add minimum shared runtime integration if already needed for other maps.
- [ ] **Run GREEN:** focused tests plus WebGL road drive-through; keep prior sprint physics behavior unchanged.
- [ ] **Refactor and commit** with performance counters and no independent renderer.

### Task 4 — Physical forks, checkpoints, 8-car AI and recovery

**Files:** shared graph runtime adapters (if available/required), `src/course-progress.ts` consumer, race/result/AI adapters, tests for Frostbite branch correctness.

- [ ] **RED:** all three splits merge without teleports; both ground and flight alternatives reach every ordered checkpoint; illegal cross-edge/wrong-height finish stays rejected; failed flight recovers at last safe gate; AI uses valid edges.
- [ ] **GREEN:** integrate authoritative per-vehicle edge ID/localS/world pose into collision/progress, AI navigation, ranking and minimap. Enforce physically valid gate crossing and topology/version-tagged Ghost data. Ensure 8-car grid remains fair.
- [ ] Verify safe all-ground finish even when NITRO/FLY never used and when flight route fails. Run deterministic comparison for 30/60/120 equivalent physics steps.
- [ ] **Refactor and commit**, no production track unlock before full race verification.

### Task 5 — Actual near-reference ice/aurora scene and weather

**Files:** create `src/upcoming-scenes/frostbite-canyon.ts`; test `tests/frostbite-canyon-scene.test.js`. Follow established Stage 1 scene environment factory signature `(scene) => { group, update(timeSeconds, quality, reducedMotion), dispose() }`.

- [ ] **RED:** scene exposes identifiable arch, cyan crystals, road bend, glacier walls, aurora, high bridge and glacial chasm; time-separated update changes ambience; reduced-motion update stabilizes nonessential motion; all owned resources dispose.
- [ ] **GREEN:** implement original layered geometry with quality-tiered instancing/chunking and sensible icy material/lighting. The camera sees ≥3 P01 visual anchors and ≥3 P02 visual anchors with actual parallax.
- [ ] Add deterministic powder/snow gusts and cold fog; preserve readable preview bend and bridge landing at Low/Medium/High. No photo plane or static-JPEG replacement for live 3D.
- [ ] **Run:** `node --test tests/frostbite-canyon-scene.test.js`; compare actual WebGL screen captures with source JPEGs and record deviations.
- [ ] **Refactor and commit**, checking context cleanup and no memory leak on scene switching.

### Task 6 — Cover export, card integration and gated home preview

**Files:** optimized cover asset at verified existing teaser path, one scene registration in existing `src/upcoming-showcase.ts` / `src/world.js` where appropriate, UI selectors only after explicit Stage 2 visibility decision. Browser tests.

- [ ] **RED:** preview uses existing single `#world` WebGL canvas; actual player + three rival cars, 50° FOV, correct snow-road contact, time-separated scene animation; a cover is not used as a live-3D disguise.
- [ ] **GREEN:** connect Frostbite module behind Stage 2 gate, preserve Stage 1 five selections and all classic previews; correct Coming Soon state, keyboard/touch/i18n. Keep explicit Start disabled until gameplay release gate.
- [ ] Create 2D cover from the authored environment (or distinctly labeled original illustration) with car low-left, left cyan crystal spires, right ice arch, purple/cyan aurora and curved road. Confirm real UI display size, output native 3× original pixels, optimized runtime format and fallback.
- [ ] **Run:** relevant unit + Playwright browser specs; inspect 1440×900 desktop / 390×844 portrait / 844×390 landscape / 320×740 compact layouts. No title/text baked into the art.
- [ ] **Refactor and commit** after visual proof and lifecycle checks. No Stage 2 registry visibility by default without approval.

### Task 7 — Full playable integration, finish and old-track regressions

**Files:** `src/race-factory.ts`, `src/game.js`, `src/race-tracks.ts`/catalog, `src/route-map.ts`, result/AI/ghost integration only after shared graph runtime passes; browser tests.

- [ ] **RED:** current ten sprints/Harbor Circuit work; 5 Stage 1 cards remain unplayable. Frostbite race can be started **only** via explicitly enabled feature gate; one FINISH, no lap; 8-car AI and UI shows correct route.
- [ ] **GREEN:** integrate the tested optional graph course into approved modes, locale strings, persistent topology-keyed results, recoverable aerial branch, secret-route discovery and finish event. Do not alter old save keys.
- [ ] Check gameplay from START through FINISH on at least one ground and one aerial path, and fail/recover scenario. Validate no incorrect checkpoint at level crossings, UI overlay/road occlusion, touch steering, NITRO/FLY and camera.
- [ ] Run named focused tests, full `npm test` and `npm run build`. Code not proven by tests stays gated.
- [ ] **Refactor and commit**, with detailed TODO evidence.

### Task 8 — Real WebGL acceptance, profiling and CI

**Files:** output evidence and `artifacts/new-tracks/visual-evidence/frostbite-canyon/frostbite-canyon-review.md` (or stored CI artifact URL), TODO and test results.

- [ ] Capture reproducible real-game P01 and P02 at 1440×900 and 390×844 Medium. Include track/edge ID, localS, world pose, camera 50° FOV/offset, seed, weather, tier, viewport, game commit and screenshots. Test alternate layouts/touch.
- [ ] Compare six categories per `docs/designs/new-tracks/visual-acceptance-gate.md`: main landmark, road/terrain, car composition, ice/aurora/weather, split/landing, no clipping or ghost walls. For each record **PASS / FAIL / APPROVED DEVIATION** with human-review notes.
- [ ] Obtain 20+ real finish trials at intended modes/difficulties before claiming 3–5 min completion target, and measure draw calls, triangles, p50/p95, peak memory/streaming over long route.
- [ ] Run `npm test`, `npm run build`, `make verify` and any relevant cloud tests; check exact HEAD full GitHub Actions quality-gate, NOT only focused/skipped jobs. Repair failures on feature branch, re-validate after any HEAD change.
- [ ] Present signed-off evidence, unresolved manual device checks and CI URLs. **Do not merge into develop/main or deploy without a separate explicit request.**

## Milestone order / stopping conditions

- **M0 Design:** this document and source images available; no gameplay claim.
- **M1 Terrain graybox:** graph valid, roads/collision align, one full safe drivable path + 3 forks.
- **M2 Hero parity:** actual 3D View 01/02, authored cover and moving Aurora; no 2D substitute.
- **M3 Playability:** checkpoints, AI, airborne landing, HUD, finish, save and recovery proved; only then lift track gameplay gate.
- **M4 Release candidate:** full exact-HEAD CI, real WebGL visual signoff and measured race timing all evidenced.

Do not shortcut shared runtime deficits by altering the five independent Stage 1 feature branches or silently exposing a broken Stage 2 race. Every phase must be independently reviewable.
