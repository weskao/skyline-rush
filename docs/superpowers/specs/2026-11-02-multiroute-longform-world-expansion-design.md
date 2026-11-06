# Skyline Rush — Multi-route Long-form World Expansion (Planning Spec)

**Status:** PROPOSAL ONLY — design and code-audit findings, not implemented or playtested.
**Date:** 2026-11-02
**Source branch:** `develop` @ `12264f74f0f6452347d0183937391da620d10343`
**Planning branch:** `feature/epic-multiroute-longform-tracks`
**Goal:** Five original, visually distinct 3–5 minute point-to-point courses featuring real bends/hairpins, ground/air route forks, meaningful shortcuts, natural open terrain, quality-tiered weather, set pieces, and space beyond a fixed road rail.
**Non-goals:** replacing existing ten sprint courses, changing current physics across old tracks without opt-in, copying protected level artwork, making all race modes immediately support an open world, modifying production code in the planning branch.

## Stage 1 homepage first: LIVE Three.js showroom (not a JPEG mockup)

**Dependency added 2026-11-03:** Implement five future-map selectable yet unplayable **real-time 3D** homepage showrooms first. Each must use the existing Three.js renderer, live car/rivals/jet animations, scene-specific animated weather and recognizable true 3D ground/air branches; the original concept JPEGs are visual references, not an accepted static replacement. See [binding showcase spec](2026-11-03-stage1-animated-3d-home-showcase-design.md), [six GPT prompts](../prompts/2026-11-03-six-chat-home-preview-implementation.md) and [home implementation plan](../plans/2026-11-03-six-chat-home-preview-integration.md). This changes implementation order, **not** the full future 3–5 minute track goals; no new race is playable at showcase stage.

## Research and references (design ideas only, no third-party game assets)

| Reference | Transferable idea | Source |
| --- | --- | --- |
| Forza Horizon 5 | distinct biomes; local dust and tropical storms; wide nature trails, switchbacks | https://forza.net/news/exploring-forza-horizon-5-biomes-and-seasons ; https://forza.net/news/forza-horizon-5-road-to-mexico-july-update |
| Trackmania | readable hairpins/ramps with distinct surfaces and deliberate route pacing | https://www.ubisoft.com/en-us/games/trackmania ; https://news.ubisoft.com/en-us/article/594bGavwNc49iz26U5OzVY/trackmania-out-now |
| MotorStorm Pacific Rift | alternate routes over mud/rock/forest at different vertical heights and risk profiles | https://games.kikizo.com/features/motorstorm-pacific-rift-interview-p3.asp |
| Asphalt Legends Unite | spectacular aerial set-pieces, ramps and nitro-driven pace | https://asphaltlegendsunite.com/ |
| Need for Speed Unbound | stylized, event-driven expressive VFX layered over readable driving | https://www.ea.com/en/games/need-for-speed/need-for-speed-unbound/features |

## Code audit: constraints of the current develop

- `src/race-tracks.ts` holds 10 sprint routes, 4.0–8.0 km (plus separate 2.0 km harbor circuit), and linear `sections` with a narrow flight shortcut corridor.
- `src/track-paths.ts`: `trackPoint(trackId, distance)`, `trackFrame`, `trackLocalPosition` map **one progress scalar into one 3D centreline**. Their `z=-distance` profiles and monotonic/schematically fit minimaps cannot encode switchbacks, route forks, or converging road segments without a new graph model.
- `src/game.js`: `ROAD_LIMIT = 10.2`, 4 lane centres `[-7.5,-2.5,2.5,7.5]`; player lateral x is clamped to +/-10.2 even while airborne. A current 'shortcut' is an offset-and-altitude corridor on the same distance axis, not a physically independent alternate route. Player flight altitude is clamped to 12m; flight and landing are relative to the road.
- `src/world.js` and `src/world-tour-scene.js`: road ribbon, rail meshes, pooled scenery, segment-aware chunks and existing postprocessing. Geometry+physics+pickups are bound to the same canonical centreline. `src/route-map.ts` produces one SVG polyline; driver markers are distance based.
- `src/race-objectives.ts` ends standard point-to-point heats when `player.distance >= race.length`; standings, AI, ghost, storage and replay assume this monotonic scalar. Existing `src/race-session.ts` already has presentation presets (rain/fog/snow/aurora) and `src/race-visuals.ts` has sky/fog and limited weather particles plus Aurora blizzard. Expand this instead of parallel weather toggles.
- `.claude/rules/vehicle-road-stability.md`, `.claude/rules/world-tour.md`, `docs/classic-road-minimap.md` and `CLAUDE.md` require one geometry/physics frame, no invisible collision, old-track parity, Low/Medium/High + Reduced Motion, deterministic TDD, real WebGL QA and exact-HEAD CI.
- Current weather presets are principally visual and do not imply verified wet traction. Distinguish proposed traction gameplay from implemented weather effects.

## Architecture decision: additive, opt-in graph route system

**Rejected:** create each new course with a bigger sine wave or fake 'shortcuts' on the same `distance`. This cannot represent genuine hairpins, loops, flyovers or off-road forks.
**Rejected:** full unrestricted open-world sandbox and an entirely new physics engine. Too risky/costly for the existing browser-first racer.
**Chosen:** opt-in **authored route graph + local open-terrain volumes**, with shared world path sampling. Legacy maps remain on original centreline adapters.

1. **Topology**: immutable `CourseGraph` with typed `Node` (start, split, merge, checkpoint, finish), `Edge` (terrain surface, Bezier/Catmull-Rom controls, width/corridor, vertical layer, allowed vehicle modes, landing envelope, biome and weather zones), `OffroadZone` and `RecoveryVolume`. Validate reachable finish, acyclicity for sprint, no one-way dead ends, all checkpoint alternatives, joins' tangent continuity. Store stable graph version with track identity.
2. **Frame**: `sampleRoute(edgeId, localS)` returns point/forward/right/up and curvature; unify road, car pose, collision, pickups, AI and VFX. Use arc-length lookup tables for corner fidelity and constant-speed parameterization. Use a true 3D orientation and banking; keep old adapter unchanged.
3. **World pose and progress are different**: each vehicle keeps `edgeId + localS + lateral + altitude`; a separate monotonic `routeProgress`/checkpoints reports time, relative rank, minimap and finish. Route progress derives from validated signed gate crossings and canonical checkpoint anchors, not Euclidean distance or shortcut length alone. Physically nearby cars on disconnected edges must not collide, draft or be ranked as side-by-side. At merges, ensure stable edge transitions and fair standings independent of shortcut exploit.
4. **Open boundaries**: opt-in wide surfaces and terrain, e.g., racing ribbons 24–70 m wide with adjacent permitted off-road exploration 100–350 m in scenic areas; no artificial roadside clamping while flying. Outside legal race terrain, apply terrain contacts, readable natural obstacles and recoverable out-of-bounds with warning and safe reset. Preserve real guardrails where cliffs/bridges require safety. Prevent flying across the map directly to finish: required ordered checkpoint volumes, altitude bands and legal approach directions; avoid punishing ordinary detours.
5. **Branching**: two or more physically distinct edges with comparable risk/time; ground hairpin (safe/slower) vs jump-to-sky bridge (fast/risky); separate AI policies, non-teleport merge, aircraft fuel/landing zones. Minimap distinguishes known selectable forks but **secret shortcuts are hidden until discovered**, preserving the project's spoiler policy. Ahead signage, audio/text cues and environmental landmarks, never HUD-centre obstruction.
6. **Rendering**: streamed chunks keyed by graph edge + stable seed + biome and windowed by position/camera, not every 18 km instantiated at once. Cull unseen branch interiors and distant props; use instancing/batching for dust, foliage, rocks and repeated lamps. Landscape is mesh terrain, shoreline, ravines or dunes, **not necessarily paved**; road lines/rails optional and surface material is physically and visually distinct.
7. **Weather**: reuse visual preset and render quality single source of truth. Authored local `WeatherZone` (dry→gust→sandwall, drizzle→downpour, lightning, wet spray, falling snow, ash). Seed every event and particle stream; visibility and audio cue must leave a readable decision corridor and safe reaction distance. Wet traction / mud drag / crosswind mechanics are separate opt-in, balance-tested gameplay flags—not assumed from sky visuals. Low has tiny particle budget and no expensive full-screen passes; Medium localized GPU instancing; High richer but bounded; Reduced Motion overrides all tiers, no flash-only cues.
8. **Modes / persistence**: first prototype in new point-to-point mode only; opt in Cup/Career/Daily after AI, item economy and results tests. Ghost replay, best-time, record layout and cloud rules use a new topology+weather+route version, retaining legacy history. Handle race suspend/resume, rivals at splits, landing and fly/drive transitions.
9. **Camera/minimap/HUD**: variable camera lookahead based on curvature, hairpin road-preview, arrow signage and split warnings, aerial route arrows using world-space frames; no fake direction changes, flight freedom camera reset, height-aware 2-layer minimap. Weather never buries the turn entry or route selection. Support desktop/mobile/touch, en/zh-TW and foldable safe areas.

## Five proposed tracks (target duration is design hypothesis, not measured)

Estimated time based on *effective* average speed including hairpins, climbs, recovery, stunts and forks; length alone does not guarantee 3–5 minutes. Instrument 20+ completed runs/track across difficulty/modes and revise geometry against observed median.

| Priority | ID / name | Main-route target | Target typical finish | Defining geometry | Forks / weather / showcase |
| --- | --- | --- | --- | --- | --- |
| P1 | `dune-tempest` / 沙暴裂谷 Dune Tempest | 13.5 km | 3:20–4:40 | 4 desert U-turns, sand bowls, canyon switchbacks, no painted road | dune crest jump vs winding wadi; moving localized sandstorm, dust rooster tails, sunset dust wall |
| P1 | `monsoon-ruins` / 雨林失落神殿 Monsoon Ruins | 12.5 km | 3:10–4:40 | mud S-bends, broad river ford, temple hairpin, root path | ground jungle trails vs waterfall aerial bridge; torrential rain, droplets, mist, bioluminescent vegetation |
| P1 | `skyfall-archipelago` / 浮空群島 Skyfall Archipelago | 16 km | 3:50–5:00 | layered floating islands, spiral ramps, disconnected airborne corridors | lower stone road vs flying island-to-island; cloud shear, sky rays, falling waterfalls, giant floating arches |
| P2 | `volcanic-crown` / 熔火天脊 Volcanic Crown | 15 km | 3:40–5:00 | huge volcanic hairpins, scree terrain, caldera loop and basalt ridge | rim road vs ash plume glider crossing; ash, ember particles, heat haze (bounded) and glowing lava |
| P2 | `stormline-megacity` / 霓虹暴雨都市 Stormline Megacity | 14 km | 3:20–4:40 | elevated interchanges, wide sharp turns, S-curved rooftops | flood-level street vs upper viaduct flight; rain slicks, wet reflections, safe lightning, towering animated billboards |

**Candidate counts:** 5 maps, at least 3 legal navigable forks/map (15 total), 2+ major hairpins/map, at least 1 memorable aerial-ground split/map, and 1 set-piece climax/map. Refine counts during blockout; no impossibly narrow flying corridors.

**Scope decision (2026-11-02):** reduced from six new tracks to five. Glacier Serpentine is removed from this epic because existing Aurora Pass and Alpine Rail Pass already cover related cold/mountain visual themes; all snow-themed work remains outside this five-track plan.

## Confirmed five-track one-way topology and committed visual references (2026-11-02)

**User-approved routing:** all five courses are **point-to-point / single finish / no laps**, consistent with the ten existing sprint courses. Every new course has a unique START node and a distinct FINISH node in the authoritative `CourseGraph`, physically separated in the world. U-turns, elevation-overlapping roads, forks and joins are welcome; circuit closure and repeated lap completion are not. Only a valid ordered checkpoint-gated passage through the actual finish ends the run. Existing Harbor Circuit remains a separately named Circuit mode and is out of scope here. This removes the previous proposal to give two of these five tracks loop variants.

**Live GitHub references:**
- [Visual directory index](../../designs/new-tracks/README.md) — five saved two-view concept SVG images, five saved point-to-point route diagrams.
- [Visual fidelity and camera/biome/weather acceptance matrix](../../designs/new-tracks/visual-fidelity.md).
- [Machine-readable concept manifest](../../designs/new-tracks/concept-manifest.json).
- [Import manifest for the 12 original high-detail PNG concept images; checksums verified from the chat-provided files](../../designs/new-tracks/png-source-import-manifest.md).

| Map | Ground + aerial concept image | One-way route diagram |
| --- | --- | --- |
| 沙暴裂谷 | [Two-view storyboard](../../designs/new-tracks/concept-art/dune-tempest-point-to-point-storyboard.svg) | [Route](../../designs/new-tracks/route-schematics/dune-tempest.svg) |
| 雨林失落神殿 | [Two-view storyboard](../../designs/new-tracks/concept-art/monsoon-ruins-point-to-point-storyboard.svg) | [Route](../../designs/new-tracks/route-schematics/monsoon-ruins.svg) |
| 浮空群島 | [Two-view storyboard](../../designs/new-tracks/concept-art/skyfall-archipelago-point-to-point-storyboard.svg) | [Route](../../designs/new-tracks/route-schematics/skyfall-archipelago.svg) |
| 熔火天脊 | [Two-view storyboard](../../designs/new-tracks/concept-art/volcanic-crown-point-to-point-storyboard.svg) | [Route](../../designs/new-tracks/route-schematics/volcanic-crown.svg) |
| 霓虹暴雨都市 | [Two-view storyboard](../../designs/new-tracks/concept-art/stormline-megacity-point-to-point-storyboard.svg) | [Route](../../designs/new-tracks/route-schematics/stormline-megacity.svg) |

**Source-art distinction (updated 2026-11-02):** all **10 original Stage 1 AI scene PNG crops have been converted to JPEG and actually committed** under [source-concept-jpeg](../../designs/new-tracks/source-concept-jpeg/) for direct development reference. The *lossless PNG bytes* and two original overview PNGs remain outside GitHub; [historical PNG hashes](../../designs/new-tracks/png-source-import-manifest.md) are retained. The 10 standalone SVGs are different vector references. Never treat generated closed-looking infographic lines as authoritative playable circuit geometry. **Next wave:** [Stage 2 five more maps / 10 committed JPEGs](../../designs/new-tracks/stage-2/README.md), [separate design specification](2026-11-02-stage2-five-longform-tracks-design.md) and [TDD plan](../plans/2026-11-02-stage2-five-longform-tracks.md).

**Next-stage image requirement:** all future five reference designs and all true 3D previews must show point-to-point one-way racing. At least 2 real WebGL camera captures per course (ground hairpin and aerial branch); route signage must show different START/FINISH and no lap counter. Compare lighting, landmarks, weather, scale and road openness against committed visual design and record explicit deviations.

## Ten individually committed concept-camera images

These five point-to-point routes have **10 separate SVG scene images** on this planning branch, plus five combined two-view storyboards and five SVG technical routes. Each is **concept artwork, not rendered gameplay and not the original high-detail AI-generated PNG**. The original PNG collage + ten crop archive remains in the chat; use [PNG source manifest](../../designs/new-tracks/png-source-import-manifest.md) before importing binaries.

| Course | Ground camera concept | Air / route split camera concept |
| --- | --- | --- |
| Dune Tempest | [Ground](../../designs/new-tracks/concept-art/dune-tempest-ground-view.svg) | [Air](../../designs/new-tracks/concept-art/dune-tempest-aerial-view.svg) |
| Monsoon Ruins | [Ground](../../designs/new-tracks/concept-art/monsoon-ruins-ground-view.svg) | [Air](../../designs/new-tracks/concept-art/monsoon-ruins-aerial-view.svg) |
| Skyfall Archipelago | [Ground](../../designs/new-tracks/concept-art/skyfall-archipelago-ground-view.svg) | [Air](../../designs/new-tracks/concept-art/skyfall-archipelago-aerial-view.svg) |
| Volcanic Crown | [Ground](../../designs/new-tracks/concept-art/volcanic-crown-ground-view.svg) | [Air](../../designs/new-tracks/concept-art/volcanic-crown-aerial-view.svg) |
| Stormline Megacity | [Ground](../../designs/new-tracks/concept-art/stormline-megacity-ground-view.svg) | [Air](../../designs/new-tracks/concept-art/stormline-megacity-aerial-view.svg) |

Each later implementation must compare actual WebGL snapshots to both camera references plus [visual fidelity requirements](../../designs/new-tracks/visual-fidelity.md). Geometry remains graph-authored point-to-point: no lap count and no closed race despite stylized bends.

## Binding visual-fidelity signoff

**Mandatory gate:** [10-track concept JPEG → real WebGL comparison](../../designs/new-tracks/visual-acceptance-gate.md). Each Stage 1 map has a ground and aerial JPEG saved in `docs/designs/new-tracks/source-concept-jpeg/<id>/`, plus a separate route SVG and vector storyboard. Stage 2 likewise has two JPEG views/map in `docs/designs/new-tracks/stage-2/source-concept-jpeg/<id>/`. The gate requires deterministic camera/weather captures, three signature visual anchors, PASS/FAIL/APPROVED DEVIATION logs, road/terrain and split correctness, visibility and performance. Do not mark actual 3D implementation complete from static mockups, and do not use any resampled JPEG as a genuinely original 3× game texture.

## Race readability and fairness acceptance

- Every split has visual warning 3s in advance at typical approach speed, 2 physically drivable choices, clear join and ground recovery after failed air path.
- At least 1 baseline safe ground option can finish each course with no flight (unless explicitly labeled flight challenge); 8-car AI and human vehicles can choose branches and rejoin without spawning into each other.
- No bypassing mandatory gates via high flight or off-road; no race finishing from the wrong elevation or on an adjacent parallel route.
- Test 30/60/120 variable-dt physics, steering, long road hairpin tangents, repeated edge contact, flight landing, traffic, minimap/position and seeded weather replay consistency.
- Visuals: 320×740, 390×844, 844×390, 1440×900 + tablet/foldable × Low/Medium/High × zh-TW/en; all critical choices visible, road/terrain never eclipsed by fog or giant banners.
- Set performance targets **to validate**, not claims: mid-tier 60 fps target where supported, low-tier 30 fps minimum target during heavy rain/dust, no long shader-compilation stalls; compare frame-time p50/p95, calls, triangles, GPU resources, memory, first-load and travel-through chunks. Tune against real browser baseline rather than promising hardware performance.
- Cloud save and ghost key migration never corrupt old runs. Existing ten routes + circuit geometry, finish rules, NITRO/FLY, inventory, HUD and replay must remain unchanged until separately approved.
- Asset workflow: any generated in-game raster image keeps a real 3× original at its intended display size and is displayed at 1×. Design references here are only conceptual artwork; no third-party screenshots/assets bundled.

## Milestones and gates

- **M0 (planning, this branch only):** code audit, reference research, five briefs, concept/storyboard images, implementation task breakdown and TODO; no gameplay change.
- **M1 (topology foundation, future branch):** typed route graph validation, arc-length frames, distinct physical world pose vs ranking progress and legacy adapter. RED→GREEN deterministic tests.
- **M2 (open-terrain physics):** opt-in lateral unclamping, ground/air drift/flight collision, recovery + gates; no old-map regressions.
- **M3 (P1 vertical slice):** Dune Tempest playable with a genuine fork, hairpin, natural sand terrain; end-to-end browser screenshot + AI/ghost.
- **M4 (weather and scene budget):** zone-based sand/rain/ash presets, GPU instancing; Low/Medium/High and Reduced Motion; long-run profiling.
- **M5 (remaining P1 maps):** Monsoon Ruins then Skyfall Archipelago, AI/finish/player readability QA; 3–5 minute median verified.
- **M6 (P2 maps):** Volcanic Crown and Stormline Megacity with art and route distinctiveness signoff.
- **M7 (release gate):** update track select, localized names, difficulty/economy, migration, gameplay captures, `make verify`, exact-HEAD full CI, manual device review. Merge to `develop` requires explicit approval.

**Implementation ownership candidates:** `src/race-tracks.ts`, `src/track-paths.ts`, new `src/course-graph.ts`, `src/course-route-frame.ts`, `src/course-progress.ts`, `src/course-weather.ts`, `src/course-terrain.ts`, `src/route-map.ts`, `src/world.js`, `src/world-tour-scene.js`, `src/game.js`, `src/car-collisions.js`; new isolated tests in `tests/course-*.test.*` and Playwright `tests/course-*-browser.spec.*`. Respect module-size ratchet: do not simply grow already large engine modules.
