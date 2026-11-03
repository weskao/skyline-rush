# Stormline Megacity playable-track handoff — 2026-11-03

**Working branch:** `feature/playable-stormline-megacity`  
**Integration owner:** `feature/epic-multiroute-longform-tracks`  
**Initial base:** `347f17940498275fd94152c0ed6005dae59ba323`  
**Status:** **Map-specific blockout and standalone renderer chunks only. NOT PLAYABLE / NOT MERGE-READY.**

## Source of truth and art intent

- Original [ground JPEG](../../designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-01.jpg) and [aerial JPEG](../../designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-02.jpg), plus [route SVG](../../designs/new-tracks/route-schematics/stormline-megacity.svg) inspected.
- Ground shot: midnight blue-violet skyline, saturated cyan/magenta roadside lights, wet reflections, wide roadway, readable forward horizon.
- Aerial shot: true elevated interchange/flight branch over an independently traversable ground road; visible merge and landing.
- Do **not** use JPEG as textured scenery or call concept images real WebGL evidence.

## Branch-local deliverables

- `src/courses/stormline-megacity.ts`: versioned authored graph, 12 safe-route edges, 3 optional branches (upper viaduct / tunnel / rooftop flight), 2 reverse-direction hairpins, 6 ordered node gates including FINISH, start != finish, layered road modes and authored traffic/construction/water annotations. Mainline first-pass polyline length ~14.24 km (planar calibrated); **the requested 3–5 min median is not yet empirically balanced**.
- `src/courses/stormline-scenery.ts`: opt-in streaming 3D city/road/guardrail/support-pillars/reflective-water/billboard builder, with `createStormlineChunk(edgeId,startS,endS,sample,quality)`; its `sample` callback **must use the shared CourseGraph sampleRoute frame** used by simulation and collision. The caller adds the returned `group` to the existing World Renderer, calls `update(timeSeconds,reducedMotion)`, and calls `dispose()` on eviction. No canvas, camera, renderer, parallel loop or duplicated input handler.
- `tests/stormline-megacity.test.js`: local graph/fork/hairpin/obstacle/weather tests.
- `tests/stormline-scenery.test.js`: renderer chunk shape, flight-gap truth, geometry cleanup; requires installed `three` in the repo to run.

## Binding integration contract — GPT 6 shared systems

Do not register this as playable until all these shared capabilities exist and are verified:

1. A typed `CourseGraph` schema/arc-length sampler that translates these authored node/edge control points into **the same position/right/up/forward frame for car contact, roadway mesh, AI, collisions, camera, minimap and recoveries**. The exported `edgeLength` is currently a polyline estimate, not a final smooth curve LUT. At junctions, enforce geometric C1 continuity and actual wheel clearance. Do not build another track-only physics sampler.
2. Graph-mode `edgeId + localS + lateral + altitude` simulation, route-aware speed/standings/ghost, deterministic 8-car AI split decisions, smooth edge transitions, safely rejoining, and a ground-only selection. The existing linear `trackPoint(trackId,distance)` cannot represent this hairpin graph; do not spoof by converting to a sine centreline.
3. Sweep collision for car/obstacles/traffic with **world height and edge layer**. Two cars over the same X/Z on different bridge levels must not collide or draft. Preserve collisions when two chosen branches physically converge.
4. Ordered directional checkpoint gates with height bands (authored per node). Flying directly past the finish or under/over a gate must not grant finish; recovery restores the last valid checkpoint and legal edge. Gate events must support both branches and restart/resume.
5. Existing traffic simulation owns moving cars and slow vehicles; the authored traffic objects are spawn/collision metadata, **not static extra car meshes**. Wet puddles are non-solid, but can receive opt-in handling/traction using the shared physics. Solid construction barriers appear in every quality tier.
6. Reuse quality/reduced-motion and weather VFX hooks in the world renderer. These budgets are *data*, not a replacement weather/lighting engine. Preserve Low visibility and avoid flashing-only route cues. Stream chunks by edge/proximity and evict all GPU resources.
7. Only after the shared CourseGraph and registry changes are integrated by GPT 6, connect game mode, race selection, translations and start/finish state. The current homepage must remain `COMING SOON` until playable and QA requirements pass.

## Tests and acceptance still required

- Local mirror TDD: `node --experimental-strip-types --test tests/stormline-megacity.test.js` showed **4 RED → 4 GREEN** against the new authored-data tests. This does **not** constitute a full repo run; source-mirror test evidence is separate from CI.
- **PENDING:** actual full repo `npm test`, `npm run typecheck`, `npm run build`, Playwright desktop/mobile, `make verify`, 30/60/120fps road stability and traffic/AI collision, 20+ race timing samples.
- **PENDING:** exact-HEAD FULL `quality-gate` (not a skipped feature-focused gate), ground/aerial/hairpin/elevated/traffic/finish WebGL captures, Low/Medium/High, Reduced Motion, desktop 1440x900 and phone 390x844, performance numbers, GPU memory and human visual acceptance.
- Record six visual gate judgments from `docs/designs/new-tracks/visual-acceptance-gate.md` only with real screenshots; **no invented visual pass, timings, or screenshots**.
- No merge, PR, deploy or edits to integration, develop, main or sibling courses from this branch.
