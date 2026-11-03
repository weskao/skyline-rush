# Skyfall Archipelago — playable course integration handoff

**Owner:** `feature/playable-skyfall-archipelago` only. **Baseline:** `347f17940498275fd94152c0ed6005dae59ba323`. This commit is a map-owned vertical slice, not an enabled race.

## Delivered map-owned interfaces

- `src/courses/skyfall-archipelago.ts`: 10 graph edges, 3 true ground/air splits with common merges, 4 ordered checkpoint nodes, distinct start/finish, 16,015 m sampled safe-ground route, arc-length indexed real 3D road frame with bank, explicit flight-only missing-road intervals, named deterministic visible obstacles and bounded authored weather cues. Road contact now rejects non-finite and out-of-edge arc-length values instead of clamping them to an artificial support surface.
- `src/courses/skyfall-world.ts`: call `createSkyfallWorld(existingScene, quality)` on a shared Three.js scene; it constructs 3D road ribbons, terraced floating islands, giant rings, hanging waterfalls, sky beams, solid roadside meshes and clouds. New 420 m disposable road/island/obstacle chunks are loaded by `.setFocus([{ edgeId, localS }, ...])` with neighboring chunks and graph joins. Call `.setFocus(...)` with actual camera, player and rival positions from the *shared* engine each frame; `.update(timeSeconds, reducedMotion)` animates clouds/waterfalls deterministically (waterfall motion disabled on Low and Reduced Motion), and `.dispose()` tears down the complete scene. Only bounded landmarks and the small quality-tiered cloud ocean remain global. **No new WebGL renderer, canvas, game loop, collision engine or global UI.** The map's main/shortcut road rendering uses the same `sampleSkyfallRoad` and `hasSkyfallRoadContact` contract.
- `tests/skyfall-playable-course.test.js`: graph, ground-only reachability, shortcut adjacency, 3D orthonormal frame, hairpins, variable-Hz samples, obstacle/wind deterministic contracts.
- `tests/skyfall-playable-world.test.js`: real Three geometry, streaming focus for all ten edges and eight simultaneous vehicles, distant GPU chunk teardown, deterministic waterfall/Reduced Motion, and global resource disposal assertions (not a browser capture).

## Required shared engine integration — NOT done on this branch

1. Define canonical shared `CourseGraph` / `sampleRoute(edgeId, localS)` adapter; consume these map-owned nodes/edges/frames. Graph must own edge transitions, lane/contact, bridge vs flight gap, 30/60/120Hz car pose and actual car wheel-ground contacts. **Legacy maps unchanged.**
2. In the existing race factory and `game.js`, opt in Skyfall only AFTER the graph-aware shared progress/AI module is ready. Gate START → a-merge → b-merge → c-merge → FINISH by signed 3D checkpoint crossing; off-road/air cannot skip. Share existing `hitProp`/`knock` and Recovery. Obstacles here are descriptors and visible geometry, not active game collision yet. A collapsing platform must stay non-collapsing until shared simulation synchronizes its contact lifecycle.
3. Add eight-car graph-aware AI at forks, joining and separation by edge plus altitude; independent ghost/progression version. Tune 3–5-minute actual drive time with at least 20 recorded completed sessions.
4. Register only after full collision/finish/AI acceptance. Remove Coming Soon restriction only under the integration owner's explicit rollout decision. Preserve homepage scroll/swipe and the separately owned `src/upcoming-scenes/skyfall-archipelago.ts`.
5. Connect the map-owned streaming `.setFocus` contract to actual runtime camera/player/eight-rival poses and evaluate memory, draw calls, p50/p95 on real hardware. The current map-owned implementation creates/disposes 420 m chunks, but is **not yet bound to the shared racing world**. Shared weather should consume SKYFALL_WEATHER as visual cues; no untested random physics gusts.

## Evidence status (truthful gates)

- Node `--experimental-strip-types --test tests/skyfall-playable-course.test.js`: local isolated RED 7 failing → GREEN 7 passing, at the authored file revision. This is **not** the full repository unit suite.
- 2026-11-04: contact boundary regression test authored first in `dbcf8f35`, production guard in `1f7702a8`; extracted function reproduced the expected RED for negative progress and 8 isolated boundary values produced GREEN after the guard. **This is not an execution of the full repository test suite.**
- 2026-11-04: streaming/fall regression specifications authored in `822c9076`, implementation in `c5b5836`. GitHub Actions for the resulting HEAD was **pending at handoff edit time**, so no new full-suite GREEN or WebGL pass is claimed.
- `npm test`, typecheck, production build, Playwright, `make verify`, genuine WebGL screenshots (1440×900 and 390×844), p50/p95/draw calls, exact-HEAD full CI: require full repo/CI/browser and are **not claimed as passed** here.
- JPEG references and route SVG exist in baseline, but source-JPEG binary visual pixels were not retrievable through this GitHub connector. Do not claim exact JPEG art matching or real screenshots.
- Real device, reduced-motion screenshots, actual steering/landing contact and 3–5-minute empirical race durations remain unverified.