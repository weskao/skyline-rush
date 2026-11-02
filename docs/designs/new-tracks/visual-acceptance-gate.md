# Skyline Rush — Concept JPEG → Real WebGL Visual Acceptance Gate

**Status:** Binding for future implementation of ten proposed point-to-point courses; **no actual gameplay screenshots or visual passes claimed**.
**Branch:** `feature/epic-multiroute-longform-tracks`; source branch `develop` merged on 2026-11-02.
**Scope:** Stage 1 [JPEG gallery](README.md) + [10 vector view references](concept-manifest.json), Stage 2 [JPEG gallery](stage-2/README.md) + [Stage 2 manifest](stage-2/concept-manifest.json). This document is a **scene direction and QA contract**, not an instruction to turn 2D concept art into a static 3D backdrop.

## Hard constraints — BEFORE starting any new track

1. **Preserve the actual reference files:** for Stage 1, consult `source-concept-jpeg/<id>/concept-view-01.jpg` (ground) and `concept-view-02.jpg` (aerial) **and** `concept-art/<id>-point-to-point-storyboard.svg` and `route-schematics/<id>.svg`; for Stage 2, consult `stage-2/source-concept-jpeg/<id>/concept-view-{01,02}.jpg`, `stage-2/route-schematics/<id>.svg`. Verify files exist at the implementation commit. No fake image paths.
2. **Single-finish topology:** ten new concepts all represent a point-to-point race: start != finish, ordered checkpoints, at least one viable ground path, split/merge branches and broad drivable surroundings where suitable. The illustrated map shape can loop visually but must never be interpreted as a mandatory lap circuit. CourseGraph coordinates and runtime road physics are the final topology authority, not 2D AI art.
3. **Build stage gates:** (A) authored road/terrain blockout and graph validation; (B) greybox real WebGL camera/scale proof; (C) signature landmarks/materials/lighting; (D) localized weather and bounded particles; (E) final captured comparisons for ground + elevated branch. Do not start another map's art polish before its blockout is physically drivable.
4. **Visual composition lock:** for each camera capture, specify track ID, edge ID, distance/progress, vehicle pose (x/y/z and yaw), camera mode/FOV/offset/look-at, weather preset/seed, time of day, resolution, quality tier and reduced-motion flag. Deterministically reconstruct at least a ground and air/alternate route frame, not whatever random view happens to look nicest.
5. **Reference vs implementation:** JPEGs are illustrative inspiration (biome, lighting, layering, landmark, particles and sense of scale) and may contain painterly/perspective exaggeration; exact pixel color or world proportions are **not** literal acceptance thresholds. Do not bake the JPEG into background scenery or present a generated render as actual WebGL QA.
6. **Technical truth:** terrain appearance must coincide with collision and car contact; stable road/ground frames under camera movement, 30/60/120 Hz, no invisible barriers, recovery rather than arbitrary flight clamp, no cross-branch collisions or checkpoint bypass; never trade geometry correctness for screenshot similarity.
7. **Performance/comfort truth:** Low / Medium / High and Reduced Motion from saved settings; fog/rain/dust never hide critical upcoming turns or landing zones; avoid oversized light bloom, temporal smearing and camera shake. Compare draw calls, triangles, frame p50/p95, memory and streaming/recovery on hardware actually tested. The existing `.claude/rules/track-showcase.md`, `.claude/rules/world-tour.md`, `.claude/rules/vehicle-road-stability.md` and `docs/rendering-performance.md` remain authoritative.

## Per-map fixed visual identity and two must-have frames

| Stage / map | View 01: ground driving must show | View 02: aerial/branch must show |
| --- | --- | --- |
| Stage 1 · Dune Tempest | 舞台：橙金峽谷、天然寬沙路、遠景石環；地面畫面需辨識大 U 彎 | 空中：沙塵牆後的斷崖、分岔跨谷及回接主線，無狹窄飛行牆 |
| Stage 1 · Monsoon Ruins | 舞台：雨林植被、石造巨像、神殿與可見的泥地 S 彎 | 空中：瀑布、石橋與上層捷徑，暴雨仍顯示下一個著陸區 |
| Stage 1 · Skyfall Archipelago | 舞台：白雲海、斷開的浮島、空中石環與主路石橋 | 空中：明確的跨島飛行路線、遠近島嶼、可看見低層備援路線 |
| Stage 1 · Volcanic Crown | 舞台：黑色玄武岩、火山口、熔岩河與連續髮夾彎 | 空中：熔岩裂谷飛越、火山拱門與安全降落點；火星不可覆蓋路口 |
| Stage 1 · Stormline Megacity | 舞台：深紫/藍色都市、雨夜反光、交錯高架與大曲線 | 空中：跨樓高架／飛行支線、可區分的高低樓層與降落銜接 |
| Stage 2 · Frostbite Canyon | 舞台：冰裂谷、開放積雪地面、峽谷大彎；避免與原有極光道路相似 | 空中：冰橋與裂隙跨越、雪霧中仍看得到目標 |
| Stage 2 · Abyssal Ruins | 舞台：透明海底封閉道路、珊瑚石柱、沉沒建築與焦散光 | 高層：透明穹頂高架旁路；『空中』指密閉立體路線，不是直接在水中自由飛行 |
| Stage 2 · Windspire Highlands | 舞台：草坡丘陵、土石路、風車、自然寬路與髮夾彎 | 空中：跨石橋高差、強風可見的安全落地區；無隱形風牆 |
| Stage 2 · Crystal Stardust Valley | 舞台：紫藍晶洞、天然谷路、巨型發光水晶及折射光柱 | 空中：晶體巨橋及捷徑，抑制 Bloom 避免遮蓋彎道 |
| Stage 2 · Chrono Rift | 舞台：多層斷裂石橋、古文明遺跡、時空巨環 | 空中：斷層跳躍與環狀視覺導引；不加入傳送、時間倒流或競速捷徑作弊 |

Each view requires **three identifiable visual anchors** in the accepted WebGL evidence (dominant landmark, middle-distance road/terrain shape, local material/weather signature). At least **one actual route choice** and its safe landing or ground continuation must be visible in View 02. Human reviewer records exceptions, with reason and before/after captures, rather than marking an absent anchor as passed.

## Repeatable evidence and pass/fail decision

For each map, capture the **real running app / Three.js WebGL output** for both camera slots:

- Required desktop **1440 × 900** and phone portrait **390 × 844** at Medium. That is **4 core captures per map × 10 maps = 40 baseline screenshots**; additionally inspect mobile landscape 844 × 390 and narrower 320 × 740 on maps with HUD/landmark overlap.
- Run Low, Medium, High and Reduced Motion checks; preserve a documented weather/seed selection. The full tier matrix may use representative maps for full screenshot count, but each map must be interactively verified for visibility and scene quality across tiers.
- Save `artifacts/new-tracks/visual-evidence/<id>/<view>-<viewport>-<tier>.png` (or CI artifact equivalent) and `<id>-review.md` with the actual game commit, reference JPEG path, camera snapshot, observed anchors, route correctness, performance and **PASS / FAIL / APPROVED DEVIATION** for each of these: (1) main silhouette/landmark, (2) terrain and road geometry, (3) car size/camera composition, (4) weather/materials/lighting, (5) branch/landing visibility, (6) no clipping/invisible walls.
- **Do not invent a subjective similarity percentage** or an arbitrary pixel-diff pass; image SSIM/LPIPS may inform review only when view/camera alignment is valid. Pass requires all six categories reviewed, with no unresolved critical functional or visibility problems; approved deviations must include a written reason and screenshot.
- Test a playable full route, not just photomode: 8-car AI choices, checkpoints on both branches, Ground-only fallback, replay/ghost, old-map parity, safe soft borders, 3–5 minute median targets (empirically measured, not guessed).
- TDD RED→GREEN→Refactor for topology, physics and deterministic weather; `make verify`, browser/WebGL screenshot evidence, exact-HEAD full CI and human review are **separate gates**. No flag flipped to completed until evidence is linked from `TODO.md`.

## JPEG provenance / 3× rule

All 20 JPEG scene reference files are **already committed** under the paths above. Stage 2 images were upscaled 3× from a collage crop for layout reference, **not native 3× detail**; Stage 1 JPEGs retain original cropped dimensions. Concept JPEGs are **not production textures**. Any subsequently generated *in-game raster* must be generated at a true native 3× of its actual UI display dimensions; retain editable/original source and ship appropriate optimized runtime size, as already mandated by `CLAUDE.md`. If the artist cannot replicate intricate AI details with reasonable WebGL assets, document the unachievable parts and present the closest real-time alternative for approval rather than inventing completion.

## Suggested signoff template (copy per map)

```md
# <track-id> real-WebGL visual review
Reference ground JPEG: ...
Reference aerial JPEG: ...
CourseGraph / test commit SHA: ...
Viewport, quality tier, seed, weather and camera pose: ...
Screenshot 01 / screenshot 02: ...
Signature landmark + silhouette: PASS | FAIL | APPROVED DEVIATION — why
Road / terrain / physics truth: PASS | FAIL | APPROVED DEVIATION — why
Car scale & ground/aerial composition: PASS | FAIL | APPROVED DEVIATION — why
Weather, lighting & particles: PASS | FAIL | APPROVED DEVIATION — why
Fork, landing & checkpoint readability: PASS | FAIL | APPROVED DEVIATION — why
UI/device/tier comfort: PASS | FAIL | APPROVED DEVIATION — why
Regression / perf / CI references: ...
Overall: PENDING until all gates evidenced
```
