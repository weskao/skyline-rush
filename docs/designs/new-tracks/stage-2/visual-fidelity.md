# Stage 2 — Visual Fidelity & 10 JPEG Evidence

**All five are point-to-point, not circuit laps.** This is a planning-only art reference. Ten existing JPEG files under `source-concept-jpeg/` have two camera roles (01 ground, 02 aerial branch). Five independent `route-schematics/*.svg` show distinct START and FINISH.

## Per-course matching criteria

### 6 極地冰原峽谷 / Frostbite Canyon

- **01 Ground camera:** [reference JPEG](source-concept-jpeg/frostbite-canyon/concept-view-01.jpg). Demonstrate 冰河裂隙、露天峽谷、可駕駛雪原; visible next bend, centered car, and natural course boundaries.
- **02 Aerial / alternative branch:** [reference JPEG](source-concept-jpeg/frostbite-canyon/concept-view-02.jpg). Frame both the aerial branch and its safe route back to the main path; avoid unsupported portal-teleports.
- **Lighting/particles:** ice powder, cold fog, snow gusts.
- **Fidelity risk:** 以斷裂冰谷和冰橋交錯為特色，避免重複現有高山鐵道／極光道路.
- **Topology:** [Point-to-point schematic](route-schematics/frostbite-canyon.svg). START must not coincide with FINISH, no lap count.
- **Acceptance pending:** record actual desktop 1440×900 and mobile 390×844 real-WebGL captures for both camera roles. Evaluate artistic silhouette, vehicle occupancy, weather visibility, branch signage, p50/p95, GPU budgets and reduced-motion.


### 7 深海遺跡城 / Abyssal Ruins

- **01 Ground camera:** [reference JPEG](source-concept-jpeg/abyssal-ruins/concept-view-01.jpg). Demonstrate 透明海底道路、珊瑚峽谷、沉沒古都; visible next bend, centered car, and natural course boundaries.
- **02 Aerial / alternative branch:** [reference JPEG](source-concept-jpeg/abyssal-ruins/concept-view-02.jpg). Frame both the aerial branch and its safe route back to the main path; avoid unsupported portal-teleports.
- **Lighting/particles:** caustics, bubbles, distant fish schools.
- **Fidelity risk:** 先實作視覺化深海環境，不擴張至真正潛水或水壓物理.
- **Topology:** [Point-to-point schematic](route-schematics/abyssal-ruins.svg). START must not coincide with FINISH, no lap count.
- **Acceptance pending:** record actual desktop 1440×900 and mobile 390×844 real-WebGL captures for both camera roles. Evaluate artistic silhouette, vehicle occupancy, weather visibility, branch signage, p50/p95, GPU budgets and reduced-motion.


### 8 風之高原 / Windspire Highlands

- **01 Ground camera:** [reference JPEG](source-concept-jpeg/windspire-highlands/concept-view-01.jpg). Demonstrate 開闊草坡、自然無標線路面、石橋與風車; visible next bend, centered car, and natural course boundaries.
- **02 Aerial / alternative branch:** [reference JPEG](source-concept-jpeg/windspire-highlands/concept-view-02.jpg). Frame both the aerial branch and its safe route back to the main path; avoid unsupported portal-teleports.
- **Lighting/particles:** wind gusts, grass debris, cloud shadows.
- **Fidelity risk:** 地面風路安全可通過，風場機制必須預告並公平平衡.
- **Topology:** [Point-to-point schematic](route-schematics/windspire-highlands.svg). START must not coincide with FINISH, no lap count.
- **Acceptance pending:** record actual desktop 1440×900 and mobile 390×844 real-WebGL captures for both camera roles. Evaluate artistic silhouette, vehicle occupancy, weather visibility, branch signage, p50/p95, GPU budgets and reduced-motion.


### 9 水晶星塵谷 / Crystal Stardust Valley

- **01 Ground camera:** [reference JPEG](source-concept-jpeg/crystal-stardust-valley/concept-view-01.jpg). Demonstrate 紫藍晶洞、稜鏡岩柱、晶橋、自然谷底彎道; visible next bend, centered car, and natural course boundaries.
- **02 Aerial / alternative branch:** [reference JPEG](source-concept-jpeg/crystal-stardust-valley/concept-view-02.jpg). Frame both the aerial branch and its safe route back to the main path; avoid unsupported portal-teleports.
- **Lighting/particles:** glowing dust, refracted beams, soft fog.
- **Fidelity risk:** 強調明亮晶體但不得以強光、反射或大量 Bloom 遮擋彎道.
- **Topology:** [Point-to-point schematic](route-schematics/crystal-stardust-valley.svg). START must not coincide with FINISH, no lap count.
- **Acceptance pending:** record actual desktop 1440×900 and mobile 390×844 real-WebGL captures for both camera roles. Evaluate artistic silhouette, vehicle occupancy, weather visibility, branch signage, p50/p95, GPU budgets and reduced-motion.


### 10 時空斷層 / Chrono Rift

- **01 Ground camera:** [reference JPEG](source-concept-jpeg/chrono-rift/concept-view-01.jpg). Demonstrate 斷裂空中遺跡、巨型時空環、石橋、上下層支路; visible next bend, centered car, and natural course boundaries.
- **02 Aerial / alternative branch:** [reference JPEG](source-concept-jpeg/chrono-rift/concept-view-02.jpg). Frame both the aerial branch and its safe route back to the main path; avoid unsupported portal-teleports.
- **Lighting/particles:** temporal afterimages, aurora-like clouds, portal particles.
- **Fidelity risk:** 時間環是視覺導引，不實作真正時間倒流或傳送作弊.
- **Topology:** [Point-to-point schematic](route-schematics/chrono-rift.svg). START must not coincide with FINISH, no lap count.
- **Acceptance pending:** record actual desktop 1440×900 and mobile 390×844 real-WebGL captures for both camera roles. Evaluate artistic silhouette, vehicle occupancy, weather visibility, branch signage, p50/p95, GPU budgets and reduced-motion.


## Global acceptance (not yet executed)

- Camera comparisons at Low/Medium/High, mobile portrait/landscape and reduced motion. Store actual WebGL captures separately under an evidence folder after implementation, never substitute these JPEGs.
- Natural drivable terrain and physical geometry must agree; test collision with placed props, safe ground-route availability, flight landing zones and no wrong-elevation checkpoint credits.
- The 10 JPEGs are derived from one composite art sheet and 3× **resampled for presentation only**; they do NOT contain genuinely 3× source painting detail. Require new high-resolution originals before game texture publication.
- TDD RED→GREEN for graph, AI route choice, 30/60/120 Hz road and flight contact, weather seed determinism, map/ghost progression and accessibility.
