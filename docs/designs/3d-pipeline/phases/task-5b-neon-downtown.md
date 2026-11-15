# Task 5b — Neon Downtown look development (Blender city kit, wet night road)

Part of `docs/superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md` · **Proposed, not in spec v2**: the spec's
Phase 3 covers Coast and Phase 4 the six course maps; Neon Downtown (classic track `neon`, the second map in
`src/race-tracks.ts`) has no phase and no concept-board panel. Scope tags: `README.md`. Planning only: no code yet.

**Look and route target:** the owner-supplied nine-image set in `../concept-art/neon-downtown/` (N1 and N7,
2026-11-14); capture recipe in `../neon-look-brief.md`. The board itself has no Neon panel.
**Files (expected):** new `src/neon-*.ts` modules (`src/world.js` is at its legacy line ceiling), `assets-src/neon-*/`,
`public/models/neon-*/`, `public/materials/`, `public/environments/`, the model and material manifests, new tests.
**Produces:** Neon Downtown under `?look=3d` on Medium+ with a Blender-built city, a wet PBR night road with neon
reflections and a matching night sky. The route itself changes once, for every look and tier (N7): a closed
clockwise loop through the set's six sectors. Lanes, the collision rules and the VFX ports stay as they are.

**Carried over from Task 5 (owner, 2026-11-08 / 2026-11-09):** realistic material quality first; licensed sources
recorded per asset in the manifests; editable `.blend` masters at `assets-src/<asset>/<asset>.blend`; the whole look
is opt-in behind `?look=3d` (`src/look-gate.ts`); Low tier and load failure keep today's procedural scene.

## Neon today (code read at `6e4abd33`, not verified at runtime)

| Element | Today (file) |
|---|---|
| City | The shared pool of 160 unit-box buildings and 2,880 window boxes, windows `#ff6dbc` (`src/world.js` `city`, `src/skyline-scenery.ts`) |
| Roadside | Four instanced box layers: bodies, trim, emissive sign accents (`#4eb3dc`, 0.4) and billboards (`src/classic-track-scenery.ts`, theme `neon`) |
| Tunnels | Three sections, 600–1100 m, 1700–2300 m, 2900–3400 m (`src/race-tracks.ts`); procedural `tunnelRoofs` / `tunnelWalls` (`src/world.js`) |
| Road | Procedural material, roughness 0.4, metalness 0.08, night-blue palette, rail `#ff52bf` (`src/track-palettes.ts`) |
| Sky and light | Procedural dome, sun hidden, RoomEnvironment lighting (`src/classic-backdrop.ts`, `src/coast-lighting.ts`) |
| Water | The classic sea plane is on, sea lines off (`src/world.js`) |
| Weather | Rain particles; `neon` is in `RAINY_TRACKS` (`src/board-effects.ts`) |
| Gameplay props | Barriers, swinging gates, lane closures, a branch marker (`src/track-themes-classic.ts`); shortcut at 1150–1650 m. Moved once, by step 1b; never for an art step. |

## Owner decisions (decided 2026-11-14)

- [x] **N1 Look target: a text-to-image Neon Downtown concept panel.** Pink-violet neon and no lightning, so it reads
  apart from Stormline Megacity (cyan rails, magenta glow, lightning). Generating the panel is step 0 below.
- [x] **N2 Time of day and weather: night and rain night only.** No day, dusk or fog look on Neon.
- [x] **N3 Waterfront: the sea becomes city blocks.** No water treatment on Neon.
- [x] **N4 Bridge towers: removed** from Neon, not rebuilt.
- [x] **N5 Tunnels: modelled in Blender.**
- [x] **N6 Budget: the same caps as Coast.** Today that is the High draw-call cap, home 540 and race 380
  (`tests/coast-scenery-browser.spec.js`). Coast has no recorded triangle cap or per-tier cap beyond High.

- [x] **N7 New concept set and route (owner, later on 2026-11-14).** The nine owner-supplied images replace the two
  generated views. The owner allows the route, its length and its sections to change to fit the set, as long as the
  track does not get much longer. Taken from that:
  - The route becomes a closed clockwise loop in the order of `09-closed-loop-schematic.png`: Neon Boulevard
    (start/finish) → rail underpass → night market → elevated expressway → canal arch bridge → Violet Plaza.
  - N3 is refined: the open sea still goes, and a canal crossed by the arch bridge is part of the look.
  - N4 stands: the classic bridge towers stay removed. The arch bridge is a new landmark, not a rebuilt tower.
  - N5 is refined: one rail underpass replaces the three tunnels.
  - N2 stands. Every frame in the set is rain night; `night` is the same look, dry.

- [x] **N7 amended (owner, 2026-11-15): one 10 000 m lap.** 4000 m is too short: the bot laps it in 36 s. The lap
  becomes 10 000 m, still one closed clockwise lap driven once, never two laps. Two sectors join the six: `harbour`
  after the expressway and `oldtown` after the canal bridge. The owner delegated their design; their names, shapes
  and dressing are provisional until the owner supplies concept art, and they are drawn with the existing kits (no
  new GLB). This replaces "as long as the track does not get much longer" above and the 4000 m limit of step 1b.
  `09-closed-loop-schematic.png` still shows the six-sector lap and is out of date. Work: step 11.

N3 and N4 apply to the `?look=3d` look on Medium+; without the gate, and on Low, Neon keeps its sea and towers, as
Coast does for D1 and D2. The N7 route is not gated: a road cannot differ by look, so every player gets it.

## By project (committed once)

Already in place from Tasks 3–5 and usable by Neon as is:
- [x] Blender → GLB / KTX2 asset pipeline with manifests and budget checks (`scripts/assets/`, Task 3).
- [x] `?look=3d` gate (`src/look-gate.ts`, `tests/look-gate.test.js`).
- [x] Ultra tier renders on Neon: all ten selectable maps raced on High and Ultra (Task 5, `ultra-maps-capture`).
- [x] Board effects on Neon: magenta plume tail, thruster glow and contact shadow are track-agnostic; rain wheel
  spray lists `neon` (`src/board-effects.ts`, `src/contact-shadow.ts`).
- [x] Coast building blocks to generalise: HDRI lighting and sky dome (`src/coast-lighting.ts`, `src/coast-sky.ts`),
  KTX2 road with a `wetness` uniform (`src/coast-road-material.ts`), lights-only wet mirror (`src/wet-reflection.ts`),
  GLB chunk layer with eviction (`src/coast-scenery-glb.ts`). All are gated to `trackId === 'coast'` today.
- [x] Neon element inventory (table above).

To do, in order:
- [x] **0 Concept set (N1, N7).** Nine owner-supplied images in `../concept-art/neon-downtown/` (two overviews, six
  sector frames, one route schematic), listed in that folder's `README.md` with the panel row. They replace the two
  generated views, which were deleted before being committed. Never in-game evidence.
  - [x] Generator and redistribution licence of the set: generated with ChatGPT; the owner confirms the set is
    licensed for this repository (owner, 2026-11-15).
- [x] **1 Look brief.** `../neon-look-brief.md`: per view the camera, capture recipe and the spec v2 §8.1 items it
  scores, the six sectors in driving order, recorded before any look change. Presets: `track` and `rain` show rain
  night, `night` shows the same look dry, `day` / `dusk` / `fog` keep today's lighting (N2).
- [x] **1b Route reshape (N7).** One 4000 m lap, driven once per sprint (not a multi-lap race). Evidence:
  `tests/neon-loop.test.js` (9 tests, RED first: closed clockwise lap, sector order, peak curvature 0.00845 rad/m
  against the old 0.01214, no self-crossing, second lap repeats, `offset`, sections, closed home map, skyline clear
  of the road), `tests/neon-parity.test.js` re-pinned at layout 7, `npm test` 2961 of 2961 run, `npm run build`,
  real WebGL frames round the lap (boulevard, underpass, expressway, bridge, last corner, finish gate on the start
  line; no page error). Rings 69 → 98 (two tunnels gone); bot ring take 68.6% → 63.3%, NITRO/min 24.55 → 24.33
  (`tests/ring-variety.test.js` re-locked). Done when all of these hold:
  - [x] Owner confirmed (2026-11-15): Endless, Event Lab and Daily Neon records start fresh on road layout 3 (`neon@3`); the
    older ones stay stored and readable.
  - [ ] Owner to deploy `firestore.rules` (`neon@7` added, 51 ids, cap 60).
  - The Neon centreline is a closed clockwise loop: the finish point is the start point, the heading turns through
    360°, and the sectors come in the order of the schematic. Unit test on `classicRoadRoute('neon')`.
  - The track is not longer than today (4000 m) and no corner is tighter than today's tightest.
  - Sections follow the set: one `tunnel` (the rail underpass) and the `shortcut`; the other two tunnels go.
  - Version key and saved-data strategy (`docs/classic-road-minimap.md`): `layoutVersion` 6 → 7, so finite records
    and ghosts move to `neon@7`; `neon` through `neon@6` stay readable and are never compared with the new layout.
    `firestore.rules` lists `neon@7`; deploying the rules is the owner's step. Endless and Event Lab road records
    need their own decision before this ships (their road changes too).
  - Road, cars, rings, pickups, props, scenery and the minimap all read the same loop; the home map shows a closed
    route. Endless and Elimination keep streaming past one lap.
  - `tests/neon-parity.test.js` is re-pinned in the same commit as the route; the fallback guards in
    `tests/neon-look-browser.spec.js` stay green; `npm test` and `npm run build` pass.
- [x] **2a Per-track look config.** The `trackId === 'coast'` checks in the lighting plan (`src/coast-lighting.ts`,
  `src/coast-look.ts`) and the asset host (`src/coast-assets.ts`) read a per-track entry (environment, road set,
  scenery layer) from `src/track-look.ts`. RED → GREEN: `tests/track-look.test.js` (Neon without `?look=3d`, Neon on
  Low and Coast under `?look=3d` plan as before; a track without an entry loads nothing; a borrowed sun returns only
  to its own track). Coast unchanged in the browser: `tests/coast-scenery-browser.spec.js` and
  `tests/coast-visual-browser.spec.js`, 13 of 13.
- [x] **2b Neon's own entry** in `src/track-look.ts`, and the bloom pick in `src/world.js`.
  - [x] Entry with the road set and its wetness table (`neon: { road: 'neon-asphalt', wetness: { track, rain } }`);
    the asset host loads any entry's road set and keys its cache by set and tier. `tests/track-look.test.js`
    (*Neon's entry puts its own asphalt set on the road*), RED first.
  - [x] HDRIs: `env: { track: 'nightRain', rain: 'nightRain', night: 'night' }`; `day`, `dusk` and `fog` keep
    RoomEnvironment (N2). The bloom pick in `src/world.js` asks the look on every track
    (`coastLook.bloomStrength(trackId === 'coast' ? COAST_LIGHTING.bloom : .42)`). `tests/neon-lighting.test.js`.
  - [x] Scenery GLBs (steps 5 to 7): `scenery: 'neon-city', landmarks: 'neon-landmarks'`. The asset host
    (`src/coast-assets.ts`) fetches both once on Medium+ and swaps the procedural city for them only when both are in
    the scene. `tests/neon-assets.test.js` (7 tests), RED first.
- [ ] **3 Night lighting and sky.** Two CC0 night-city HDRIs (night, rain night), PMREM 256 so no program changes
  mid-race,
  shown on the sky dome; key light matched to the HDRI; bloom threshold set under the neon signs and windows and
  over the sky.
  - [x] Assets: `assets-src/neon-sky/` (CC0 Poly Haven Shanghai Bund, licence record, build script, measured key
    light and sky data), two 1K environment maps and four dome KTX2 files. Commit `5a33367e`;
    `tests/neon-sky-manifest.test.js`.
  - [x] Runtime: variants `night` and `nightRain` in `src/coast-lighting.ts`, dome rows in
    `src/coast-sky-manifest.ts`. `sky.ahead` turns the far skyline (HDRI longitude 30 degrees) straight ahead of the
    grid; the key light, the environment and the dome turn together. Sign texels are capped at the dome's range so
    the wet road does not mirror them as white blots. RED first: `tests/neon-lighting.test.js` (8 tests);
    `tests/neon-look-browser.spec.js` (*lit by its rain-night HDRI*, *keeps RoomEnvironment and the procedural sky
    when its HDRI files cannot load*).
  - [x] Fix found by the fallback spec: another track's HDRI stayed up while Neon's own was loading, and for good
    when it failed (Coast's daylight on the night city). `src/coast-look.ts` returns to RoomEnvironment on a track
    change until the track's own HDRI lands. Guard: `tests/neon-lighting.test.js` (*another track's HDRI never
    lights Neon*), RED on the old code.
  - [x] Dome gain: the dome's horizon glow sat at 1.15x to 1.35x the bloom threshold (Coast's gain rule), so wherever
    no building stood in front of it the horizon bloomed white. `sky.gain` is now 0.4 x threshold / luminance of
    `sky.horizon` (night 0.169, rain night 0.258). Whole-frame mean luminance, same paused frame: home -19 %, market
    -35 %, expressway -38 %, canal -41 %. Guards: `tests/neon-lighting.test.js` (*the dome horizon never reaches the
    bloom*), `tests/coast-sky.test.js`; rule 15 in `.claude/rules/3d-asset-pipeline.md`. Commit `fdc3fd47`.
  - [ ] Owner art approval of the lighting: key intensity (2.7 night, 1.55 rain night), bloom and the darker dome are
    measured values, not yet judged by the owner.
- [x] **4 Wet road.** Blender-baked KTX2 city asphalt (base colour sRGB; normal and roughness/AO linear) with lane
  paint and a puddle mask, `wetness` driven by the rain preset. Signs, windows and tunnel light strips join the wet
  mirror layer as opaque unlit meshes.
  - [x] Asset: `assets-src/neon-asphalt/` (CC0 Poly Haven Asphalt Track, editable master, bake and preview
    scripts), six KTX2 files in `public/materials/neon-asphalt/`, 2.03 MB at 1K and 8.71 MB at 2K. Commit
    `c1972971`; `tests/neon-asphalt-material.test.js`. Lane paint stays the instanced `laneLines` geometry, as on
    Coast.
  - [x] Runtime: Neon on Medium+ under the gate wears the set, soaked on `track` and `rain`, dry on `night`; a failed
    load keeps the procedural road. `tests/track-look.test.js` and `tests/neon-look-browser.spec.js` (*wears its own
    KTX2 asphalt*, *falls back to the procedural road*), desktop and phone.
  - [x] Signs, billboards, shop and tower windows, lamps, the parapet lights, the canal arch and the sculpture in the
    mirror layer: the LOD 0 pools of those pieces are on `REFLECT_LAYER`. `tests/neon-scenery.test.js` (*step 4: the
    lit pieces around the car are on the wet mirror layer*).
  - [x] Underpass lamps in the mirror layer: `rail_segment` LOD 0 is on `REFLECT_LAYER` now that the race is under
    the N6 cap (step 8c); one more draw in the underpass. Same test as above.
- [ ] **5 City kit in Blender** (`assets-src/neon-city/`): modelled, not photoscanned.
  - [x] Close buildings: six modules (two glass towers, a retail and an office block, two tile-roofed market shops),
    three LODs each, ground pivots, one material on four shared KTX2 atlases, CC0 sources recorded with sha256.
    Commit `0e92ebc7`; `tests/neon-city-glb.test.js`.
  - [x] Neon sign and billboard kit: five pieces in the same GLB; the box accents are hidden while the kit is drawn.
    The GLB's emissive strength (6) clips under the race bloom, so the layer sets 1.7 for the city and 1.5 for the
    landmarks (`EMISSIVE` in `src/neon-scenery.ts`; `tests/neon-scenery.test.js`, *kit emissive*).
  - [x] Street furniture: lamp, traffic light, railing, kerb and cherry tree; the elevated rail is the hero landmark
    (step 6).
  - [x] Far skyline: four low-poly towers, one instanced draw each, in place of the unit boxes on Neon only.
  - [x] Placement: 33 chunks a lap (about 121 m), keyed by lap position and seed, one `InstancedMesh` per piece and
    LOD band, outside the kerbs; both GLBs are in the scene before a race can start, else the procedural city stays.
    `src/neon-scenery-plan.ts`, `src/neon-scenery.ts`; `tests/neon-scenery-plan.test.js` (9 tests),
    `tests/neon-scenery.test.js` (8 tests), RED first. Real WebGL: `tests/neon-look-browser.spec.js` (*draws both kits
    in place of the procedural city, through a race, with no NaN pixel*).
  - [x] Practice mode drives the legacy straight road, which has no sectors: it keeps the procedural city (accepted
    by the owner, 2026-11-15).
  - [x] Fixed from the first captures: street furniture popped in 242 to 484 m ahead (it now draws LOD 0 through the
    whole chunk window); the kit's kerb doubled the procedural barrier through the market; the pavement was one flat
    dark material (now the KTX2 set below). The cherry tree, the spire and both glass towers were reworked toward
    concept frame 03 (commit `4d64282a`). Triangles rise by up to about 84k in the plaza (cherry tree LOD 0).
  - [x] Pavement: the land beside the road wears its own KTX2 set, `assets-src/neon-pavement/` (CC0 Poly Haven
    Concrete Pavement, 2.05 MB at 1K and 7.91 MB at 2K, commit `230485c8`, `tests/neon-pavement-material.test.js`),
    through the road's shader, tier, wetness and mirror: `ground: 'neon-pavement'` in `src/track-look.ts`, planar UVs
    of one tile per 7.2 m. Like the road it is laid outside a race only; a failed load keeps the bare paving.
    `tests/neon-assets.test.js` (*the Neon land wears the pavement set*, *a pavement set that cannot load*),
    `tests/neon-scenery.test.js` (*the land takes the pavement set*), `tests/neon-look-browser.spec.js` (*asphalt and
    pavement*, *falls back*), RED first.
  - [ ] Look-dev by eye and owner art approval. Open: the cherry tree is still opaque puffs (the kit has no alpha
    material; one would cost a draw call); the spire is limited by its 32 m footprint slot; the emissive values (1.7
    city, 1.5 landmarks) were set before the darker dome and are not yet judged against it; the wet mirror on the
    pavement is a fill-rate cost not yet measured on a phone.
- [ ] **6 Rail underpass** (N5, N7): one Blender underpass GLB (rail bridge deck, abutments, amber lamps) on the
  `tunnel` section from step 1b. The section's extent and collision follow the route, not the art.
  - [x] Asset: `rail_portal` and `rail_segment` in `public/models/neon-landmarks/neon-landmarks.glb`, master in
    `assets-src/neon-landmarks/`. Commit `da6111e1`; `tests/neon-landmarks-glb.test.js`.
  - [x] Placed on the section, with the procedural tunnel shell hidden while the kits are drawn; collision still
    reads the route. `tests/neon-scenery-plan.test.js` (*N5 and the landmarks contract*, *the underpass and the
    sculpture court are kept clear*), `tests/neon-assets.test.js` (*all or nothing*), `tests/neon-parity.test.js`.
  - [ ] Owner art approval of the underpass in a race capture.
- [ ] **7 Waterfront, canal and towers** (N3, N4, N7): hide the sea plane and the bridge towers on Neon, fill the
  former waterfront with step 5 city blocks and far skyline, and add the canal with its arch bridge and the plaza
  sculpture as sector landmarks.
  - [x] Bridge towers hidden (N4) and land under the city sectors: one ground mesh covers the sea there and leaves
    it open as the canal under the expressway and the bridge (N3). `tests/neon-scenery.test.js` (*N3: one ground
    mesh*), `tests/neon-scenery-plan.test.js` (*N3, N7*).
  - [x] Canal arch, bridge parapets, quay, expressway piers, plaza sculpture and footbridge at their lap positions.
    `tests/neon-scenery-plan.test.js` (*N5 and the landmarks contract*).
  - [x] Canal haze: the white frame over the bridge was the sky dome blooming (72 % of the excess luminance; the sea
    plane's reflection 2.5 %, fog 0), fixed by the step 3 dome gain. The sea plane stays as the canal water.
  - [ ] Canal art gap: over open water the dome shows the HDRI's warm-gold embankment facades where the concept has a
    violet sky behind teal and magenta towers. Options: skyline blocks in front of the dome on the water sectors, or
    a tinted or cropped dome (`assets-src/neon-sky/build.py`). Owner to choose.
- [x] **8a Gameplay parity pins.** Course frame, lanes, tunnel extents, shortcut, ring and pickup layout and
  gameplay-prop positions pinned at layout 6, before any Neon asset: `tests/neon-parity.test.js` (4 tests).
  Step 1b re-pins them once, at layout 7; after that no art step may move them.
- [x] **8b Fallback and develop-look guards on today's scene.** `tests/neon-look-browser.spec.js`: Neon on Low under
  `?look=3d` and Neon on High without the gate keep sea, towers, skyline, RoomEnvironment and an identity grade, and
  fetch no HDRI, KTX2 or Coast/Neon model; Neon on High under the gate compiles nothing after GO and draws no Coast
  scenery. 24 of 24 under CI timing (`--repeat-each=8 --workers=4 --retries=0`).
- [x] **8c N6 draw-call cap** on High (home 540, race 380).
  - [x] Home: 319 calls with both kits (one Mac, 2026-11-15). `tests/neon-look-browser.spec.js` (*stays under the
    draw-call cap on the home showcase*).
  - [x] Race: before, 443 calls at the start and up to 670 mid-lap (the procedural race drew 562 to 564); 108
    traffic cars as separate meshes drew 129 to 430 of them. **Owner decision (2026-11-15):** instance the traffic
    on every classic track. Done in `src/traffic-fleet.ts` (commit `b9500c07`): traffic is 21 draws at any car
    count, plus 6 in the mirror pass. After (one Mac, 2026-11-15): 337 on the grid with every rival in view, 167 to
    219 at one point in each sector. The `test.fixme` is gone: `tests/neon-look-browser.spec.js` (*stays under the
    draw-call cap in every sector of a race*). Not covered: the rivals in view in a mid-lap sector (a teleport
    leaves them on the grid).
- [x] **8d Asset guards**, written with the assets they guard (steps 3 to 6). No missing GLB:
  `tests/neon-city-glb.test.js`, `tests/neon-landmarks-glb.test.js`. Load failure falls back:
  `tests/neon-look-browser.spec.js` (*keeps the procedural city when neon-city / neon-landmarks cannot load*),
  `tests/neon-assets.test.js` (*one kit failing*). No shader compile after GO with both kits and no NaN pixel:
  `tests/neon-look-browser.spec.js` (*compiles nothing after GO*, *draws both kits ... with no NaN pixel*; the scan
  is shared with `tests/black-frame-browser.spec.js` through `tests/helpers/black-frames.js`). Chunk eviction:
  `tests/neon-scenery.test.js` (*two laps evict chunks without new draws, leaks or disposing the GLB resources*).
  `tests/module-size.test.js` passes (`src/neon-scenery.ts` 157 lines, `src/neon-scenery-plan.ts` 140,
  `src/world.js` unchanged at 1001). New browser tests 40 of 40 under CI timing
  (`--repeat-each=8 --workers=4 --retries=0`).
- [ ] **9 Licence review** of every source, owner art approval, `make verify`, exact-HEAD CI.
  - [x] Licence review at `d2a76328`: every `assets-src/neon-*/` folder has a record. `neon-asphalt`,
    `neon-pavement`, `neon-sky` and the seven `neon-city` texture sets are CC0 Poly Haven; `neon-landmarks` is
    project-owned. Shipped files, masters and build scripts match their recorded sha256. The `neon-city` input
    hashes live in `assets-src/neon-city/sources.json` (model manifests carry no `inputSha256`, as for Coast); the
    1k sky source hash is in `assets-src/neon-sky/sources.json` only.
  - [ ] `make verify` at `d2a76328`: red. Typecheck and unit tests pass, World Tour 49 of 49, browser 1114 passed
    and 3 failed: `result-actions-browser.spec.js` (*every frame is slow*), `interactive-tutorial-browser.spec.js`
    (*paused practice 750x342*) and a sub-pixel flake in `crimson-gt-browser.spec.js` (*car picker 390x844*). The
    first two fail the same way on `develop` `4d45cc46` on the same machine (3 of 3 each), so they are not from this
    branch; the third was not compared. Open until they are fixed on `develop`.
  - [ ] Exact-HEAD CI: a feature branch runs the reduced CI only (run 43689372679 for `d2a76328`: unit tests and
    `quality-gate` green, browser and World Tour jobs skipped). The full run needs `develop`.
  - [ ] Owner art approval (steps 3, 5, 6 and 7).

## Step 10: one gameplay highlight per sector (owner brief, 2026-11-15)

Gameplay data, not art: it applies with and without `?look=3d` and on every tier. Only mechanics the game already
has. Road, length, sections, pickups, gameplay props, collision and the record id (`neon@7`, never shipped) stay.

### Lap plan (written before any ring was placed)

One lap is about 36 s for a car that never lifts. The lap alternates a sector that pays with a sector that spends:

| Lap metres | Sector | The player | NITRO | FLY fuel |
| --- | --- | --- | --- | --- |
| 0 to 443 | Boulevard | Launches; random rings as today | first charge from the random rings | full at the start; free to fly |
| 443 to 722 | Rail underpass | Stays on the road under the 4 m roof and takes the inside line | **earns**: a NITRO ring at the exit, and the line's PERFECT LINE | **charged**: the roof forbids FLY, so the road and four charge rings refill it |
| 722 to 1130 | Night market | Swings from kerb to kerb between the traffic lanes | **earns**: a NITRO ring at each kerb | charge rings on the centre line |
| 1150 to 1650 | Market shortcut (as today) | Optional corridor flight over the right lane | cells and a tank, as today | free inside the corridor |
| 1657 to 2330 | Expressway | Holds one lane, flat out | **spends**: a full-width NITRO gate starts the burn, then one ring per 140 m keeps it alive | not used; refills on the road |
| 2330 to 2986 | Canal bridge | Takes off before the arch and flies the centre line over the deck | **earns most**: the richest line of the lap, a risk ring at the crown | **spent**: about 4 s of flight |
| 2986 to 4000 | Violet Plaza and home | Bows out toward the sculpture, clips the inside of the last corner, crosses the line | spends what the bridge paid; a slipstream gate 80 m before the line | refills on the road |

Rules the five lines share:
- Each line is authored: the same rings on every seed, in every mode that reads the track layout. The random layout
  keeps the boulevard, the shortcut corridor and the gaps between the lines.
- Each line clears the random rings across its own span (30 m before its first ring to 30 m after its last), so it
  reads as one target, and is its own PERFECT LINE.
- Ring heights and lanes stay clear of the landmarks: under the 4 m roof in the underpass, inside the arch's clear
  height (14 m) and width (13.5 m) on the bridge. A ring line that would run through a landmark moves; the landmark
  does not.
- The expressway is a 630 m constant right-hand sweep (about 0.0037 rad/m), not a geometric straight, and the centre
  line is fixed. The burn line follows one lane through it, which is straight in lane coordinates.

### As placed (`src/neon-ring-lines.ts`)

| Sector | Lap metres | Gates | Rings and reward |
| --- | --- | --- | --- |
| Rail underpass | 500 to 720 | 5 | four charge rings 1.5 m up on the inside lanes (x 2.5, 7.5, 7.5, 2.5), then a NITRO ring at 720, 30 m past the roof |
| Night market | 790 to 1070 | 5 | kerb, centre, kerb every 70 m: NITRO at x -7.5, 7.5, -7.5, charge on the centre line |
| Expressway | 1800 to 2300 | 5 | one lane (x 7.5) every 125 m: NITRO, NITRO, charge, NITRO, charge |
| Canal bridge | 2538 to 2778 | 5 | centre line in the air, 6.5, 8, 9.5, 8.5 and 7.5 m up: charge, NITRO, risk at the crown (2658), NITRO, charge |
| Violet Plaza | 3220 to 3920 | 11 | bows to x -7.5 past the sculpture court (3340 to 3460), back to the inside of the last corner (NITRO at 3720), a full-width slipstream gate at 3920 |

31 gates, 34 rings. Each line is one PERFECT LINE group. What changed from the plan while placing:

- The clearance is 40 m (`SHAPE_CLEARANCE`, the distance a shape already keeps from a section), not 30 m.
- The market swings go with the S-bends and sit 70 m apart: against the corner push, or at 60 m, a car at NITRO speed
  cannot reach the next ring.
- The expressway has no full-width gate. A row at the start made the bot miss the next ring, and with two authored
  rows a race, rows outnumber trains across the game (`tests/ring-rows.test.js`). Rings sit every 125 m, one second
  at NITRO speed, not 140 m.
- The first bridge ring is 6.5 m up and the far side comes down gently: a gliding car overflies a lower ring.
- The plaza gate is 80 m before the line, as planned.

Evidence (2026-11-15, one Mac):

- [x] Five lines in the course data, RED first: `tests/neon-highlights.test.js`, 9 tests; 8 failed on the old layout
  by assertion, the ninth guards the other nine tracks' ring layouts (unchanged).
- [x] Locks re-pinned with measured numbers: `tests/neon-parity.test.js` (rings 98 → 67), `tests/course-item-density.test.js`,
  `tests/ring-variety.test.js` (bot ring take 63.3% → 75.4%, NITRO/min 24.33 → 24.11 over 12 seeds),
  `tests/scaled-layout.test.js` (Neon singles per grid size), `tests/fixtures/legacy-race-replay.json` (the three Neon
  keys), `tests/ring-authored-sequences.test.js` (the lines on five seeds and four race configs).
- [x] Reachable: the bot takes every line whole on the default seed. Over 12 seeds it takes 56, 60, 51, 60 and 120 of
  60, 60, 60, 60 and 132 gates; every miss is one of a line's first rings, reached from a random ring in a far lane.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` (3104 of 3107 pass, 3 skipped),
  `npm run build`.
- [x] Real WebGL: `tests/neon-look-browser.spec.js`, `tests/ring-sfx-browser.spec.js` and
  `tests/phase5-world-tour-browser.spec.js`, 37 of 37. High draw calls in a race: grid 335, boulevard 195, underpass
  201, market 181, expressway 182, canal 176, plaza 223 (cap 380).
- [ ] Owner playtest of the lap.
- [ ] Phone, portrait and landscape (`make phone-diag`).

Open for the owner:

- Neon carries 67 rings, not 98: a line clears the random rings across its span. Trains fell from 5.4 to 1.3 a race
  and the lines do not scale with the grid (a solo custom race has 34 single rings, not 7).
- A mixed Gauntlet hoop at 2663 replaces the bridge's crown ring (`withHoops`, the older authored rule); that line
  pays PERFECT LINE on its other four rings.
- Endless, Elimination and Event Lab build their own rings and have no sector lines.

## Step 11: the 10 km lap, eight sectors (N7 amended, 2026-11-15)

The route and the rings change for everyone, on every tier and with or without `?look=3d`; the art stays behind the
gate. The record id stays `neon@7` (never shipped). Steps 1b and 10 above record the 4000 m lap as it was built;
where their lap metres differ from this step, this step holds.

### Sectors (`src/neon-scenery-plan.ts`, `NEON_SECTORS`; legs in `src/classic-road-routes.ts`)

| Lap metres | Length | Sector | Road shape |
| --- | --- | --- | --- |
| 0 to 650 | 650 m (+114 m home) | Neon Boulevard | 663 m straight from the line |
| 650 to 1280 | 630 m | Rail underpass | 279 m right-hander (radius 178 m) under the rail tunnel, 690 to 910 (220 m), then a 358 m straight |
| 1280 to 2851 | 1571 m | Night market | four linked bends, 1300 to 2071 (radius 220 to 249 m), then a 780 m straight |
| 2851 to 4351 | 1500 m | Expressway | one constant right-hand sweep (radius 955 m), over water |
| 4351 to 5988 | 1637 m | Harbour (provisional) | 1237 m dead straight on the waterfront, then a 400 m right-hander (radius 255 m) |
| 5988 to 7038 | 1050 m | Canal bridge | straight; the arch at 6500 |
| 7038 to 8750 | 1712 m | Oldtown (provisional) | 300 m right-hander, four linked S-bends 7338 to 8288 (radius 181 to 183 m), a 300 m left-hander to 8627 |
| 8750 to 10 000 | 1250 m | Violet Plaza and home | 980 m straight (from 8627), the last right-hander 9607 to 9886, 114 m to the line |

Peak curvature stays 0.00845 rad/m (the two 279 m corners, as before); the loop closes in position and heading and
does not cross itself (`tests/neon-loop.test.js`).

### Lap plan (written before the harbour and oldtown rings were placed)

One lap is about 90 s for a car that never lifts. A sector that pays is followed by one that spends, and no two
neighbours ask for the same thing:

| Sector | The player | NITRO | FLY fuel | Why it differs from its neighbours |
| --- | --- | --- | --- | --- |
| Boulevard | Launches through traffic; random rings, two footbridges (150, 330) | first charge from the random rings | full; free to fly | the only open, unscripted sector |
| Rail underpass | Stays on the road under the 4 m roof, low rings on the inside of the corner | **earns**: a NITRO ring at the exit (940) | **charged**: the roof forbids FLY | the only sector that forbids flight |
| Night market | Swings kerb to kerb through the bends (1294 to 1574); a swinging gate at 1850; the shortcut corridor 2200 to 2700 over the right lane | **earns**: a NITRO ring at each kerb; cells and a tank in the corridor | free inside the corridor | steering from edge to edge, then an optional flight |
| Expressway | Holds the inside lane of the sweep flat out (3000 to 3500); a closed outer lane at 3950 | **spends**: one ring a second keeps the burn alive | not used; refills | one lane, a constant corner push |
| Harbour | Crosswind from the sea, 4500 to 5300; holds the windward lane on the long straight against it | **spends most**: the longest burn of the lap, ending on a charge | not used: the wind carries a flying car off the line | a straight where the road does not turn but the car is pushed; steering against wind, not a corner |
| Canal bridge | A closed lane at 6040, road works; takes off and flies the centre line over the arch (crown 6500); a gate at 6542 | **earns most**: the richest line of the lap, a risk ring at the crown | **spent**: about 4 s of flight | the only line in the air |
| Oldtown | Weaves apex to apex through the four S-bends (7338 to 8288); a swinging gate at 7813; a rooftop corridor 8290 to 8750 over the left lane with its reward line | **earns**: a NITRO ring on alternate apexes; cells and a tank in the corridor | spent in the corridor (optional) | rhythm: tighter and more bends than the market, and the hidden path is on the other side of the road |
| Violet Plaza and home | Bows out round the sculpture (9400), a diversion at 9480, clips the last corner, crosses the line | **spends** what oldtown paid; a slipstream gate 80 m before the line | refills | the sprint to the flag |

Rules, on top of step 10's:
- Seven authored lines: step 10's five, moved with their sectors and otherwise unchanged, plus a NITRO burn on the
  harbour straight and a weave through oldtown. They do not scale with the grid.
- A random ring keeps 100 m before a line (`LINE_LEAD`) and 40 m after it. At 40 m before, a random ring in a far
  lane cost the first ring of a line on most seeds once the lines were spread over 10 km.
- No stretch of more than 600 m without a ring line, a section, a gameplay prop or a landmark.
- Rings: at least 22 per km on the default seed. Pickups keep the classic density per km.

### Scenery under `?look=3d` (`src/neon-scenery-plan.ts`)

- The six approved sectors keep their kit and landmarks at their new lap metres: portals 698 and 902, rail segments
  from 711.875, expressway piers and parapet from 2857, arch 6500, sculpture 9400, footbridges 150 and 330.
- Water runs from 2848 to 7041: the expressway, the harbour and the canal bridge.
- **Harbour (provisional):** the expressway piers continue under the causeway; a quay promenade (`canal_bank`) runs
  down both sides of the straight, its wall and bollard lamps to the open water; the expressway parapet carries the
  corner up to the canal bridge.
- **Oldtown (provisional):** on land, city kit only: retail and office blocks on a 20 m building line (22 m
  elsewhere), a blade sign on nine fronts in ten, cherry trees down both sides, no tower and no screen.
- **Reserved footprints** (`NEON_RESERVED`) for the two landmarks the concept art will define, with a stand-in from
  the existing kit until then:

  | Sector | Centre, lap metres | Offset from the centre line | Along by across | Stand-in |
  | --- | --- | --- | --- | --- |
  | Harbour | 5560 | 55.2 m left (seaward) | 40 by 72 m | a mole: two rows of quay pieces back to back, 13 m wide, from the quay 72 m out |
  | Oldtown | 7655 | 42 m left (outside of the second S-bend) | 60 by 40 m | an open square: no building, one screen facing the oncoming driver, trees set back |

### Evidence

## By device (repeat per machine; evidence in ignored `../audits/`)

- [x] Desktop Apple silicon baseline for Neon's current look: every selectable map on High and Ultra with p50/p95,
  draw calls and triangles (one Mac, 2026-11-09, Task 5).
- [x] Re-verify the Blender / MCP live scene query on the machine that builds the kit (Phase 0 passes are never
  reused across devices). One Mac, 2026-11-14: addon status and a live scene read both answered; report in
  `../audits/`.
- [x] Desktop p50/p95, draw calls and triangles for the new Neon look, per tier, with and without `?look=3d`, home
  and race (one real-GPU Mac, 2026-11-15, `d2a76328`; table in `../audits/`). High with the look stays under both
  N6 caps; triangles rise by about 80k to 110k on High and Ultra.
- [ ] Phone (`make phone-diag`), portrait and landscape: p50/p95 and a sustained run. Needs the owner's hardware.
  Not verified for Coast either.
- [x] Parity sheet scored by an agent from eight real-GPU desktop captures (grid, six sectors, home) against concept
  frames 03 to 08; sheet and captures in `../audits/`. Lowest scores: signage on the expressway and the canal, and
  the plaza sculpture out of frame.
- [ ] Owner sign-off on the scored sheet (spec v2 §8.1).
