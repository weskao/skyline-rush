# Skyline Rush — Six Parallel GPT Chats: **Real Animated 3D Home Showcases** (2026-11-03)

> **Important correction:** The original 2026-11-03 briefs requested static native JPEG homepage heroes. This **supersedes those instructions**. The expected result is **real-time Three.js scenes with vehicles, weather, scenic motion, road/air branches and camera**, matching existing Skyline Rush homepage behavior. JPEGs remain source references, thumbnails or an explicit WebGL failure fallback only. A static image, flat photo plane or full-screen overlay **FAILS acceptance**.

**Repository:** `weskao/skyline-rush` · **Stage:** first five proposed point-to-point maps ONLY. Stage 2 five do not appear on the homepage.
**Binding spec:** [Live 3D showroom spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) · [UX / localization spec](../specs/2026-11-03-stage1-coming-soon-home-preview-design.md) · [implementation plan](../plans/2026-11-03-six-chat-home-preview-integration.md) · [visual acceptance gate](../../designs/new-tracks/visual-acceptance-gate.md).

**Separate chat usage:** The user opens **six different ChatGPT conversations**, one block below per conversation. Saving this file does not start chats or background jobs. GPT 1–5 own each 3D environment only; GPT 6 owns the existing renderer/camera/vehicle/UI integration. **No PR, no force push, no deployment, no writes to `main` or `develop`.**

## File ownership — no overlap

| Chat | Existing branch | Permitted new/modified files |
| --- | --- | --- |
| GPT 1 沙暴裂谷 / Dune Tempest | `feature/epic-home-art-dune-tempest` | `src/upcoming-scenes/dune-tempest.ts`, `tests/upcoming-dune-tempest-scene.test.js`, `docs/designs/new-tracks/home-art/dune-tempest.md`, optional `public/track-teasers/dune-tempest.jpg` |
| GPT 2 雨林失落神殿 / Monsoon Ruins | `feature/epic-home-art-monsoon-ruins` | `src/upcoming-scenes/monsoon-ruins.ts`, `tests/upcoming-monsoon-ruins-scene.test.js`, `docs/designs/new-tracks/home-art/monsoon-ruins.md`, optional `public/track-teasers/monsoon-ruins.jpg` |
| GPT 3 浮空群島 / Skyfall Archipelago | `feature/epic-home-art-skyfall-archipelago` | `src/upcoming-scenes/skyfall-archipelago.ts`, `tests/upcoming-skyfall-archipelago-scene.test.js`, `docs/designs/new-tracks/home-art/skyfall-archipelago.md`, optional `public/track-teasers/skyfall-archipelago.jpg` |
| GPT 4 熔火天脊 / Volcanic Crown | `feature/epic-home-art-volcanic-crown` | `src/upcoming-scenes/volcanic-crown.ts`, `tests/upcoming-volcanic-crown-scene.test.js`, `docs/designs/new-tracks/home-art/volcanic-crown.md`, optional `public/track-teasers/volcanic-crown.jpg` |
| GPT 5 霓虹暴雨都市 / Stormline Megacity | `feature/epic-home-art-stormline-megacity` | `src/upcoming-scenes/stormline-megacity.ts`, `tests/upcoming-stormline-megacity-scene.test.js`, `docs/designs/new-tracks/home-art/stormline-megacity.md`, optional `public/track-teasers/stormline-megacity.jpg` |
| GPT 6 UI/integration | `feature/epic-multiroute-longform-tracks` | Shared scene host `src/upcoming-showcase.ts`, `src/world.js`, `src/main.js`, `src/race-select-ui.ts`, `src/track-preview.ts` (if necessary), `src/App.vue`, shared tests, styles, locale, documentation, and selectively incorporated approved map files |

Art branches were originally forked from an earlier planning commit. GPT 6 must **copy only the approved environment/test/art-note blobs** into the integration branch, not merge each art branch's full history or revert newer UI. GPT 1–5 must NOT edit shared renderer, race registry, `CLAUDE.md`, `TODO.md`, `App.vue`, CSS, common locale, or shared UI tests.

## Scene module integration interface for GPT 1–5

```ts
// Each src/upcoming-scenes/<id>.ts exports this exact function and compatible return.
import * as THREE from 'three';
export function createUpcomingEnvironment(scene: THREE.Scene): {
  group: THREE.Group;
  update(timeSeconds: number, quality: 'low' | 'medium' | 'high', reducedMotion: boolean): void;
  dispose(): void;
};
```

Common coordinates: ground road under shared showroom car at `(0,0,0)`, forward = `-Z`, right = `+X`, up = `+Y`. Draw a real 3D road/terrain slice from about Z +45 behind the car to −180 ahead; real visible three-dimensional raised branch and layered recognizable landmarks. Ground map doesn't need full playable length yet. **Do not create the car or its jets; GPT 6 owns them**. Don't create renderer, camera, another canvas, a requestAnimationFrame loop, DOM events, gameplay Race or UI. Scene module contains its own group and materials, receives time/quality/reduced-motion from existing render loop, caps geometry/particles for mobile and frees created resources in `dispose()`. Deterministic time updates (same inputs ⇒ same scene state) should be unit-tested.

## GPT 1 — 沙暴裂谷 / Dune Tempest

Copy the full block below into a **separate GPT conversation**:

> **IMPLEMENT, not just plan** one animated Three.js Skyline Rush **COMING SOON homepage environment** for **沙暴裂谷 / Dune Tempest**.
>
> Repository `weskao/skyline-rush`; **only editable branch** `feature/epic-home-art-dune-tempest` (already exists). Check latest HEAD and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and the [binding dynamic home spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) from the shared integration branch (not present on initial art branch).
>
> **JPEG ground ref:** `docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-01.jpg`. **JPEG air/alternate ref:** `docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-02.jpg`. **Route ref:** `docs/designs/new-tracks/route-schematics/dune-tempest.svg`. Use these as art/landmark/camera references—not as a background image or a physically precise lap route.
>
> **3D scenery:** Sandy tan/orange natural road with **visible hairpins**, tall canyon cliffs, huge rock hoop, far dunes. **Time-based motion:** bounded moving dust ribbons, sand grains and sun haze. **Clear ground + air route:** raised canyon-crossing aerial route beside a safely continuous ground-road curve. All sections are point-to-point (no laps), with readable forward progress and ground fallback. Preserve signature lighting and material colors visible in the reference JPEGs; avoid excessive bloom/particles/road obstruction.
>
> **Create actual code:** `src/upcoming-scenes/dune-tempest.ts` exporting `createUpcomingEnvironment(scene: THREE.Scene)` per the shared module interface; produce mesh/instanced scenery, terrain, roadway, distinct branch and animated props, with `update(timeSeconds, quality, reducedMotion)` / `dispose()`. This is **real live 3D**, not a static JPEG, CSS animation, canvas photo plane or fake 3D screenshot. No separate renderer, camera, car models, game race modes or full race physics.
>
> **TDD:** add `tests/upcoming-dune-tempest-scene.test.js` before implementation, verify RED, implement, verify GREEN; ensure landmark geometry/visibility hooks are testable and reduced-motion/Low quality suppress costly motion. Add `docs/designs/new-tracks/home-art/dune-tempest.md` describing reference paths, distinctive scene anchors, animation, weather, branch/landing, camera match, asset/mesh budget and remaining visual deviations. Optional native JPEG thumbnail may update **only** `public/track-teasers/dune-tempest.jpg`, but it is not the main deliverable.
>
> **File ownership:** only your assigned `src/upcoming-scenes/dune-tempest.ts`, `tests/upcoming-dune-tempest-scene.test.js`, `docs/designs/new-tracks/home-art/dune-tempest.md`, and optional `public/track-teasers/dune-tempest.jpg`; do **not** edit common Vue/TS/CSS/locale/renderer files or another map. Do not merge into the shared integration branch, `develop` or `main`, deploy or force push.
>
> **Deliver:** actual branch commit SHA, source files, observed test/CI status, truthful playable-vs-showroom status, and if possible an actual WebGL frame from isolated test harness. A static concept JPEG does **not** mean completion.

## GPT 2 — 雨林失落神殿 / Monsoon Ruins

Copy the full block below into a **separate GPT conversation**:

> **IMPLEMENT, not just plan** one animated Three.js Skyline Rush **COMING SOON homepage environment** for **雨林失落神殿 / Monsoon Ruins**.
>
> Repository `weskao/skyline-rush`; **only editable branch** `feature/epic-home-art-monsoon-ruins` (already exists). Check latest HEAD and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and the [binding dynamic home spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) from the shared integration branch (not present on initial art branch).
>
> **JPEG ground ref:** `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-01.jpg`. **JPEG air/alternate ref:** `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-02.jpg`. **Route ref:** `docs/designs/new-tracks/route-schematics/monsoon-ruins.svg`. Use these as art/landmark/camera references—not as a background image or a physically precise lap route.
>
> **3D scenery:** Green jungle, wet dirt S-curve, temple ruins, giant sculpted stone, waterfall. **Time-based motion:** controlled rain, drifting mist, moving leaf clusters and gentle water ripple. **Clear ground + air route:** stone-bridge flight branch above the waterfall beside the lower ground path. All sections are point-to-point (no laps), with readable forward progress and ground fallback. Preserve signature lighting and material colors visible in the reference JPEGs; avoid excessive bloom/particles/road obstruction.
>
> **Create actual code:** `src/upcoming-scenes/monsoon-ruins.ts` exporting `createUpcomingEnvironment(scene: THREE.Scene)` per the shared module interface; produce mesh/instanced scenery, terrain, roadway, distinct branch and animated props, with `update(timeSeconds, quality, reducedMotion)` / `dispose()`. This is **real live 3D**, not a static JPEG, CSS animation, canvas photo plane or fake 3D screenshot. No separate renderer, camera, car models, game race modes or full race physics.
>
> **TDD:** add `tests/upcoming-monsoon-ruins-scene.test.js` before implementation, verify RED, implement, verify GREEN; ensure landmark geometry/visibility hooks are testable and reduced-motion/Low quality suppress costly motion. Add `docs/designs/new-tracks/home-art/monsoon-ruins.md` describing reference paths, distinctive scene anchors, animation, weather, branch/landing, camera match, asset/mesh budget and remaining visual deviations. Optional native JPEG thumbnail may update **only** `public/track-teasers/monsoon-ruins.jpg`, but it is not the main deliverable.
>
> **File ownership:** only your assigned `src/upcoming-scenes/monsoon-ruins.ts`, `tests/upcoming-monsoon-ruins-scene.test.js`, `docs/designs/new-tracks/home-art/monsoon-ruins.md`, and optional `public/track-teasers/monsoon-ruins.jpg`; do **not** edit common Vue/TS/CSS/locale/renderer files or another map. Do not merge into the shared integration branch, `develop` or `main`, deploy or force push.
>
> **Deliver:** actual branch commit SHA, source files, observed test/CI status, truthful playable-vs-showroom status, and if possible an actual WebGL frame from isolated test harness. A static concept JPEG does **not** mean completion.

## GPT 3 — 浮空群島 / Skyfall Archipelago

Copy the full block below into a **separate GPT conversation**:

> **IMPLEMENT, not just plan** one animated Three.js Skyline Rush **COMING SOON homepage environment** for **浮空群島 / Skyfall Archipelago**.
>
> Repository `weskao/skyline-rush`; **only editable branch** `feature/epic-home-art-skyfall-archipelago` (already exists). Check latest HEAD and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and the [binding dynamic home spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) from the shared integration branch (not present on initial art branch).
>
> **JPEG ground ref:** `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-01.jpg`. **JPEG air/alternate ref:** `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-02.jpg`. **Route ref:** `docs/designs/new-tracks/route-schematics/skyfall-archipelago.svg`. Use these as art/landmark/camera references—not as a background image or a physically precise lap route.
>
> **3D scenery:** Independent floating islands, traversable stone bridge, vast white cloud ocean, distant waterfall and huge sky-ring. **Time-based motion:** slow clouds, waterfall flow and airborne dust/light motes. **Clear ground + air route:** visibly elevated air route across a gap, alongside a continuous lower stone-road alternative. All sections are point-to-point (no laps), with readable forward progress and ground fallback. Preserve signature lighting and material colors visible in the reference JPEGs; avoid excessive bloom/particles/road obstruction.
>
> **Create actual code:** `src/upcoming-scenes/skyfall-archipelago.ts` exporting `createUpcomingEnvironment(scene: THREE.Scene)` per the shared module interface; produce mesh/instanced scenery, terrain, roadway, distinct branch and animated props, with `update(timeSeconds, quality, reducedMotion)` / `dispose()`. This is **real live 3D**, not a static JPEG, CSS animation, canvas photo plane or fake 3D screenshot. No separate renderer, camera, car models, game race modes or full race physics.
>
> **TDD:** add `tests/upcoming-skyfall-archipelago-scene.test.js` before implementation, verify RED, implement, verify GREEN; ensure landmark geometry/visibility hooks are testable and reduced-motion/Low quality suppress costly motion. Add `docs/designs/new-tracks/home-art/skyfall-archipelago.md` describing reference paths, distinctive scene anchors, animation, weather, branch/landing, camera match, asset/mesh budget and remaining visual deviations. Optional native JPEG thumbnail may update **only** `public/track-teasers/skyfall-archipelago.jpg`, but it is not the main deliverable.
>
> **File ownership:** only your assigned `src/upcoming-scenes/skyfall-archipelago.ts`, `tests/upcoming-skyfall-archipelago-scene.test.js`, `docs/designs/new-tracks/home-art/skyfall-archipelago.md`, and optional `public/track-teasers/skyfall-archipelago.jpg`; do **not** edit common Vue/TS/CSS/locale/renderer files or another map. Do not merge into the shared integration branch, `develop` or `main`, deploy or force push.
>
> **Deliver:** actual branch commit SHA, source files, observed test/CI status, truthful playable-vs-showroom status, and if possible an actual WebGL frame from isolated test harness. A static concept JPEG does **not** mean completion.

## GPT 4 — 熔火天脊 / Volcanic Crown

Copy the full block below into a **separate GPT conversation**:

> **IMPLEMENT, not just plan** one animated Three.js Skyline Rush **COMING SOON homepage environment** for **熔火天脊 / Volcanic Crown**.
>
> Repository `weskao/skyline-rush`; **only editable branch** `feature/epic-home-art-volcanic-crown` (already exists). Check latest HEAD and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and the [binding dynamic home spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) from the shared integration branch (not present on initial art branch).
>
> **JPEG ground ref:** `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-01.jpg`. **JPEG air/alternate ref:** `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-02.jpg`. **Route ref:** `docs/designs/new-tracks/route-schematics/volcanic-crown.svg`. Use these as art/landmark/camera references—not as a background image or a physically precise lap route.
>
> **3D scenery:** Black basalt volcanic rim, orange magma gorge, curved road and hairpins with glowing rock fissures. **Time-based motion:** flowing lava band, ember sparks, restrained heat haze/ash. **Clear ground + air route:** aerial leap across lava ravine with identifiable elevated landing zone and ground road. All sections are point-to-point (no laps), with readable forward progress and ground fallback. Preserve signature lighting and material colors visible in the reference JPEGs; avoid excessive bloom/particles/road obstruction.
>
> **Create actual code:** `src/upcoming-scenes/volcanic-crown.ts` exporting `createUpcomingEnvironment(scene: THREE.Scene)` per the shared module interface; produce mesh/instanced scenery, terrain, roadway, distinct branch and animated props, with `update(timeSeconds, quality, reducedMotion)` / `dispose()`. This is **real live 3D**, not a static JPEG, CSS animation, canvas photo plane or fake 3D screenshot. No separate renderer, camera, car models, game race modes or full race physics.
>
> **TDD:** add `tests/upcoming-volcanic-crown-scene.test.js` before implementation, verify RED, implement, verify GREEN; ensure landmark geometry/visibility hooks are testable and reduced-motion/Low quality suppress costly motion. Add `docs/designs/new-tracks/home-art/volcanic-crown.md` describing reference paths, distinctive scene anchors, animation, weather, branch/landing, camera match, asset/mesh budget and remaining visual deviations. Optional native JPEG thumbnail may update **only** `public/track-teasers/volcanic-crown.jpg`, but it is not the main deliverable.
>
> **File ownership:** only your assigned `src/upcoming-scenes/volcanic-crown.ts`, `tests/upcoming-volcanic-crown-scene.test.js`, `docs/designs/new-tracks/home-art/volcanic-crown.md`, and optional `public/track-teasers/volcanic-crown.jpg`; do **not** edit common Vue/TS/CSS/locale/renderer files or another map. Do not merge into the shared integration branch, `develop` or `main`, deploy or force push.
>
> **Deliver:** actual branch commit SHA, source files, observed test/CI status, truthful playable-vs-showroom status, and if possible an actual WebGL frame from isolated test harness. A static concept JPEG does **not** mean completion.

## GPT 5 — 霓虹暴雨都市 / Stormline Megacity

Copy the full block below into a **separate GPT conversation**:

> **IMPLEMENT, not just plan** one animated Three.js Skyline Rush **COMING SOON homepage environment** for **霓虹暴雨都市 / Stormline Megacity**.
>
> Repository `weskao/skyline-rush`; **only editable branch** `feature/epic-home-art-stormline-megacity` (already exists). Check latest HEAD and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and the [binding dynamic home spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) from the shared integration branch (not present on initial art branch).
>
> **JPEG ground ref:** `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-01.jpg`. **JPEG air/alternate ref:** `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-02.jpg`. **Route ref:** `docs/designs/new-tracks/route-schematics/stormline-megacity.svg`. Use these as art/landmark/camera references—not as a background image or a physically precise lap route.
>
> **3D scenery:** Rain-soaked futuristic city, skyscraper layers, reflective road, multilevel overpasses, holographic signage. **Time-based motion:** rainfall, glistening puddle hints, pulsing neon and distant moving traffic silhouettes. **Clear ground + air route:** a ground-city road and visibly different raised interchange/air shortcut that rejoins ahead. All sections are point-to-point (no laps), with readable forward progress and ground fallback. Preserve signature lighting and material colors visible in the reference JPEGs; avoid excessive bloom/particles/road obstruction.
>
> **Create actual code:** `src/upcoming-scenes/stormline-megacity.ts` exporting `createUpcomingEnvironment(scene: THREE.Scene)` per the shared module interface; produce mesh/instanced scenery, terrain, roadway, distinct branch and animated props, with `update(timeSeconds, quality, reducedMotion)` / `dispose()`. This is **real live 3D**, not a static JPEG, CSS animation, canvas photo plane or fake 3D screenshot. No separate renderer, camera, car models, game race modes or full race physics.
>
> **TDD:** add `tests/upcoming-stormline-megacity-scene.test.js` before implementation, verify RED, implement, verify GREEN; ensure landmark geometry/visibility hooks are testable and reduced-motion/Low quality suppress costly motion. Add `docs/designs/new-tracks/home-art/stormline-megacity.md` describing reference paths, distinctive scene anchors, animation, weather, branch/landing, camera match, asset/mesh budget and remaining visual deviations. Optional native JPEG thumbnail may update **only** `public/track-teasers/stormline-megacity.jpg`, but it is not the main deliverable.
>
> **File ownership:** only your assigned `src/upcoming-scenes/stormline-megacity.ts`, `tests/upcoming-stormline-megacity-scene.test.js`, `docs/designs/new-tracks/home-art/stormline-megacity.md`, and optional `public/track-teasers/stormline-megacity.jpg`; do **not** edit common Vue/TS/CSS/locale/renderer files or another map. Do not merge into the shared integration branch, `develop` or `main`, deploy or force push.
>
> **Deliver:** actual branch commit SHA, source files, observed test/CI status, truthful playable-vs-showroom status, and if possible an actual WebGL frame from isolated test harness. A static concept JPEG does **not** mean completion.

## GPT 6 — Animated Three.js Home Integration, UX, TDD and Exact-HEAD CI

Copy the full block below into a **sixth separate GPT conversation**:

> **IMPLEMENT the shared live 3D upcoming homepage, not a JPEG slideshow and not just a plan.** Repository `weskao/skyline-rush`. **Only editable branch** `feature/epic-multiroute-longform-tracks`. Re-read the latest HEAD because concurrent chats may change it; respect `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `TODO.md`, [binding 3D scene spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md), [first-pass UX spec](../specs/2026-11-03-stage1-coming-soon-home-preview-design.md) and [TDD plan](../plans/2026-11-03-six-chat-home-preview-integration.md).
>
> **Critical existing code:** `src/world.js` owns the current Three.js renderer/camera/composer and already switches to the dedicated garage scene; `src/track-preview.ts` owns 50° showroom camera and animated cars; `src/car-model.js` / `src/aero-vfx.js` own real player/rivals and thruster visuals; `src/world-tour-scene.js` / `src/world-tour-motion.js` are prior scenery/animation patterns. Current `src/App.vue` and `src/race-select-ui.ts` contain a temporary `#upcoming-scene` **static JPEG overlay** which must NOT be the final showcase. Existing `src/upcoming-tracks.ts`, locale and tests implement a first-pass selectable/disabled status; preserve and improve them rather than starting over.
>
> **Integrate real 3D:** create `src/upcoming-showcase.ts`, one shared scene host using the same WebGL context/renderPass/composer/main loop as `world.js`. Reuse actual car meshes, paint, hover/jets/VFX and 1–3 rivals when affordable; ensure correct terrain contact/hover height and real landmark depth. Render selected upcoming environment from **its own** `src/upcoming-scenes/<id>.ts` scene module, not a placeholder existing playable map, flat JPEG, CSS illusion or fake playable `Race`. Pass real frame time/quality/reduced motion to each module's `update()`; use curated ground/air camera, preserve orbit & device controls, handle context lost, dispose resources and switch back cleanly to a normal playable preview or garage.
>
> **Five scene branch integration:** each `feature/epic-home-art-<id>` owns only `src/upcoming-scenes/<id>.ts`, its scene test, its `home-art/<id>.md`, optional JPEG thumbnail. Check each latest art HEAD/CI and selectively copy **only those files** after review into this shared branch; never rewrite a feature branch or merge its older base history. If scenes aren't complete, keep Coming Soon cards, mark 3D not done and list missing modules. Do not claim full five-scene support with a JPEG fallback.
>
> **UX behavior:** exactly first five future maps selectable with localized names, `COMING SOON` / `即將推出`. Stage 2 excluded. `#start-button` disabled on all future tracks, remains 236px desktop / 210px mobile / 190px compact landscape and changes to `Start race` / `開始比賽`, `LOCKED` / `未解鎖`, or `COMING SOON` / `即將推出` as selection dictates. Do not put future IDs in `RACE_TRACKS`, unlocks, history, Daily, Cup, rewards or ghosts. Keyboard Enter/swipe/pad cannot start a future map. Restore existing live 3D when switching to real maps.
>
> **Verification:** SDD→BDD→TDD; failing scene/selection tests first (Red), then code and Green, then refactor. Validate actual **time-separated WebGL frames for all five** (motion present under normal mode, frozen/reduced under Reduced Motion), three landmarks, 3D ground + aerial branch, vehicles and camera. Capture 1440×900 desktop and 390×844 mobile frames; compare each to both committed JPEG reference views with written deviations. Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify`, exact-HEAD full GitHub Actions CI and log real results. No CI or visual acceptance claim without observing evidence.
>
> **Restrictions:** only this shared branch; no `develop`/`main` changes, PRs, force push, deploy or merge until explicitly authorized. Keep README / TODO / CLAUDE and screenshots aligned with actual state. **Homepage 3D showroom is P0; full playable tracks remain a separate future wave.**

## Final integration acceptance

- [ ] Five unique **actual mesh-based Three.js animated** scenes are committed with deterministic update and disposal, scene tests and art notes; **not merely five JPEG images**.
- [ ] A single existing renderer and frame loop draws the corresponding selected environment, genuine shared cars and scene motion with 50° showcase framing; no independent canvas/renderer or stale placeholder.
- [ ] Three reference-matching visual anchors per scene; ground/air route levels visible; reduced-motion, quality/performance and mobile layouts checked.
- [ ] Exactly five preview-only Stage 1 cards; state/CTA bilingual, fixed-size, no race-start bypass, no Stage 2 cards.
- [ ] Time-separated real WebGL screenshots prove animation; two reference JPEGs guide each map's visual acceptance, with differences recorded; full tests/CI green on exact HEAD.
- [ ] `develop`, `main` unchanged; selective scene blob integration only.
