# Skyfall Archipelago — playable course integration handoff

**Owner:** `feature/playable-skyfall-archipelago` only. **Baseline:** `347f17940498275fd94152c0ed6005dae59ba323`. This commit is a map-owned vertical slice, not an enabled race.

## Delivered map-owned interfaces

- `src/courses/skyfall-archipelago.ts`: 10 graph edges, 3 true ground/air splits with common merges, 4 ordered checkpoint nodes, distinct start/finish, 16,015 m sampled safe-ground route, arc-length indexed real 3D road frame with bank, explicit flight-only missing-road intervals, named deterministic visible obstacles and bounded authored weather cues.
- `src/courses/skyfall-world.ts`: call `createSkyfallWorld(existingScene, quality)` on a shared Three.js scene; it constructs 3D road ribbons, terraced floating islands, giant rings, hanging waterfalls, sky beams, solid roadside meshes and clouds. Call `.update(timeSeconds, reducedMotion)` from the existing renderer loop, `.dispose()` on scene teardown. **No new WebGL renderer, canvas, game loop, collision engine or global UI.** The map's main/shortcut road rendering uses the same `sampleSkyfallRoad` and `hasSkyfallRoadContact` contract.
- `tests/skyfall-playable-course.test.js`: graph, ground-only reachability, shortcut adjacency, 3D orthonormal frame, hairpins, variable-Hz samples, obstacle/wind deterministic contracts.
- `tests/skyfall-playable-world.test.js`: real Three geometry and GPU resource teardown assertions (not a browser capture).

## Required shared engine integration — NOT done on this branch

1. Define canonical shared `CourseGraph` / `sampleRoute(edgeId, localS)` adapter; consume these map-owned nodes/edges/frames. Graph must own edge transitions, lane/contact, bridge vs flight gap, 30/60/120Hz car pose and actual car wheel-ground contacts. **Legacy maps unchanged.**
2. In the existing race factory and `game.js`, opt in Skyfall only AFTER the graph-aware shared progress/AI module is ready. Gate START → a-merge → b-merge → c-merge → FINISH by signed 3D checkpoint crossing; off-road/air cannot skip. Share existing `hitProp`/`knock` and Recovery. Obstacles here are descriptors and visible geometry, not active game collision yet. A collapsing platform must stay non-collapsing until shared simulation synchronizes its contact lifecycle.
3. Add eight-car graph-aware AI at forks, joining and separation by edge plus altitude; independent ghost/progression version. Tune 3–5-minute actual drive time with at least 20 recorded completed sessions.
4. Register only after full collision/finish/AI acceptance. Remove Coming Soon restriction only under the integration owner's explicit rollout decision. Preserve homepage scroll/swipe and the separately owned `src/upcoming-scenes/skyfall-archipelago.ts`.
5. Replace eager whole-course meshes with shared streamed per-edge chunks for production; no duplicated materials/particle loops. Shared weather system should consume SKYFALL_WEATHER as visual cues; no untested random physics gusts.

## Evidence status (truthful gates)

- Node `--experimental-strip-types --test tests/skyfall-playable-course.test.js`: local isolated RED 7 failing → GREEN 7 passing, at the authored file revision. This is **not** the full repository unit suite.
- `npm test`, typecheck, production build, Playwright, `make verify`, genuine WebGL screenshots (1440×900 and 390×844), p50/p95/draw calls, exact-HEAD full CI: require full repo/CI/browser and are **not claimed as passed** here.
- JPEG references and route SVG exist in baseline, but source-JPEG binary visual pixels were not retrievable through this GitHub connector. Do not claim exact JPEG art matching or real screenshots.
- Real device, reduced-motion screenshots, actual steering/landing contact and 3–5-minute empirical race durations remain unverified.