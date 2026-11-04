# Skyfall Archipelago — playable course integration handoff

**Owner:** `feature/playable-skyfall-archipelago` only. **Baseline:** `347f17940498275fd94152c0ed6005dae59ba323`. This commit is a map-owned vertical slice, not an enabled race.

## Delivered map-owned interfaces

- `src/courses/skyfall-archipelago.ts`: 10 graph edges, 3 true ground/air splits with common merges, 4 ordered checkpoint nodes, distinct start/finish, 16,015 m sampled safe-ground route, arc-length indexed real 3D road frame with bank, explicit flight-only missing-road intervals, named deterministic visible obstacles and bounded authored weather cues. Road contact now rejects non-finite and out-of-edge arc-length values instead of clamping them to an artificial support surface.
- `src/courses/skyfall-world.ts`: call `createSkyfallWorld(existingScene, quality)` on a shared Three.js scene; it constructs 3D road ribbons, terraced floating islands, giant rings, hanging waterfalls, sky beams, solid roadside meshes and clouds. New 420 m disposable road/island/obstacle chunks are loaded by `.setFocus([{ edgeId, localS }, ...])` with neighboring chunks and a full 420 m of graph-join prefetch. Call `.setFocus(...)` with actual camera, player and rival positions from the *shared* engine each frame; `.update(timeSeconds, reducedMotion)` animates clouds/waterfalls deterministically (waterfall motion disabled on Low and Reduced Motion), and `.dispose()` tears down the complete scene. Only bounded landmarks and the small quality-tiered cloud ocean remain global. **No new WebGL renderer, canvas, game loop, collision engine or global UI.** The map's main/shortcut road rendering uses the same `sampleSkyfallRoad` and `hasSkyfallRoadContact` contract.
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
- Both source JPEGs were retrieved via the GitHub connector as base64 and visually inspected on 2026-11-04. Their upper sections show sky rings, islands, waterfalls and distinct air/ground paths, but the lower strips also include unrelated next-course artwork; exclude those strips from map matching. No real WebGL screenshot or fidelity comparison has been performed.
- Real device, reduced-motion screenshots, actual steering/landing contact and 3–5-minute empirical race durations remain unverified.
- 2026-11-04: prefetch regression authored in test-first commit `6d0b9535`; initial exact-HEAD Actions run `41793013459` was queued when the minimal 210 → 420 m graph-join prefetch fix was prepared. **The RED outcome was not observed**, and unit/typecheck/build/FULL Browser/World Tour remain subject to final-HEAD execution. The change affects Skyfall map-owned streaming only; it does not integrate shared race physics, AI or checkpoints.

- 2026-11-04: map-owned aerial landing strips are anchored to supported sampled road frames at offsets after each flight-only gap and released with their 420 m chunk. Regression tests were committed test-first (`d9ef292c`, import correction `6d4a61a2`); **RED outcome not observed while GitHub Actions was queued.** Landing guides are only visual indicators, not collision/checkpoint/AI integration. Exact-HEAD FULL CI and real WebGL visual acceptance remain required.

## 2026-11-04 continued branch-only map work

- Stream: one full 420 m prefetch window at split/merge joins (`6b8febf9`); luminous guide strips are placed only on solid landing pavement and released with streamed chunks (`74aa6c91`).
- Physical geometry: `a-air` controls adjusted in `c550ee77` to meet the `midway-one` landing heading (~69.4° before / ~5.3° analytical after); ground route length and 10-edge topology remain authored as before. `f904ab05` hangs the instance island terrace below the road rather than visually burying it.
- Visible but non-colliding checkpoints: `4164b960` draws four overhead 3D rings at the four existing checkpoint node positions on all quality tiers; signed checkpoint logic still belongs to the shared engine.
- UI blocker outside Skyfall map geometry: prior FULL CI `41793905332` had Unit SUCCESS and Browser shard-5 FAIL at en-US 320×640 clipped Start label; `3d0b0c22` resets `white-space:normal`. The run was later cancelled by subsequent pushes. Exact-HEAD Browser GREEN has not been observed.
- All additions have test-first authored commits, but test-only Action runs were cancelled before observed RED, so **do not claim complete TDD RED→GREEN verification**. CI final-HEAD FULL gate, in-game WebGL screenshots and cross-device performance/8-car driving remain open.
- Shared integration source HEAD `13e3686c` only had focused CI PASS (`41795278514`) with Browser and World Tour skipped. No merge, PR, deployment or Coming Soon activation was performed.
