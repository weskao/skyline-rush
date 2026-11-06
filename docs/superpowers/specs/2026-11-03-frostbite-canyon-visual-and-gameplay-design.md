# Frostbite Canyon / 極地冰原峽谷 — Image-Driven 3D Scene and Playable Course Design

**Date:** 2026-11-03
**Status:** DESIGN / IMPLEMENTATION BRIEF ONLY — no playable track, homepage scene, true 3× asset, runtime screenshot, or CI acceptance is claimed by this document.
**Repository:** weskao/skyline-rush
**Planning branch:** `feature/epic-multiroute-longform-tracks`
**Map ID:** `frostbite-canyon`
**Position:** Track 06 / Stage 2 map 1 of 5; distinct from the earlier removed Glacier Serpentine proposal.
**Proposed implementation branch:** `feature/playable-frostbite-canyon`, only if it does not already exist when coding starts. Do not create/reset it while merely reviewing these documents.
**Upstream contracts:** `CLAUDE.md`, `AGENTS.md`, `docs/regression-first-workflow.md`, `docs/superpowers/specs/2026-11-03-playable-coursegraph-contract.md`, `docs/superpowers/specs/2026-11-02-stage2-five-longform-tracks-design.md`, `docs/designs/new-tracks/visual-acceptance-gate.md` and relevant `.claude/rules/`.

## 1. Ground truth / exact reference files

All paths below already exist on the planning branch.

| Role | Canonical source |
| --- | --- |
| 01 ground camera | `docs/designs/new-tracks/stage-2/source-concept-jpeg/frostbite-canyon/concept-view-01.jpg` |
| 02 aerial/alternate route | `docs/designs/new-tracks/stage-2/source-concept-jpeg/frostbite-canyon/concept-view-02.jpg` |
| Route intent, NOT physical scale | `docs/designs/new-tracks/stage-2/route-schematics/frostbite-canyon.svg` |
| Design index | `docs/designs/new-tracks/stage-2/README.md` |
| Stage 2 structured intent | `docs/designs/new-tracks/stage-2/concept-manifest.json` |
| Quality and deviations | `docs/designs/new-tracks/stage-2/visual-fidelity.md` |

**Provenance warning:** the two Stage 2 JPEG files are AI-art collage crops, resampled 3× for viewing; interpolation did not create original high-frequency detail. They include remnants of titles/other panels at their outer margins. Do NOT place these entire JPEGs in a 3D skybox, photo plane, flat painted road, or screenshot masquerading as game output. Do NOT treat them as approved native 3× production textures. The exact pixel layout is art direction, not a verified source of physics scale.

## 2. Direct visual read of the actual JPEGs (2026-11-03)

### 01: ground driving hero composition

- **Shape and perspective:** a cold, broad S-shaped / gently right-bending ice road begins across the foreground and narrows into a mid-frame vanishing point. Snow shoulders and canyon walls physically contain the vista without requiring invisible walls.
- **Driver placement:** low, wide, glossy charcoal/black sports car is seen in three-quarter rear orientation in the lower-left foreground; red rear lamps and blue/cyan thruster-like light are noticeable. Keep the current real Roadster model/material/paint and aero system, not a photographic car cutout.
- **Left midground:** several large, translucent aqua/cyan pointed crystalline ice spires stand in a row by a snowy berm, with smaller fragments beneath.
- **Left distance:** sheer dark navy glacier/rock face coated in snow and blue ice; near-top cliff silhouette holds the horizon.
- **Right midground:** monumental natural ice/rock arch spans the outside of the bend, with pointed crystal spires, pale ice shelves and exposed dark stone. Arch and crystals must be real mesh geometry with depth and parallax.
- **Sky and mood:** turquoise-cyan curtains interleaved with purple/magenta aurora above distant snowy peaks. Cold blue bounce light on ice, restrained silvery highlights and blue atmospheric perspective. Preserve visible bend and road edges despite fog.
- **Do NOT reproduce:** the cropped graphic headline at the top, non-game text in the source image, or perspective exaggeration that would make roadway/vehicle scale physically impossible.

### 02: aerial ice-bridge and chasm composition

- **Dominant silhouette:** a long, high, diagonal bridge/viaduct crosses a deep glacial crevasse from the lower-right foreground toward upper-left/upper-center. It has a visibly drivable deck, dark posts/edge rails and small warm contrasting safety markers.
- **Vertical layering:** massive snow-coated blue ice cliffs and dark stone buttresses descend beneath the bridge. Distinct road elevations, shadowed void, bluish atmospheric depth and hanging ice formations are visible.
- **Approach geometry:** the far bank connects to a visibly bending upper road and a recognizable continuing path; the bridge is not a decorative isolated span.
- **Route readability:** scene must show the safe bridge entry, traversable surface, landing/merging target and a lower ground-only alternative; no arbitrary mid-air spawn or invisible collision rail.
- **Lighting:** ice cyan / deep cobalt with bright frosted snow edges, local warm/orange edge warnings, cold haze in the chasm. Keep specular highlights and particle density below the threshold that hides the next turn.
- **No unsupported claims:** source 02 illustrates an airborne *view/route*, not proof that the vehicle freely flies above every segment or that a literal rail bridge and an aerial jump must overlap at the exact same pixel position. Author feasible physical transitions.

### Visual anchor checklist (at least 3 anchors must be visible per locked camera)

| Criterion | Ground 01 | Aerial 02 |
| --- | --- | --- |
| Dominant landmark | Ice arch + cyan monolith cluster | Long elevated bridge over blue glacial fracture |
| Mid-distance geometry | Receding curved frozen road; flanking vertical walls | Switchback approach, bridge landing, distinct lower route |
| Local signature | Cyan translucency, snowcap layering, vivid two-tone aurora | Frosted deck/rails, crevasse depth, cold mist |
| Vehicle/camera | Actual car low foreground, road visible ahead | Flight/high-layer camera with unambiguous road landing |

These observations are **visually grounded direction**, not measured world coordinates. Author proportions in-game and record any deviations in evidence.

## 3. Core identity and scope

- **Name:** 極地冰原峽谷 / Frostbite Canyon; `id = frostbite-canyon`.
- **Type:** one legal **point-to-point** course, START ≠ FINISH in both graph ID and world position; NO laps and no circuit finish condition.
- **Main safe route:** design target **13.8 km** of measured arc-length (review tolerance: ±2% after blockout, adjust to exactly approved target before release). This is not straight-line distance and not counting alternate routes additively.
- **Race-time design hypothesis:** 3:20–4:40; verify actual 20+ valid finishes per supported difficulty and tune if necessary. Do not claim measured duration until data exists.
- **Mandatory layout:** ≥2 physically distinct hairpin bends, ≥3 legitimate split/merge decisions, an all-ground navigable START→FINISH route, at least one optional bridge / elevated flight shortcut, readable checkpoints after branch merges and safe recovery after failed jumps.
- **Differentiation:** NOT another Alpine Rail Pass mountain train route or Aurora Pass glowing snowy road. The hook is **fractured ice-river canyon + open frozen basins + enormous span across a vertical rift + cyan crystalline landmarks**, backed by a contrasting aurora sky.
- **No speculative mechanics:** slippery ice traction, breaking bridge, crosswind or avalanche-driven damage are OPTIONAL gameplay proposals that require separate signed-off deterministic tests; the art/weather may be visual-only initially.
- **All new visuals are original or appropriately licensed; do not copy another game's copyrighted level meshes or UI.**

## 4. Authored route beats — 13.8 km design target

These are *proposed* authoring segments, not coordinates extracted from the JPEG; curve/spline length must be measured through `routeLength` and tuned in blockout.

| Ground main-route progress | Biome and driving pattern | Major art / gameplay set piece | Must be true |
| --- | --- | --- | --- |
| 0.0–2.0 km | Frozen basin start, wide packed snow, broad rising S bend | Cyan crystal sentinels, preview View 01 car road | Legal ground traction/collision, visible approach |
| 2.0–4.2 km | Ice-wall corridor, first major U-turn | Glacier Gate arch and F1 ridge-snow vs safe valley floor | Real diverging edges with merge, not lane offset |
| 4.2–6.6 km | Cracked riverbed and snowy terrace, second hairpin | Deep blue open fissure, F2 elevated shelf vs low sheltered canyon | Ground-only route remains safe; checkpoint after merge |
| 6.6–9.0 km | Rift Spine crossing, dramatic height difference | Hero View 02 gigantic frosted bridge; flight launch or elevated shelf | Physically separate ground bypass, valid bridge contact and recovery |
| 9.0–11.4 km | Aurora observatory valley, long flowing curve | Aurora Crown skyline, F3 short elevated ice span vs winding lower basin | Safe branch choice, consistent graph progress and AI |
| 11.4–13.8 km | Glacial outlet and narrowing final canyon | Final luminous ice pillars and distinct FINISH landmark | Ordered gate validation and one finish; no teleport |

Suggested splits: F1 at ~3.0 km, F2 at ~5.1 km, F3 at ~10.4 km (refine on graph). At least one of F2 or F3 must connect to the visually dominant ice bridge and a safe landing approach. Each path uses graph nodes and connected edges; checkpoints must be mandatory on **all** routes, with no accidental bypass via shortcut/altitude or visible road crossing.

### Spatial, road and collision guidelines

- Build centerline in **world XYZ metres, Y up**, with true U-turns that reverse horizontal heading and road layers that may overlap in top-down space but stay collision-isolated.
- Wide snow basin may use an authored off-road drivable corridor (project Stage 2 brief suggests roughly 100–350 m where safe); narrower bridge and cliff edges get **visible** rails. No invisible ±10.2 m classic-road clamp for this opt-in course.
- Use existing `CourseGraph` / `validateCourseGraph` / `sampleRoute` / `routeLength` / `advanceRouteProgress`. New placement data can be adapted without cloning the engine. Current graph helpers are **baseline only** and are not yet connected to `game.js`, `RaceFactory`, collision, AI or save.
- Ground snow, bridge deck, and frosted edge mesh must agree with physical road frame and vehicle wheels. Avoid the classic-route scalar distance as an authority for these forks.
- At each higher/lower road crossing: 8-car AI, physics and checkpoints use the active graph edge and altitude, not 2D proximity. No cross-layer phantom collisions.
- Air jump has an authored launch envelope, readable destination and permissible landing edge; failed attempts return to the last **validated** safe checkpoint, never gain progress. The ground route always finishes without NITRO or FLY.

## 5. Art construction and material directions

**Geometry / composition**
1. Sculpt layered glacial sidewalls and river crevasse as multiple depth bands (dark bedrock + translucent blue ice crust + white snow caps) with collision-correct boundaries.
2. Create an iconic asymmetrical arched glacier gateway on the outside of the View 01 bend, and groups of faceted translucent cyan crystals of varying height on both sides with restrained emissive cores.
3. Build the View 02 high bridge with a detailed edge profile, snow accumulation, support geometry or plausible glacial abutments, readable rails, safe deck width and separate exposed lower trail. Bridge must cast sensible shadow and connect to both approaches.
4. Model drivable packed snow / hard ice, wind-swept snowbank bulges, frozen ripple bands and localized black rock exposure. Road is not required to have painted lanes, but the turn corridor must remain identifiable.
5. Aurora should have layered animated sky geometry or a bounded efficient procedural shader in the **existing sky/scene** pipeline. No full-frame looping static image claiming to be 3D. Local crystals and atmospheric snow give parallax.
6. Group/cull/instance repeated fragments and fence posts; reserve distinct meshes/materials for major arch, landmark crystals, bridge and high-value snow surfaces. No unmeasured heavy transparent overdraw.

**Proposed visual palette (illustrative, not pixel-exact sampling):** deep midnight navy / cobalt cliffs, ice cyan + aqua rimlight, silver-blue snow, purple-magenta aurora accents, limited orange bridge hazard markers, real red car tail lamps and blue-white jet energy.

**PBR material guidelines:** vary rough snow from low specular/high roughness, packed ice moderately reflective with directional normal detail, and crystal facets with controlled transmission/opacity and bounded emissive. Test transparency sorting on mobile and retain road visibility with AA/postprocess settings already in use.

**Weather:** seeded cold haze, snowfall/ice powder near wheels, occasional gust bands far from the racing decision corridor, frosty air particles; no stochastic seizure-like aurora flashing or forced white-out across hairpin approaches. Low / Medium / High vary rendering cost, not gameplay geometry/visibility truth. Reduced Motion removes large ambient motion while preserving static directional cues.

## 6. Two product deliverables — cover AND real-time 3D

### A. Cover thumbnail / marketing poster

- Art-direction reference = **View 01**; camera three-quarter rear, dark Roadster near lower-left, foreground curved frozen road, cyan crystal cluster left, gigantic arched glacier right, distant snowy towers and turquoise/purple aurora above.
- Preserve safe areas for the existing home card overlay; **do not bake titles, fake Start buttons, watermark or game UI into the image**. Ensure car and main turn remain visible at desktop/mobile crop sizes.
- Prefer **capturing an authored high-resolution real Three.js scene with locked art direction** for scene-cover parity; if marketing polish requires separate original 2D art, record that it is artwork and validate its landmarks against the actual render.
- Check the real CSS display width/height in this repository, then render/generate at **native 3× the *displayed* dimensions** (not JPEG Lanczos upscaling). Store source where project raster rules direct; optimize 1× runtime output / responsive sources while preserving sharpness and no clipping.
- Inspect display at desktop, 390×844 portrait, 320×740 compact, landscape. Provide a non-WebGL fallback cover only for explicit context failure, never overlay it while live WebGL runs.

### B. Actual animated homepage preview

- Reuse **one** existing `src/world.js` renderer, camera, composer, animation loop and `src/upcoming-showcase.ts` scene-host lifecycle; `src/upcoming-scenes/frostbite-canyon.ts` should export a typed, time-driven environment factory consistent with Stage 1 scene modules.
- Render physical snow road, high ice bridge, true multi-depth glacial walls, cyan crystal geometry, moving aurora, sparse seeded cold particles and the **real** player car + rivals. No second canvas, false screenshot plane, fake Race object or endless new animation loop.
- Grounded AIRFLOW-on state correctly rests on real road; hover mode uses shared jet effects. Preserve familiar **50° FOV**, player scale, 3/4 rear composition and camera modes. Use route-frame basis for camera placement if curvature/elevation demands it.
- Use deterministic home preview snapshots: P01 curve/arch/car/aurora; P02 bridge/chasm/branch/landing. At least two time-separated frames must visibly differ for animated aurora or particles; Reduced Motion stabilizes.
- **Stage 2 is currently hidden from the Stage 1-only homepage**: implement as an isolated, gated preview/thumbnail first. Do not silently add Frostbite to the current Stage 1 five-item `UPCOMING_TRACKS`, unlock history or `RACE_TRACKS` before its intended release/explicit authorization. If/when exposing preview selection, keep Start disabled and bilingual `COMING SOON / 即將推出` until the full playable gate succeeds.

## 7. Acceptance and proof — no screenshot-only completion

| Gate | Evidence required |
| --- | --- |
| Topology | Canonical graph validation, distinct START/FINISH, all-ground completion, ≥2 hairpins, ≥3 meaningful forks, measured arc length |
| Physics | Stable wheel/road contact; 30/60/120 Hz consistency, real ice-bridge surface, correct road/terrain collision |
| Branches | Real split/merge, safe launch/landing, recovery, no skipped checkpoint or wrong-height acceptance |
| AI & persistence | 8-car choices, fair standings, collision-layer separation, Ghost/topology version and old save parity |
| Cover | New native-resolution export sized to actual display; no collage text; approved art-vs-WebGL correspondence |
| Home | Existing WebGL renderer, true moving 3D road/car/landmarks, quality/reduced-motion and clean disposal |
| Visual 01 | Real app captures of car, bend, arch, crystals, cliffs, aurora; documented comparison vs 01 JPEG |
| Visual 02 | Real app captures of elevated bridge, crossing, glacial depths, approach and safe merge; comparison vs 02 JPEG |
| Device QA | ≥1440×900 and 390×844 Medium ground/air captures; 844×390 and 320×740 overlap sanity; desktop/touch |
| Performance | Recorded p50/p95 frame time, draw calls, triangles, GPU memory where accessible; no unjustified silent quality downgrade |
| Full gates | RED→GREEN tests, `npm test`, `npm run build`, `make verify`, exact-HEAD full CI, documented human visual signoff |
| Duration | 20+ recorded valid finishes; 3–5-minute target adjusted from actual play sessions rather than assumed from 13.8 km |

Comparison uses the six categories in `docs/designs/new-tracks/visual-acceptance-gate.md` with **PASS / FAIL / APPROVED DEVIATION** per category. Store actual camera/route edge ID, localS, vehicle pose, FOV, weather seed, quality, viewport and commit SHA with every capture; never invent a similarity percentage. A design-ready document is not a gameplay PASS.

## 8. Out-of-scope / safe rollout

- Stage 1's five concurrent playable/source branches and home-art branches are separate workstreams; do not modify them from Frostbite implementation.
- Do not replace the ten existing sprint maps, Harbor Circuit, their save data or camera. Do not rewrite all maps to CourseGraph at once.
- Do not promise ice-fracture destruction, actual frozen-water buoyancy, dynamic terrain damage, real avalanche physics or new monetization.
- No PR, deployment, force push or merge to `develop` / `main` without explicit authorization.
- Begin production only after the shared CourseGraph runtime integration is verified sufficiently for an isolated Stage 2 playable slice, otherwise build and test the Frostbite graph/showroom in isolation and leave race activation gated.

**Companion execution plan:** `docs/superpowers/plans/2026-11-03-frostbite-canyon-implementation.md`  
**Copy-paste agent dispatch:** `docs/superpowers/prompts/2026-11-03-frostbite-canyon-implementation-dispatch.md`
