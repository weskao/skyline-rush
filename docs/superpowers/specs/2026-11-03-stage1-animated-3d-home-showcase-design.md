# Stage 1 — Animated Real-Time Three.js Home Showcases (Binding Product Requirement)

**Decision (2026-11-03):** The five upcoming maps must offer the **same class of animated 3D homepage experience as Skyline Rush's existing tracks**, not a static JPEG filling or covering the view. This corrects the earlier preview-only static-image implementation and its six-GPT brief.
**Implementation status at writing:** **NOT IMPLEMENTED/NOT VERIFIED.** The existing `#upcoming-scene` still-image overlay in `src/App.vue` and `src/race-select-ui.ts` is an interim fallback, **not acceptance**.
**Repository / target integration branch:** `weskao/skyline-rush` / `feature/epic-multiroute-longform-tracks`.
**Scope:** **Stage 1 five only**. Stage 2 five proposed tracks remain listed in documents, absent from the homepage. All 5 proposed Stage 1 tracks are point-to-point, distinct START and FINISH, no laps. **Homepage 3D environment is allowed to be a selective showcase slice**; it is not a full playable 13–16 km race or race physics activation.
**Art reference:** [Stage 1 committed ground/aerial JPEGs](../../designs/new-tracks/README.md), each map's two `docs/designs/new-tracks/source-concept-jpeg/<id>/concept-view-0{1,2}.jpg`, accompanying route SVG, and [ten-map concept-to-WebGL gate](../../designs/new-tracks/visual-acceptance-gate.md).
**Execution:** [Six GPT handoffs](../prompts/2026-11-03-six-chat-home-preview-implementation.md) · [TDD integration plan](../plans/2026-11-03-six-chat-home-preview-integration.md).

## P0 — User-facing behavior

- On selecting any of the **five** upcoming cards, render its **own live, spatially correct, animated Three.js scene** in the existing `#world` WebGL canvas. A photograph/JPEG must **not** cover it when WebGL works. A still background plane with a car placed in front is also insufficient; each scene needs physically modelled road/terrain and distinguishing layered landmarks with motion and depth.
- Visual presentation keeps the existing Skyline Rush showroom look: actual shared vehicle model, consistent size/paint/lights, three-quarter road-oriented 50° FOV camera, hovering jets/airflow or grounded pose as settings dictate, and optional 1–3 rival showcase cars without unfair race semantics. The car must not clip into or float erroneously above terrain; its wheels and jet animations should match garage/home visual states.
- The selected Stage 1 preview's camera and environment remain animated while on the homepage, even though no race is running. Existing `Drive / Front / Rear / Left / Right / Orbit` controls (where present) and device reflow must continue to function or have an explicitly documented supported subset with tests. Any scenery animation obeys `Reduced Motion` and Low / Medium / High settings; no overdraw, high-frequency flash or always-on heavy GPU postprocess.
- **Coming Soon does not mean playable.** Clicking/keyboard/swiping any upcoming card may select and inspect it, but `#start-button` remains disabled and reads `COMING SOON` / `即將推出`. Never register these IDs in `RACE_TRACKS`, `createRace`, `RaceFactory`, Daily, Cup, Ghost, results, storage or progression. Persist only last actually raced playable track. Switching to an existing map returns the existing animated playable-track preview correctly.
- Keep existing locked/unlocked semantics for ten currently playable sprint maps. Desktop/mobile button width fixed across localization: 236px desktop / 210px mobile / 190px compact landscape. Only English and Traditional Chinese are currently supported. Accessible card names, `aria-pressed`, keyboard controls and disabled state required.

## Architecture contract — reuse the existing game, no duplicate renderer

Read these exact code paths before writing:
- `src/world.js`: existing WebGL renderer, `scene`, `camera`, `renderPass.scene`, `composer.render(dt)`, shared idle `render(race, dt, idleTime)`; garage already uses an independent scene with the **same renderer, composer and camera**.
- `src/track-preview.ts`: `HERO_PREVIEWS`, `showcaseCameraPose`, `previewPlayer`, `previewRival` and 50° preview framing patterns.
- `src/car-model.js`: `makeCar`, `CAR_STYLES`; `src/aero-vfx.js`: shared jet/flight effects; `src/garage-stage.ts`: model of a separate scene lifecycle without a second GPU context.
- `src/world-tour-scene.js` and `src/world-tour-motion.js`: environment batching, scenery update patterns, time-based animation.
- `src/race-select-ui.ts`, `src/upcoming-tracks.ts`, `src/App.vue`, `src/main.js`: currently separate `upcomingSelection` from the playable `Race`, but incorrectly show a JPEG as the final homepage hero.

**One renderer / one render loop / one gameplay controller.** GPT 6 owns `src/upcoming-showcase.ts` (common preview scene host and shared car/camera), `src/world.js` integration and `src/main.js` hookup. When preview is selected, hand its ID and environment to the shared world renderer; do not invent a fake `Race` just to select scenery. Keep the previous actual `Race` untouched, avoid leaking geometries/materials or leaving preview background animations active when hidden. Switch `renderPass.scene` to the showcase scene only in ready/home phase when the preview ID is selected. When changing to real track or garage, restore normal scene; context-lost/restored lifecycle must be safe.

**Five art branch module contracts** (one owner for each ID):
```ts
// src/upcoming-scenes/<id>.ts
// module export name uniquely indicates map, no default export or game state dependency
export function createUpcomingEnvironment(scene: THREE.Scene): {
  group: THREE.Group;
  update(timeSeconds: number, quality: 'low' | 'medium' | 'high', reducedMotion: boolean): void;
  dispose(): void;
};
```
- Module owns only its scene environment: native 3D drivable-looking road surface, two-level branch, terrain, large local landmark props, background depth, lighting/weather objects and deterministic animation. It **does not** own player/rival cars, scene camera, Renderer, canvas, VFX system, game state, settings, DOM, RAF, event listeners, or a second scene manager. GPT 6 injects shared vehicle visual and camera to each environment scene. `update` mutates time only, with capped GPU/CPU work; disposal frees its resources.
- Common local coordinate reference for all environment modules: forward = **−Z**, right = **+X**, up = **+Y**, show-car anchor near **(0, 0, 0)**, road spanning local Z **+45 to −180**. Road support at origin Y ≈ 0. Ground display highlights the driving road; elevated alternate fork must be visibly different and reconnect visually beyond the frame. Actual future race route SVG has distinct start/finish; a showcase slice may be shorter.
- Each branch owns just `src/upcoming-scenes/<id>.ts`, `tests/upcoming-<id>-scene.test.js`, `docs/designs/new-tracks/home-art/<id>.md`, and optionally one matching `public/track-teasers/<id>.jpg` for thumbnail/fallback. The file and exported function name are fixed to prevent cross-branch collisions. Do not modify `world.js`, `App.vue`, common UI, `CLAUDE.md`, `TODO.md`, package files, or any other branch. GPT 6 selectively copies only these blobs from each branch, rather than merging histories from an older base.

## Five map-specific mandatory 3D landmarks and ambient motion

| Map | Distinct 3D terrain/road/landmarks | Live motion (bounded/reduced-motion aware) | Ground/air route readability |
|---|---|---|---|
| 沙暴裂谷 / Dune Tempest | 褐金色沙丘、自然沙路髮夾彎、石環與峽谷崖壁 | 局部沙塵移動、風沙粒子、岩壁光影 | 地面沙路及跨峽谷的高層空中捷徑 |
| 雨林失落神殿 / Monsoon Ruins | 深綠雨林、古神殿、S 彎泥地、瀑布 | 雨滴、水面波紋、樹葉擺動、薄霧 | 地面泥路與瀑布旁石橋飛行分岔 |
| 浮空群島 / Skyfall Archipelago | 白色雲海、浮島、懸空石橋、巨型石環、瀑布 | 雲海緩移、瀑布流動、飄浮粒子 | 地面可行走石橋及跨島上層飛行捷徑 |
| 熔火天脊 / Volcanic Crown | 玄武岩、火山口、U 彎、岩漿裂谷 | 岩漿光脈動、熱浪、少量火星與煙灰 | 玄武岩道路及跨裂谷的飛行捷徑 |
| 霓虹暴雨都市 / Stormline Megacity | 夜間高樓、濕柏油、多層高架、霓虹招牌 | 暴雨、樓宇燈光變化、地面反射與遠景車流 | 低層街道道路及高架空中迂迴捷徑 |

Each scene needs at least **three in-frame landmark anchors** corresponding to its own source JPEGs, and two coherent view targets (ground and elevated). Keep the road and landing path legible through storms, fog, debris or glow. Do not replace uniquely themed geometry with a recolored copy of a generic road.

## Acceptance gates — all required

- [ ] Five actual scene modules and tests exist on their respective branches; each module can build, update, set low/reduced-motion settings and dispose without leakage, and maintains distinct visual identity.
- [ ] Shared UI chooses exactly five preview-only tracks; new 3D renderer creates/switches live scene and preserves existing cars, jets, scene camera and animations. 3D scene **not** a still image or flat photo plane.
- [ ] Remove/hide JPEG full-hero overlay when WebGL is available; keep JPEG only for compact card thumbs or explicit failure fallback. No accidental presentation of an unrelated existing playable track beneath a photo as if it were the new track.
- [ ] Verify motion by capturing **at least two real WebGL frames separated in time** for every map and checking intentional movement (dust, rain, waterfalls, lava, neon, etc.) while static scene landmarks remain stable; motion-reduced setting freezes/simplifies effects.
- [ ] For each map, capture real WebGL **1440×900 desktop** and **390×844 mobile** hero screenshots, and ground/aerial camera evidence. Compare each with its two JPEG source references, report scene silhouette, three anchors, car scale, weather/motion, visible route split, camera occlusion and approved deviations (not guessed similarity %).
- [ ] Verify no collision/vehicle floating impression, 1–3 rivals where performance allows, preview camera modes, UI legibility in both locales, reduced-motion, quality tiers and stable p50/p95 FPS/drawcalls.
- [ ] Focused Red→Green→Refactor tests plus `npm test`, `npm run typecheck`, `npm run build`, browser `npm run test:layout`, `make verify`, and full **exact-HEAD GitHub Actions quality-gate**; no completion claim without observed test/CI and real-WebGL screenshots. Existing ten sprint maps remain unaffected.
- [ ] Do not merge into `develop`, `main`, create PR, deploy, or force push.

**Priority:** Deliver the dynamic **homepage showroom slice first**. Actual full-length playable tracks, graph/AI/physics/spawn/checkpoints are a later separate implementation gate and are **not** prerequisites for correct animated Coming Soon presentation.
