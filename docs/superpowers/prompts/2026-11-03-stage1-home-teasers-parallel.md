# Stage 1 Home Showcase — Five Independent Three.js Scene Assignments (UPDATED 2026-11-03)

> **This replaces the obsolete JPEG-only brief.** The user requires the *same moving 3D home experience as the existing Skyline Rush tracks*: real car(s), hover/jets, real three-dimensional roads/landmarks, weather, scene motion and camera. Static pictures can be reference thumbnails only. The separate **sixth GPT** owns existing shared 3D renderer, car/camera/UI and final scene integration.
>
> Canonical [Six-Chat Full Implementation Prompts](2026-11-03-six-chat-home-preview-implementation.md) · [Binding animated home 3D spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) · [TDD plan](../plans/2026-11-03-six-chat-home-preview-integration.md).

Five branches exist from an earlier planning commit and MUST NOT directly modify shared UI: one scene owner per `feature/epic-home-art-<id>`. Source files are the committed `source-concept-jpeg/<id>/concept-view-01.jpg` (ground), `concept-view-02.jpg` (aerial), and `route-schematics/<id>.svg`, all under `docs/designs/new-tracks/`. **All five upcoming maps are point-to-point, selectable but unplayable**. The five Stage 2 maps are out of scope.

## Five prompts for five separate GPT chats

### 1. 沙暴裂谷 / Dune Tempest

Copy this block into a **separate GPT chat**:

> Implement **ONE real animated Three.js homepage environment** for `weskao/skyline-rush`, **existing only editable branch** `feature/epic-home-art-dune-tempest`.
>
> **Read** `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, the shared-branch `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`, and its two source JPEGs / route SVG under `docs/designs/new-tracks/`. Refer to both ground and aerial concept compositions.
>
> **3D art direction:** 巨型沙丘、蜿蜒峽谷、沙石自然髮夾彎、巨型石環與沙塵牆. **Real-time motion:** 沙塵移動、粒子霧、光照漸變. Include a clear ground route with a visible elevated/flight alternative branch and map-specific 3D landmarks. Road and objects are real Three.js meshes (not a JPEG/photo plane, CSS parallax, background screenshot or fake game render).
>
> **Only owned deliverables:** `src/upcoming-scenes/dune-tempest.ts`, `tests/upcoming-dune-tempest-scene.test.js`, `docs/designs/new-tracks/home-art/dune-tempest.md`; optional actual native-resolution JPEG thumbnail at `public/track-teasers/dune-tempest.jpg`. Export `createUpcomingEnvironment(scene: THREE.Scene)` returning `{group, update(timeSeconds, quality, reducedMotion), dispose()}`; own **only scenery**, NOT vehicles/camera/renderer/RAF/gameplay/controller/UI/locale. Local car anchor ground `(0,0,0)`, forward `-Z`; shared GPT 6 supplies real game car and all cameras.
>
> TDD Red→Green→Refactor: test construction, 3 unique anchors, terrain/ground and elevated road branches, deterministic motion, quality/reduced-motion and disposal. Make low-tier light and ensure weather does not hide road. Write map-specific art note referencing exact JPEGs, scene geometry, lighting, animation and visual deviations.
>
> Push only this branch, verify actual GitHub code files and report commit/test results. DO NOT edit shared UI, another art branch, `develop`, `main`, create PR, deploy or force push. A static JPEG alone does not complete this task.

### 2. 雨林失落神殿 / Monsoon Ruins

Copy this block into a **separate GPT chat**:

> Implement **ONE real animated Three.js homepage environment** for `weskao/skyline-rush`, **existing only editable branch** `feature/epic-home-art-monsoon-ruins`.
>
> **Read** `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, the shared-branch `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`, and its two source JPEGs / route SVG under `docs/designs/new-tracks/`. Refer to both ground and aerial concept compositions.
>
> **3D art direction:** 雨林樹冠、泥地 S 彎、古神殿、瀑布、石橋. **Real-time motion:** 暴雨、霧氣、落葉、水瀑流動. Include a clear ground route with a visible elevated/flight alternative branch and map-specific 3D landmarks. Road and objects are real Three.js meshes (not a JPEG/photo plane, CSS parallax, background screenshot or fake game render).
>
> **Only owned deliverables:** `src/upcoming-scenes/monsoon-ruins.ts`, `tests/upcoming-monsoon-ruins-scene.test.js`, `docs/designs/new-tracks/home-art/monsoon-ruins.md`; optional actual native-resolution JPEG thumbnail at `public/track-teasers/monsoon-ruins.jpg`. Export `createUpcomingEnvironment(scene: THREE.Scene)` returning `{group, update(timeSeconds, quality, reducedMotion), dispose()}`; own **only scenery**, NOT vehicles/camera/renderer/RAF/gameplay/controller/UI/locale. Local car anchor ground `(0,0,0)`, forward `-Z`; shared GPT 6 supplies real game car and all cameras.
>
> TDD Red→Green→Refactor: test construction, 3 unique anchors, terrain/ground and elevated road branches, deterministic motion, quality/reduced-motion and disposal. Make low-tier light and ensure weather does not hide road. Write map-specific art note referencing exact JPEGs, scene geometry, lighting, animation and visual deviations.
>
> Push only this branch, verify actual GitHub code files and report commit/test results. DO NOT edit shared UI, another art branch, `develop`, `main`, create PR, deploy or force push. A static JPEG alone does not complete this task.

### 3. 浮空群島 / Skyfall Archipelago

Copy this block into a **separate GPT chat**:

> Implement **ONE real animated Three.js homepage environment** for `weskao/skyline-rush`, **existing only editable branch** `feature/epic-home-art-skyfall-archipelago`.
>
> **Read** `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, the shared-branch `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`, and its two source JPEGs / route SVG under `docs/designs/new-tracks/`. Refer to both ground and aerial concept compositions.
>
> **3D art direction:** 浮島、天然石橋、雲海與空中石環、瀑布. **Real-time motion:** 雲層緩移、水瀑與懸浮粒子. Include a clear ground route with a visible elevated/flight alternative branch and map-specific 3D landmarks. Road and objects are real Three.js meshes (not a JPEG/photo plane, CSS parallax, background screenshot or fake game render).
>
> **Only owned deliverables:** `src/upcoming-scenes/skyfall-archipelago.ts`, `tests/upcoming-skyfall-archipelago-scene.test.js`, `docs/designs/new-tracks/home-art/skyfall-archipelago.md`; optional actual native-resolution JPEG thumbnail at `public/track-teasers/skyfall-archipelago.jpg`. Export `createUpcomingEnvironment(scene: THREE.Scene)` returning `{group, update(timeSeconds, quality, reducedMotion), dispose()}`; own **only scenery**, NOT vehicles/camera/renderer/RAF/gameplay/controller/UI/locale. Local car anchor ground `(0,0,0)`, forward `-Z`; shared GPT 6 supplies real game car and all cameras.
>
> TDD Red→Green→Refactor: test construction, 3 unique anchors, terrain/ground and elevated road branches, deterministic motion, quality/reduced-motion and disposal. Make low-tier light and ensure weather does not hide road. Write map-specific art note referencing exact JPEGs, scene geometry, lighting, animation and visual deviations.
>
> Push only this branch, verify actual GitHub code files and report commit/test results. DO NOT edit shared UI, another art branch, `develop`, `main`, create PR, deploy or force push. A static JPEG alone does not complete this task.

### 4. 熔火天脊 / Volcanic Crown

Copy this block into a **separate GPT chat**:

> Implement **ONE real animated Three.js homepage environment** for `weskao/skyline-rush`, **existing only editable branch** `feature/epic-home-art-volcanic-crown`.
>
> **Read** `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, the shared-branch `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`, and its two source JPEGs / route SVG under `docs/designs/new-tracks/`. Refer to both ground and aerial concept compositions.
>
> **3D art direction:** 玄武岩火山口、彎曲地面公路、岩漿峽谷、上層跨谷. **Real-time motion:** 岩漿流、火星與煙灰、熱浪. Include a clear ground route with a visible elevated/flight alternative branch and map-specific 3D landmarks. Road and objects are real Three.js meshes (not a JPEG/photo plane, CSS parallax, background screenshot or fake game render).
>
> **Only owned deliverables:** `src/upcoming-scenes/volcanic-crown.ts`, `tests/upcoming-volcanic-crown-scene.test.js`, `docs/designs/new-tracks/home-art/volcanic-crown.md`; optional actual native-resolution JPEG thumbnail at `public/track-teasers/volcanic-crown.jpg`. Export `createUpcomingEnvironment(scene: THREE.Scene)` returning `{group, update(timeSeconds, quality, reducedMotion), dispose()}`; own **only scenery**, NOT vehicles/camera/renderer/RAF/gameplay/controller/UI/locale. Local car anchor ground `(0,0,0)`, forward `-Z`; shared GPT 6 supplies real game car and all cameras.
>
> TDD Red→Green→Refactor: test construction, 3 unique anchors, terrain/ground and elevated road branches, deterministic motion, quality/reduced-motion and disposal. Make low-tier light and ensure weather does not hide road. Write map-specific art note referencing exact JPEGs, scene geometry, lighting, animation and visual deviations.
>
> Push only this branch, verify actual GitHub code files and report commit/test results. DO NOT edit shared UI, another art branch, `develop`, `main`, create PR, deploy or force push. A static JPEG alone does not complete this task.

### 5. 霓虹暴雨都市 / Stormline Megacity

Copy this block into a **separate GPT chat**:

> Implement **ONE real animated Three.js homepage environment** for `weskao/skyline-rush`, **existing only editable branch** `feature/epic-home-art-stormline-megacity`.
>
> **Read** `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, the shared-branch `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`, and its two source JPEGs / route SVG under `docs/designs/new-tracks/`. Refer to both ground and aerial concept compositions.
>
> **3D art direction:** 密集夜都市、霓虹建築、多層高架、雨夜反光公路. **Real-time motion:** 雨滴、發光廣告、遠景車流燈光. Include a clear ground route with a visible elevated/flight alternative branch and map-specific 3D landmarks. Road and objects are real Three.js meshes (not a JPEG/photo plane, CSS parallax, background screenshot or fake game render).
>
> **Only owned deliverables:** `src/upcoming-scenes/stormline-megacity.ts`, `tests/upcoming-stormline-megacity-scene.test.js`, `docs/designs/new-tracks/home-art/stormline-megacity.md`; optional actual native-resolution JPEG thumbnail at `public/track-teasers/stormline-megacity.jpg`. Export `createUpcomingEnvironment(scene: THREE.Scene)` returning `{group, update(timeSeconds, quality, reducedMotion), dispose()}`; own **only scenery**, NOT vehicles/camera/renderer/RAF/gameplay/controller/UI/locale. Local car anchor ground `(0,0,0)`, forward `-Z`; shared GPT 6 supplies real game car and all cameras.
>
> TDD Red→Green→Refactor: test construction, 3 unique anchors, terrain/ground and elevated road branches, deterministic motion, quality/reduced-motion and disposal. Make low-tier light and ensure weather does not hide road. Write map-specific art note referencing exact JPEGs, scene geometry, lighting, animation and visual deviations.
>
> Push only this branch, verify actual GitHub code files and report commit/test results. DO NOT edit shared UI, another art branch, `develop`, `main`, create PR, deploy or force push. A static JPEG alone does not complete this task.

## Separate GPT 6 integration (never assigned to the five scene branches)

GPT 6 on `feature/epic-multiroute-longform-tracks` builds `src/upcoming-showcase.ts`, integrates the five scene modules with **existing `world.js` WebGL Renderer, player/rival cars, jet/VFX, `track-preview.ts` camera and idle update loop**. It removes/hides the current full-screen static JPEG hero when WebGL is available, preserves clickable Coming Soon cards with disabled localized fixed-width `#start-button`, and performs actual desktop/mobile, normal-motion/reduced-motion WebGL visual checks, TDD and exact-HEAD CI. See [GPT 6 full prompt](2026-11-03-six-chat-home-preview-implementation.md#gpt-6--animated-threejs-home-integration-ux-tdd-and-exact-head-ci).

**No five full race maps are built in this home-only stage.** Showroom scene = 3D animated partial terrain/route/vehicles; full race course graph/checkpoints/AI is a subsequent wave. JPEG remains required as visual reference, not accepted as final frame.
