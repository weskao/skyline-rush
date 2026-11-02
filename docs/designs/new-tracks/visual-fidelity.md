# Skyline Rush — New Five Tracks: Visual Fidelity & One-Way Route Reference

**Status:** Committed design references, not playable tracks or production screenshots.
**Branch:** `feature/epic-multiroute-longform-tracks` (from develop).
**Confirmed topology:** **ALL FIVE ARE POINT-TO-POINT**, from one START to one DISTINCT FINISH. This is the product decision; no circuit conversion is planned for these five. Existing Harbor Circuit remains the separate lap-racing experience.

## Stage 1 animated 3D homepage — P0 before full playable tracks

**User-confirmed requirement (2026-11-03):** The five initial proposed Stage 1 Coming Soon tracks must show **real animated Three.js showrooms on the homepage**, matching existing real 3D vehicle, hover/jets, scenery depth, moving environment and camera conventions. A static JPEG hero overlay or photo plane is not acceptable. Two existing JPEG concept views per map remain **art-direction references** and compact thumbnails only.

**Binding home stage:** [Animated Three.js homepage spec](../../superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) · [six GPT scene/renderer implementation prompts](../../superpowers/prompts/2026-11-03-six-chat-home-preview-implementation.md) · [TDD execution plan](../../superpowers/plans/2026-11-03-six-chat-home-preview-integration.md). Homepage showroom **does not make the full track playable**: Coming Soon selection remains preview-only with disabled bilingual Start, and no upcoming ID enters RaceFactory or the unlock/gameplay registry.

**Separate acceptance:** 5 individually animated **true 3D** environments + 5 unique scene landmarks and ground/air branch designs, shared real player/rival models, single existing WebGL renderer/composer, reduced-motion/quality tier support, actual time-separated WebGL screenshots (desktop/phone) vs both JPEG views, old-track regression and exact-HEAD CI. **None of this is marked as verified solely by this document.**

## Reference images tracked in this branch

Each storyboard is an **original SVG with two stylized concept scenes (ground and aerial)** plus a one-way schematic. The five complementary SVG diagrams show branches and distinct start/finish gates. These files are committed, linkable, and should be compared during implementation.

| Track | Two-view concept storyboard | Topology / route reference |
| --- | --- | --- |
| 沙暴裂谷 — Dune Tempest | [Ground + Air storyboard](concept-art/dune-tempest-point-to-point-storyboard.svg) | [Open route schematic](route-schematics/dune-tempest.svg) |
| 雨林失落神殿 — Monsoon Ruins | [Ground + Air storyboard](concept-art/monsoon-ruins-point-to-point-storyboard.svg) | [Open route schematic](route-schematics/monsoon-ruins.svg) |
| 浮空群島 — Skyfall Archipelago | [Ground + Air storyboard](concept-art/skyfall-archipelago-point-to-point-storyboard.svg) | [Open route schematic](route-schematics/skyfall-archipelago.svg) |
| 熔火天脊 — Volcanic Crown | [Ground + Air storyboard](concept-art/volcanic-crown-point-to-point-storyboard.svg) | [Open route schematic](route-schematics/volcanic-crown.svg) |
| 霓虹暴雨都市 — Stormline Megacity | [Ground + Air storyboard](concept-art/stormline-megacity-point-to-point-storyboard.svg) | [Open route schematic](route-schematics/stormline-megacity.svg) |

> **Image provenance:** The earlier AI-generated high-detail collages `overview-01.png`, `overview-02.png`, and ten `concept-view-01.png` / `concept-view-02.png` crops are included in the ChatGPT-delivered `skyline-rush-five-tracks-concept-reference-pack.zip`. They are **NOT present in this GitHub branch** as of this commit due to binary-upload limitations. The committed vector storyboards are separate art references—not misidentified copies or screenshots of the AI-generated PNGs. If importing the ZIP later, place them under `docs/designs/new-tracks/source-concept-png/` and extend this manifest with actual GitHub paths + SHA-256 checksums after verifying files exist.

## Independent image pairs — required visual references (10 committed SVGs)

The 10 individually openable **vector** scenes below are committed in this branch, cropped without redrawing from the original five vector storyboards. **The unrelated original ChatGPT AI-generated PNGs remain separate, not committed**; refer to the [art index](README.md) and [PNG import checksums](png-source-import-manifest.md).

| Course | Ground view reference | Aerial / alternate branch reference |
| --- | --- | --- |
| 沙暴裂谷 | [Ground](concept-art/dune-tempest-ground-view.svg) | [Flight](concept-art/dune-tempest-aerial-view.svg) |
| 雨林失落神殿 | [Ground](concept-art/monsoon-ruins-ground-view.svg) | [Flight](concept-art/monsoon-ruins-aerial-view.svg) |
| 浮空群島 | [Ground](concept-art/skyfall-archipelago-ground-view.svg) | [Flight](concept-art/skyfall-archipelago-aerial-view.svg) |
| 熔火天脊 | [Ground](concept-art/volcanic-crown-ground-view.svg) | [Flight](concept-art/volcanic-crown-aerial-view.svg) |
| 霓虹暴雨都市 | [Ground](concept-art/stormline-megacity-ground-view.svg) | [Flight](concept-art/stormline-megacity-aerial-view.svg) |

Each next-stage vertical slice must save a real engine screenshot matching each of these two camera purposes (10 minimum) and record visual parity/deviation for landscape silhouette, turns and road openness, car proportion, lighting, weather/particles, and legible 3D fork/landing. A concept image is never equivalent to actual WebGL acceptance.

## JPEG high-detail source visual references — 10 actually committed files

JPEGs are the **converted original AI scene crops** saved in GitHub (different from ten standalone vector storyboard SVGs). Use both sources during real-WebGL acceptance. The original lossless PNGs and the two overview PNGs have NOT been committed, and JPEGs are not production textures.

- 沙暴裂谷: [ground JPEG](source-concept-jpeg/dune-tempest/concept-view-01.jpg), [air JPEG](source-concept-jpeg/dune-tempest/concept-view-02.jpg).
- 雨林失落神殿: [ground JPEG](source-concept-jpeg/monsoon-ruins/concept-view-01.jpg), [air JPEG](source-concept-jpeg/monsoon-ruins/concept-view-02.jpg).
- 浮空群島: [ground JPEG](source-concept-jpeg/skyfall-archipelago/concept-view-01.jpg), [air JPEG](source-concept-jpeg/skyfall-archipelago/concept-view-02.jpg).
- 熔火天脊: [ground JPEG](source-concept-jpeg/volcanic-crown/concept-view-01.jpg), [air JPEG](source-concept-jpeg/volcanic-crown/concept-view-02.jpg).
- 霓虹暴雨都市: [ground JPEG](source-concept-jpeg/stormline-megacity/concept-view-01.jpg), [air JPEG](source-concept-jpeg/stormline-megacity/concept-view-02.jpg).

**Next phase:** [Stage 2 five additional JPEG-based world concepts](stage-2/README.md) and [Stage 2 visual fidelity](stage-2/visual-fidelity.md).

## Acceptance is evidence, not resemblance by assertion

Use [the binding 10-course ground/aerial visual acceptance gate](visual-acceptance-gate.md), with **two actual JPEG references per Stage 1 map** and the companion route SVG. Do not mark a map visually accepted until real gameplay WebGL screenshots, camera/seed settings, landmark/route/lighting/particles comparisons, and six PASS/FAIL/APPROVED DEVIATION outcomes are recorded. Stage 2 has its own 10 JPEG views and shares the same gate. JPEGs are *concept art*, not real game captures or runtime textures.

## Per-track art direction and two required cameras

### 1. 沙暴裂谷 / Dune Tempest

- **Visual anchor:** 乾燥橙金沙漠／峽谷岩層／寬闊的非鋪裝路面；遠處逐步增強的沙塵牆.
- **Ground camera (view 01):** behind/above player, car clear and centered enough to see upcoming bends; must clearly show 從開放沙丘下切到峽谷的髮夾彎.
- **Aerial / split camera (view 02):** frame the second line, vertical height separation and safe return to the main route; 另一分支以跳躍越過溝壑後在安全位置匯合.
- **Atmosphere and VFX:** 傍晚側光、沙粒飄移、輪胎揚塵；暴風時至少保留下一個轉向與岔道提示.
- **Image:** [Ground concept](concept-art/dune-tempest-ground-view.svg) · [Aerial concept](concept-art/dune-tempest-aerial-view.svg) · [Combined storyboard](concept-art/dune-tempest-point-to-point-storyboard.svg) · [Open course schematic](route-schematics/dune-tempest.svg).

### 2. 雨林失落神殿 / Monsoon Ruins

- **Visual anchor:** 深綠雨林樹冠／巨大石造神殿／濕泥與積水／壯觀的瀑布.
- **Ground camera (view 01):** behind/above player, car clear and centered enough to see upcoming bends; must clearly show 泥地 S 彎穿過河谷.
- **Aerial / split camera (view 02):** frame the second line, vertical height separation and safe return to the main route; 另一分支由瀑布前方起飛，越過古橋回到地面主線.
- **Atmosphere and VFX:** 雨幕、水滴飛濺、霧氣、葉片晃動；保留前路高對比標記.
- **Image:** [Ground concept](concept-art/monsoon-ruins-ground-view.svg) · [Aerial concept](concept-art/monsoon-ruins-aerial-view.svg) · [Combined storyboard](concept-art/monsoon-ruins-point-to-point-storyboard.svg) · [Open course schematic](route-schematics/monsoon-ruins.svg).

### 3. 浮空群島 / Skyfall Archipelago

- **Visual anchor:** 白色雲海／分層浮空島嶼／巨型天空石環／懸空瀑布.
- **Ground camera (view 01):** behind/above player, car clear and centered enough to see upcoming bends; must clearly show 地面石橋經過連續回轉坡.
- **Aerial / split camera (view 02):** frame the second line, vertical height separation and safe return to the main route; 空中分支跨島飛躍後下降安全著陸平台.
- **Atmosphere and VFX:** 明亮天空、雲海深度、雲間光束；視覺預示安全著陸區與危險落差.
- **Image:** [Ground concept](concept-art/skyfall-archipelago-ground-view.svg) · [Aerial concept](concept-art/skyfall-archipelago-aerial-view.svg) · [Combined storyboard](concept-art/skyfall-archipelago-point-to-point-storyboard.svg) · [Open course schematic](route-schematics/skyfall-archipelago.svg).

### 4. 熔火天脊 / Volcanic Crown

- **Visual anchor:** 黑色玄武岩／橘紅熔岩流／大型火山口／局部冷卻碎石荒地.
- **Ground camera (view 01):** behind/above player, car clear and centered enough to see upcoming bends; must clearly show 火山口外緣經過多段寬闊髮夾彎.
- **Aerial / split camera (view 02):** frame the second line, vertical height separation and safe return to the main route; 跳躍分支跨越岩漿隙縫但不跳過檢查點.
- **Atmosphere and VFX:** 遠處噴發、火山灰與有界限的熱浪折射；熔岩光源不壓過正前方道路.
- **Image:** [Ground concept](concept-art/volcanic-crown-ground-view.svg) · [Aerial concept](concept-art/volcanic-crown-aerial-view.svg) · [Combined storyboard](concept-art/volcanic-crown-point-to-point-storyboard.svg) · [Open course schematic](route-schematics/volcanic-crown.svg).

### 5. 霓虹暴雨都市 / Stormline Megacity

- **Visual anchor:** 午夜紫藍色天際線／反光道路／霓虹立體交流道／高樓燈牌.
- **Ground camera (view 01):** behind/above player, car clear and centered enough to see upcoming bends; must clearly show 地面寬廣街道繞過交叉路口.
- **Aerial / split camera (view 02):** frame the second line, vertical height separation and safe return to the main route; 空中分支由匝道上升到高架橋再匯入.
- **Atmosphere and VFX:** 雨線、積水反光、發光路標和安全的閃電提示；廣告與 HUD 不遮蔽主要行駛視線.
- **Image:** [Ground concept](concept-art/stormline-megacity-ground-view.svg) · [Aerial concept](concept-art/stormline-megacity-aerial-view.svg) · [Combined storyboard](concept-art/stormline-megacity-point-to-point-storyboard.svg) · [Open course schematic](route-schematics/stormline-megacity.svg).


## Implementation rules that take priority over illustrative art

1. **Topology:** one-way point-to-point, not 1/3/5 laps. Start != Finish in world-space position and route node identity. Route branches may rejoin, but no loop is needed; checkpoint sequence and flight envelope prevent unauthorized finish shortcuts.
2. **Avoid literal tracing of AI map art:** the first collages were moodboards and may depict visual loops. Actual `CourseGraph` owns world-space path, AI routes, route lengths, player progress, checkpoints, minimap and collision.
3. **Camera parity:** compare actual ground and flight WebGL screenshots against corresponding concept references side-by-side, including player scale, terrain silhouettes, color temperature, weather depth, branch visibility, landmarks and road/camera obstruction.
4. **Visual acceptance matrix:** all five tracks × 2 views × 1440×900 desktop and 390×844 phone; at least 320×740, 844×390 and foldable checks for layout. en + zh-TW, Low/Medium/High, Reduced Motion; do not mark PASS without inspected rendered output.
5. **Visual performance:** preserve mid-tier frame-time and draw-call budgets with seeded chunked particles, pooled geometry, weather quality degradation and shader warmup. Don't shrink play space or hide collisions on Low.
6. **Driving freedom:** visible non-road surfaces must be traversable where authored; no mandatory lane markings in natural biomes, honest rock/terrain contacts, broad flight corridors and fair recovery on mistakes.
7. **Art provenance:** only original/rights-cleared imagery, no asset borrowing from inspirational games. Any later AI-generated **raster** textures for in-game display must retain genuine source resolution 3× the in-game display size; design reference SVGs are independent scalable vectors.
8. **Review notation:** each scene record reference, actual screenshot, viewport, quality tier, measured FPS/frame p50/p95/calls/triangles, and status PASS / FAIL / APPROVED DEVIATION. A green unit test alone is not proof of matching visual intent.

## Acceptance checklist for the later implementation phase

- [ ] 沙暴裂谷: ground concept compared to actual WebGL; aerial concept compared to actual WebGL; valid distinct START / FINISH; at least 3 meaningful route choices and 2 major hairpins; performance and reduced-motion verified.
- [ ] 雨林失落神殿: ground concept compared to actual WebGL; aerial concept compared to actual WebGL; valid distinct START / FINISH; at least 3 meaningful route choices and 2 major hairpins; performance and reduced-motion verified.
- [ ] 浮空群島: ground concept compared to actual WebGL; aerial concept compared to actual WebGL; valid distinct START / FINISH; at least 3 meaningful route choices and 2 major hairpins; performance and reduced-motion verified.
- [ ] 熔火天脊: ground concept compared to actual WebGL; aerial concept compared to actual WebGL; valid distinct START / FINISH; at least 3 meaningful route choices and 2 major hairpins; performance and reduced-motion verified.
- [ ] 霓虹暴雨都市: ground concept compared to actual WebGL; aerial concept compared to actual WebGL; valid distinct START / FINISH; at least 3 meaningful route choices and 2 major hairpins; performance and reduced-motion verified.
- [ ] User reviews the five actual gameplay scenes, and any approved deviations are written down.
- [ ] Existing ten sprint maps and current Harbor Circuit remain unaffected by new graph/terrain code.
- [ ] Exact-HEAD full CI and manual device signoff documented before merge.

**No game implementation, preview rendering verification, or CI claim is made by this planning-only reference document.**
