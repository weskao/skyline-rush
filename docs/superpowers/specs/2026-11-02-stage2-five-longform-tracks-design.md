# Skyline Rush — Stage 2: Five New Long-Form Point-to-Point Worlds (Design)

**Status:** PLANNING AND JPEG REFERENCES ONLY. No playable Stage 2 tracks or gameplay tests are claimed.
**Date:** 2026-11-02
**Branch:** `feature/epic-multiroute-longform-tracks`
**Depends on:** [Stage 1's shared course-graph and terrain proposal](2026-11-02-multiroute-longform-world-expansion-design.md).
**Visual master:** [Stage 2 JPEG gallery and five route schematics](../../designs/new-tracks/stage-2/README.md).
**Art acceptance:** [Stage 2 visual-fidelity checklist](../../designs/new-tracks/stage-2/visual-fidelity.md).

## Binding concept-to-engine visual signoff

The 10 actual JPEG scene references and five route SVGs in [Stage 2 gallery](../../designs/new-tracks/stage-2/README.md) are the **art direction input**, not screenshots proving game fidelity. Before approval of any Stage 2 course, use the [shared Stage 1 + Stage 2 visual acceptance gate](../../designs/new-tracks/visual-acceptance-gate.md): real-world/arc-length graph and collision first, deterministic in-app camera captures on desktop and phone, six visual comparison categories, logged deviations, bounded weather/particles, readable branch/landing, and baseline CI. Every new course remains point-to-point; no lap counter.

## Decision: Five *additional* maps, separate from the existing five proposed in Stage 1

Stage 1 designs Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown and Stormline Megacity. Stage 2 adds **five distinct new maps**, bringing future *planned additions* to ten. These are **not already implemented** in the game; the ten original sprint tracks plus Harbor Circuit remain untouched.

All proposed Stage 2 routes share the product decision: `point-to-point`, distinct START and FINISH, one correct finish per race, no `lapCount` and no closed-loop requirement. This is consistent with all existing sprint maps. A small area may loop around naturally, and the course may cross itself at different height levels; both remain part of one ordered journey. Route forks safely rejoin.

### Proposed maps

| Priority | ID / Chinese & English | Target length | Target typical race | Geometry and splits | Signature effects |
| --- | --- | ---: | --- | --- | --- |
| S2-P1 | `frostbite-canyon` 極地冰原峽谷 / Frostbite Canyon | 13.8 km | 3:20–4:40 | Glacial fissures, broad open ice valley, two U-shaped ice cliff turns; ground snow channel vs elevated ice bridge glide | ice dust, white-out gust walls, cold fog, aurora |
| S2-P1 | `abyssal-ruins` 深海遺跡城 / Abyssal Ruins | 15.2 km | 3:45–5:00 | Transparent undersea pressure tunnels, lost stone city, coral canyon switchbacks; deep floor tube vs sealed upper-dome bypass | aquatic caustics, suspended bubbles, fish schools |
| S2-P1 | `windspire-highlands` 風之高原 / Windspire Highlands | 14.5 km | 3:25–4:45 | Wide off-road alpine-grass terraces, windmill line, cliffside switchbacks; ground plateau vs flight over stone aqueduct | gust lines, floating seeds, grass flecks, cloud shadow |
| S2-P2 | `crystal-stardust-valley` 水晶星塵谷 / Crystal Stardust Valley | 13.6 km | 3:20–4:40 | Prismatic luminous chasm, bending natural cave road, crystalline bridge arches; basin path vs upper shard span | refraction glows, sparing crystal dust, local volumetric beam |
| S2-P2 | `chrono-rift` 時空斷層 / Chrono Rift | 16 km | 3:50–5:00 | Fractured sky ruins, ancient rift rings, layered ruin bridges and hairpin slabs; safe stone road vs airborne ring shortcut | stylized temporal echoes, cloud ribbons, bounded portal particles |

Lengths and durations are **unverified targets**, not guaranteed measurements. Gather a minimum 20 valid finished sessions per map across difficulties, then tune road curvature, branch rewards, obstacles and traffic for 3–5 min median.

## Moodboards and file identity

For each map, the following **actual JPEG** references are committed, two views per map. They were derived by cropping an AI-created five-track Stage 2 overview and resizing 3× for viewing. No additional native high-frequency source detail was created during resizing. Do not call them actual gameplay screenshots or production-quality 3× texture sources.

| Stage 2 map | Ground scene JPEG | Aerial/shortcut scene JPEG |
| --- | --- | --- |
| Frostbite Canyon | [01](../../designs/new-tracks/stage-2/source-concept-jpeg/frostbite-canyon/concept-view-01.jpg) | [02](../../designs/new-tracks/stage-2/source-concept-jpeg/frostbite-canyon/concept-view-02.jpg) |
| Abyssal Ruins | [03](../../designs/new-tracks/stage-2/source-concept-jpeg/abyssal-ruins/concept-view-01.jpg) | [04](../../designs/new-tracks/stage-2/source-concept-jpeg/abyssal-ruins/concept-view-02.jpg) |
| Windspire Highlands | [05](../../designs/new-tracks/stage-2/source-concept-jpeg/windspire-highlands/concept-view-01.jpg) | [06](../../designs/new-tracks/stage-2/source-concept-jpeg/windspire-highlands/concept-view-02.jpg) |
| Crystal Stardust Valley | [07](../../designs/new-tracks/stage-2/source-concept-jpeg/crystal-stardust-valley/concept-view-01.jpg) | [08](../../designs/new-tracks/stage-2/source-concept-jpeg/crystal-stardust-valley/concept-view-02.jpg) |
| Chrono Rift | [09](../../designs/new-tracks/stage-2/source-concept-jpeg/chrono-rift/concept-view-01.jpg) | [10](../../designs/new-tracks/stage-2/source-concept-jpeg/chrono-rift/concept-view-02.jpg) |

**Art identity:** Stage 1's [ten original high-detail scene crops converted to JPEG](../../designs/new-tracks/source-concept-jpeg/) are in the same branch. Preserve original PNG metadata/manifest but do not claim unuploaded original PNG bytes are in GitHub.

## World design: non-standard roads and different physics risks

- The 5 new courses must not be five copies of a sinusoidal straight road, or independent procedural mainline approximations. Reuse Stage 1 `CourseGraph`: 3D world position `edgeId/localS`, arc-length frame, physically independent branches, legal checkpoint ordering and ranking progress decoupled from position. Existing classic maps never move.
- At least **two real hairpin curves and three legal route decisions** in each map. Include meaningful advantage/tradeoff (safe ground vs difficult aerial), a genuine shortcut requiring skill and a recovery trajectory after a failed leap. A non-flying route must always complete the race.
- Moveable world area includes broad safe off-road surfaces as appropriate. The road can be snow, seabed corridor, grass, crystalline rock or fractured stone and may have **no drawn lane markings**. In danger zones cliffs and void edges can have physical barriers, visible warnings and safe respawn; no invisible side clamps.
- `frostbite-canyon` differs from existing Aurora/Alpine via broken river canyon topology, vast open ice basins and temporary ice shelves rather than an icy reskin of the existing mountain/rail road. Slippery handling requires an explicitly approved, tested opt-in effect.
- `abyssal-ruins` simulates an **underwater-looking environment**, not water swimming or pressure physics. Ground route remains a physically navigable sealed road. Flight alternative occurs inside an authored clear volume and must not penetrate the tunnel shell. No actual submerged vehicle buoyancy without a separate proposal.
- `windspire-highlands` uses deterministic wind cues and signaled crosswind; avoid arbitrary pushes that invalidate the 30/60/120 Hz physics contract.
- `crystal-stardust-valley` uses quality-tiered emissive geometry and limited bloom to keep driving turn entry readable.
- `chrono-rift` portal rings are decorative/signal gates until separately specified. **No real teleport or backward time travel** as a shortcut to finish. Sky world should be distinct from Skyfall's organic floating islands by using manufactured fracture structures and temporal elements.

## Reuse current engine safely

Existing code observed in develop: `src/race-tracks.ts` track registry, `src/track-paths.ts` single-centreline `trackFrame/trackLocalPosition`, `src/game.js` `ROAD_LIMIT` lateral clamp and vertical flight, `src/route-map.ts` one polyline, `src/world.js` renderer, `src/world-tour-scene.js` reusable scenery/chunks, `src/race-visuals.ts` atmospheric presets. Stage 2 should extend **only after the shared graph and terrain work** so physics, scenery, AI, checkpoint and minimap agree on a single frame.

## Acceptance gates

- Typed authored Graph validation: one reachable finish per branch, distinct start and finish, no finish-jumping from parallel layers or open flight, safe ground route available, deterministic scene seeds and independently replayable branches.
- 8-car AI route choice and collision separation between crossing disconnected edges, ghost save/version migration, real 3D wheel/body-to-road contact, recovery beyond terrain and accurate mini-map with both ground/aerial layer representations.
- Weather, art and motion: Low/Medium/High + Reduced Motion, reasonable GPU particles and no center-road bloom or dense occluding fog; camera lookahead over hairpins and not obstructed by HUD/toast.
- Desktop/phone visual parity: 1440×900 and 390×844 at minimum, two **real WebGL** captures per map, compare each against its corresponding committed JPEG and record deviation, measured p50/p95, memory, draw calls and long-race chunk streaming.
- Integration: start with one future isolated Stage 2 implementation branch after Stage 1 foundation passes; RED→GREEN→Refactor, `npm test`, `npm run build`, relevant browser specs, full `make verify`, exact-HEAD CI; **do not mark implementation complete from this planning commit**.

## Scope and releases

Stage 1 five planned maps remain first priority; Stage 2 five are next workstream after Stage 1 M1/M2 foundations and ideally initial P1 vertical slice. Do not merge or deploy from the planning-only branch without an explicit instruction.
