# Task 5b — Neon Downtown look development (Blender city kit, wet night road)

Part of `docs/superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md` · **Proposed, not in spec v2**: the spec's
Phase 3 covers Coast and Phase 4 the six course maps; Neon Downtown (classic track `neon`, the second map in
`src/race-tracks.ts`) has no phase and no concept-board panel. Scope tags: `README.md`. Planning only: no code yet.

**Look and route target:** the owner-supplied nine-image set in `../track-profiles/neon-downtown/` (N1 and N7,
2026-11-14); capture recipe in `../neon-look-brief.md`. The board itself has no Neon panel.
**Files (expected):** new `src/neon-*.ts` modules (`src/world.js` is at its legacy line ceiling), `assets-src/neon-*/`,
`public/models/neon-*/`, `public/materials/`, `public/environments/`, the model and material manifests, new tests.
**Produces:** Neon Downtown on Medium and above with a Blender-built city, a wet PBR night road with neon
reflections and a matching night sky. The route itself changes once, for every look and tier (N7): a closed
clockwise loop through the set's six sectors. Lanes, the collision rules and the VFX ports stay as they are.

**Carried over from Task 5 (owner, 2026-11-08 / 2026-11-09):** realistic material quality first; licensed sources
recorded per asset in the manifests; editable `.blend` masters at `assets-src/<asset>/<asset>.blend`; the whole look
was opt-in behind `?look=3d` (`src/look-gate.ts`; historical; gate removed, the quality tier decides now); Low tier and load failure keep today's procedural scene.

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

N3 and N4 apply to the detailed look on Medium and above; on Low, Neon keeps its sea and towers, as
Coast does for D1 and D2. The N7 route does not depend on the tier: a road cannot differ by look, so every player gets it.

## By project (committed once)

Already in place from Tasks 3–5 and usable by Neon as is:
- [x] Blender → GLB / KTX2 asset pipeline with manifests and budget checks (`scripts/assets/`, Task 3).
- [x] `?look=3d` gate (`src/look-gate.ts`, `tests/look-gate.test.js`) (historical; gate removed).
- [x] Ultra tier renders on Neon: all ten selectable maps raced on High and Ultra (Task 5, `ultra-maps-capture`).
- [x] Board effects on Neon: magenta plume tail, thruster glow and contact shadow are track-agnostic; rain wheel
  spray lists `neon` (`src/board-effects.ts`, `src/contact-shadow.ts`).
- [x] Coast building blocks to generalise: HDRI lighting and sky dome (`src/coast-lighting.ts`, `src/coast-sky.ts`),
  KTX2 road with a `wetness` uniform (`src/coast-road-material.ts`), lights-only wet mirror (`src/wet-reflection.ts`),
  GLB chunk layer with eviction (`src/coast-scenery-glb.ts`). All are gated to `trackId === 'coast'` today.
- [x] Neon element inventory (table above).

To do, in order:
- [x] **0 Concept set (N1, N7).** Nine owner-supplied images in `../track-profiles/neon-downtown/` (two overviews, six
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
  - [x] `firestore.rules` deployed (2026-11-16, owner-approved) from `develop` `4fa797bb` (`neon@7` added, 51 ids, cap 60):
    rules tests 3/3 on the local emulator, then `firebase deploy --only firestore:rules` released the rules. Not checked: a
    signed-in production cloud save holding a `neon@7` best.
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
  scenery layer) from `src/track-look.ts`. RED → GREEN: `tests/track-look.test.js` (Neon without `?look=3d` (historical; gate removed), Neon on
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
- [x] **3 Night lighting and sky.** Two CC0 night-city HDRIs (night, rain night), PMREM 256 so no program changes
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
  - [x] Owner art approval of the lighting: key intensity (2.7 night, 1.55 rain night), bloom and the darker dome are
    measured values. Accepted by eye on 2026-11-16 (Step 22).
- [x] **4 Wet road.** Blender-baked KTX2 city asphalt (base colour sRGB; normal and roughness/AO linear) with lane
  paint and a puddle mask, `wetness` driven by the rain preset. Signs, windows and tunnel light strips join the wet
  mirror layer as opaque unlit meshes.
  - [x] Asset: `assets-src/neon-asphalt/` (CC0 Poly Haven Asphalt Track, editable master, bake and preview
    scripts), six KTX2 files in `public/materials/neon-asphalt/`, 2.03 MB at 1K and 8.71 MB at 2K. Commit
    `c1972971`; `tests/neon-asphalt-material.test.js`. Lane paint stays the instanced `laneLines` geometry, as on
    Coast.
  - [x] Runtime: Neon on Medium+ under the gate (historical; gate removed) wears the set, soaked on `track` and `rain`, dry on `night`; a failed
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
  - [x] Owner art approval of the kit. Accepted by eye on 2026-11-16 (Step 22).
  - [ ] Open after the approval: the cherry tree's opaque puffs are cut out in Step 23 (no draw added), but the
    result is not yet seen in a WebGL capture; the spire is limited by its 32 m footprint slot; the emissive values (1.7
    city, 1.5 landmarks) were set before the darker dome and are not yet judged against it; the wet mirror on the
    pavement is a fill-rate cost not yet measured on a phone.
- [x] **6 Rail underpass** (N5, N7): one Blender underpass GLB (rail bridge deck, abutments, amber lamps) on the
  `tunnel` section from step 1b. The section's extent and collision follow the route, not the art.
  - [x] Asset: `rail_portal` and `rail_segment` in `public/models/neon-landmarks/neon-landmarks.glb`, master in
    `assets-src/neon-landmarks/`. Commit `da6111e1`; `tests/neon-landmarks-glb.test.js`.
  - [x] Placed on the section, with the procedural tunnel shell hidden while the kits are drawn; collision still
    reads the route. `tests/neon-scenery-plan.test.js` (*N5 and the landmarks contract*, *the underpass and the
    sculpture court are kept clear*), `tests/neon-assets.test.js` (*all or nothing*), `tests/neon-parity.test.js`.
  - [x] Owner art approval of the underpass in a race capture. Accepted by eye on 2026-11-16 (Step 22).
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
  `?look=3d` and Neon on High without the gate (historical; gate removed) keep sea, towers, skyline, RoomEnvironment and an identity grade, and
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
  - [x] Owner art approval (steps 3, 5, 6 and 7). Accepted by eye on 2026-11-16 (Step 22).

## Step 10: one gameplay highlight per sector (owner brief, 2026-11-15)

Gameplay data, not art: it applies on every tier. Only mechanics the game already
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

The route and the rings change for everyone, on every tier; the art follows the quality tier (Medium and above).
The record id stays `neon@7` (never shipped). Steps 1b and 10 above record the 4000 m lap as it was built;
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

### Scenery on Medium and above (`src/neon-scenery-plan.ts`)

- The six approved sectors keep their kit and landmarks at their new lap metres: portals 698 and 902, rail segments
  from 711.875, expressway piers and parapet from 2857, arch 6500, sculpture 9400, footbridges 150 and 330.
- Water runs from 2848 to 7041: the expressway, the harbour and the canal bridge.
- **Harbour (provisional):** the expressway piers continue under the causeway; a quay promenade (`canal_bank`) runs
  down both sides of the straight, its wall and bollard lamps to the open water; the expressway parapet carries the
  corner up to the canal bridge.
- **Oldtown (provisional):** on land, city kit only: retail and office blocks on a 20 m building line (22 m
  elsewhere), a blade sign on nine fronts in ten, cherry trees down both sides, no tower and no screen.
- **Reserved footprints** (`NEON_RESERVED`) for the two landmarks the concept art will define, with a stand-in from
  the existing kit until then. Superseded: steps 12 and 13 placed both landmarks, so the stand-ins and
  `NEON_RESERVED` are gone; the table is the record of what step 11 shipped:

  | Sector | Centre, lap metres | Offset from the centre line | Along by across | Stand-in |
  | --- | --- | --- | --- | --- |
  | Harbour | 5560 | 55.2 m left (seaward) | 40 by 72 m | a mole: two rows of quay pieces back to back, 13 m wide, from the quay 72 m out |
  | Oldtown | 7655 | 42 m left (outside of the second S-bend) | 60 by 40 m | an open square: no building, one screen facing the oncoming driver, trees set back |

### As placed (`src/neon-ring-lines.ts`, `src/ring-layout.ts`)

49 gates in seven lines. What changed from the plan while placing:

- **Harbour:** seven rings 125 m apart (one a second at NITRO speed) from 4560 to 5310, six NITRO and a charge, all
  in the windward lane (x -7.5): the wind pushes a car that stops steering off the line, never onto it. The first
  ring is 60 m into the wind, so the car is in the lane before the push starts.
- **Oldtown:** eleven rings 70 to 80 m apart from 7350 to 8210, one lane over per ring, always to the outside of the
  bend it sits in, NITRO where a swing ends at the kerb. A 170 m gap clears the swinging gate at 7813; the last ring
  (slipstream) points at the rooftop corridor.
- **Approach rings** (`APPROACH`, 300 m): from 300 to 100 m before a line the random rings sit on the road, in the
  lane of the line's first ring, and are never a risk ring. Without it a ring in the air or in the far lane cost the
  first ring of a line on most seeds.
- **`ringDensity: 1.45`** (rings only): the seven lines take 2.9 km of the lap from the random rings, so 2.5 times
  the slots gave 19 rings a km. Pickups did not move.
- **`shapeOdds: [0.04, 0.4]`:** fewer random rows, more trains; with the default odds over 10 km, rows passed one
  shape in three game-wide (`tests/ring-rows.test.js`).

### Evidence

Measured 2026-11-15 on one desktop machine; per-device numbers and captures are in the ignored `../audits/neon-10km/`.

- [x] Route, RED first: `tests/neon-loop.test.js` re-pinned to 10 000 m, eight sectors of 600 to 1800 m, one tunnel
  of 220 m, peak curvature 0.00845 rad/m, closed and not self-crossing. Route and scenery landed in one commit
  because the scenery tests pin against the route.
- [x] Seven lines, RED first: `tests/neon-highlights.test.js`, 15 tests (harbour lane and wind, oldtown weave,
  approach rings, no gap over 600 m).
- [x] Locks re-pinned with measured numbers (4 km → 10 km with five lines → seven lines): rings 67 → 190 → 233,
  pickups 163 → 375 → 375 (`tests/neon-parity.test.js`, `tests/course-item-density.test.js`); bot ring take 75.4% →
  69.7% → 69.8% and NITRO/min 24.11 → 23.56 → 23.98 over the same 12 seeds (`tests/ring-variety.test.js`); Neon
  singles per grid size 34 / 35 / 39 / 53 → 44 / 58 / 70 / 131 → 63 / 77 / 89 / 156 (`tests/scaled-layout.test.js`);
  `tests/ring-authored-sequences.test.js` (seven lines; the mixed-Gauntlet hoop at 8138 stands in for the oldtown
  ring at 8140); `tests/game.test.js` (an authored line is one group of its own length);
  `tests/fixtures/legacy-race-replay.json` (the three Neon keys). The other fifteen tracks' ring and pickup counts
  did not change.
- [x] Density, default seed: 23.3 rings a km (16.75 on the 4 km lap) and 37.5 pickups a km (40.75). Over 12 seeds:
  229.7 rings a race (215 at least), 12.5 trains and 3.3 rows a race (1.3 and 2).
- [x] Reachable: the bot laps in 87.0 s (36.1 s) and takes every line whole on the default seed and on the 12 seeds.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test`, `npm run build`.
- [x] Real WebGL, `--retries=0`: 231 tests pass in the 32 browser specs that name Neon (4 capture-only tests skip
  by design), among them `tests/neon-look-browser.spec.js` (12, with the procedural city without `?look=3d` (historical; gate removed) and on
  Low), `tests/ring-sfx-browser.spec.js` and `tests/phase5-world-tour-browser.spec.js`; `npm run test:layout`, 59 of
  59. Two locks were stale and are re-pinned: the bend metre in `tests/classic-corners-browser.spec.js` (52300 →
  50580) and the HUD race length in `tests/depth-browser.spec.js` (4.00 → 10.00). Not run: `make verify`, the cloud
  emulator spec.
- [x] High draw calls in a race under `?look=3d` (historical; gate removed), cap 380 (`tests/neon-look-browser.spec.js`): grid 330, boulevard
  191, underpass 178, market 173, expressway 164, harbour 179, harbour mole 167, canal 175, oldtown 177, plaza 203.
- [x] Captures looked at: one per sector, the home showcase and the minimap, High, `?look=3d` (historical; gate removed). Not approved; what
  looks wrong is under *Open for the owner*.
- [x] Owner art approval of the harbour and oldtown (both provisional). Accepted by eye on 2026-11-16 (Step 22).
- [ ] Owner playtest of the 10 km lap.
- [ ] Phone, portrait and landscape (`make phone-diag`).

Open for the owner:

- **Concept art** for the harbour (lap 4351 to 5988; landmark footprint at 5560, 55 m seaward, 40 by 72 m) and for
  oldtown (lap 7038 to 8750; footprint at 7655, 42 m left, 60 by 40 m), and a replacement for
  `09-closed-loop-schematic.png` with the eight sectors.
- **Harbour:** reads as a causeway over open water, not a harbour (railing and bollards only; no land, cranes or
  ships). The HDRI panorama fills the horizon, blurred and oversized, with nothing in front of it; the car and the
  road ahead bloom to white there. The skyline towers stand in the sea. The mole stand-in is a low dark slab.
- **Oldtown:** looks like the boulevard (the same retail fronts, office blocks and cherry trees), nothing old. Bare
  ground inside the bends where the buildings are cleared; the square is a gap with one billboard.
- **Underpass straight** (942 to 1280): identical apartment blocks on both sides.
- Both shortcut corridors draw as a flat pink translucent ramp.
- A mixed Gauntlet hoop at 8138 replaces the oldtown ring at 8140; that line pays PERFECT LINE on its other ten.
- Endless, Elimination and Event Lab build their own rings and have no sector lines (as in step 10).
- `firestore.rules`, the hazard schema (`maxDistance` 100 000) and Event Lab needed no change: the record id stays
  `neon@7` and a 10 km sprint is inside every bound.

## Step 12: the harbour landmarks placed (owner brief, 2026-11-15)

Branch `feature/neon-landmark-placement`. Replaces step 11's provisional harbour: the quay on the right, the mole
stand-in and the harbour row of the reserved-footprint table. Oldtown (its gate, lantern span and clock tower, and
its reserved footprint) moved to `feature/neon-oldtown-dressing`. The near-black containers, hull and brick, and any
rebuild of `neon-landmarks.glb`, moved to `feature/neon-landmark-light`. Nothing here changes without `?look=3d` (historical; gate removed), on
Low or on another track.

### As placed (`src/neon-scenery-plan.ts`, `src/neon-scenery.ts`)

| Piece | Lap metres | Side, offset | Instances |
| --- | --- | --- | --- |
| `harbour_gantry` | 4980, 5240, 5500 (260 m apart) | over the road, 0 m, yaw π | 3 |
| `container_stack` | every 30 m from 4372 to 5588 | right, 27 m, yaw alternating 0 / π | 41 |
| `cargo_ship` | 5560, under the last boom | left (seaward), 40 m, 6 m down to the sea plane | 1 |
| Yard land | 4351 to 5594 (`NEON_YARD`) | right, 12.6 to 260 m | part of the one ground draw |
| Quay promenade | every 12 m from 4357 to 5587 | left only, 16.2 m | 103 |

- The gantries clear every ring and section sign by 40 m or more.
- The ship's footprint clears the road by 27 m or more.
- Collision, VFX ports, rings and shortcut corridors did not move.
- The skyline keeps its draw order. On the harbour it stands only on the yard: 170 to 240 m right of the straight.
  None stands on the left (open sea), or round the corner past the yard, where the right looks 213 to 452 m over
  open water.
- Cars on night and rain night reflect a PMREM of the night HDRI, not the world-fixed studio room. That room had
  bloomed them white on the harbour (car luminance 190 → 110) and the boulevard (106–151 → 69).

### Evidence

Measured 2026-11-15 on one desktop machine; per-device numbers and captures are in the ignored
`../audits/neon-landmark-placement/`.

- [x] RED first, then GREEN:
  - `tests/neon-scenery-plan.test.js`: the yard, the quay on one side, the landmark rows and their clearances, and no
    tower in the sea round the corner (RED at lap 5633, 420 m out);
  - `tests/neon-scenery.test.js`: yard land on the right, open water on the left;
  - `tests/neon-highlights.test.js` and `tests/neon-landmarks-glb.test.js`: the unplaced list is the three oldtown
    pieces (empty since step 13);
  - `tests/neon-lighting.test.js`: the car sky.
- [x] `tests/neon-parity.test.js` hashes unchanged.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` (3127 pass, 0 fail) and
  `npm run build`.
- [x] High draw calls in a race under `?look=3d` (historical; gate removed), cap 380 (`tests/neon-look-browser.spec.js`, 12 of 12 pass). The
  harbour probes moved to the yard and the pieces:

  | Probe | Calls |
  | --- | --- |
  | grid | 329 |
  | boulevard | 191 |
  | underpass | 179 |
  | market | 173 |
  | expressway | 164 |
  | harbour yard 4400 | 169 |
  | harbour gantry 4960 | 184 |
  | harbour ship 5480 | 187 |
  | harbour corner 5750 | 178 |
  | canal | 174 |
  | oldtown | 190 |
  | plaza | 206 |

  At step 11's metres the harbour went from 183 to 172 at 4700, 168 to 170 at 5400, and 184 to 169 at 5750.
- [x] Captures looked at against step 11's: the yard, a gantry, under a gantry, the ship, the corner, the expressway,
  the canal and the plaza. Not approved; see below.
- [x] Owner art approval of the harbour. Accepted by eye on 2026-11-16 (Step 22).
- [ ] Owner playtest.
- [ ] Phone, portrait and landscape (`make phone-diag`).

Still wrong:

- **Harbour sky.** Heading 180°, the straight looks into the brightest wedge of the panorama: longitude −180° to
  −120°, 5 to 15 times the rest of its horizon band, the floodlit Bund fronts. It shows blurred and oversized. The
  sky region measures 122–144 (59–103 in the other sectors), down from 142–147.
  - Turning the sky (`sky.ahead`) does not fix it. The lap drives every heading. The least-driven 60° (210–270°,
    240 m) would cost the grid its Pudong skyline and put the canal and plaza heading (270°, 2370 m) on the wedge's
    edge.
  - Lowering the dome gain dims every sector; halving it gave 108.
  - What remains is a dome rebuild that softens that wedge (`assets-src/neon-sky`), with `sky.horizon` still measured
    on the untouched source so the item-15 gain lock holds.
- **Glow ahead.** The road ahead and the car's hood still glow where the wet road and the car paint mirror that
  wedge: the ahead region is at 155–205 with 3–9% of its pixels white (85–104 elsewhere).
- **Near-black pieces.** The containers, the hull and the gantry undersides are near-black
  (`feature/neon-landmark-light`). The ship's windows are a flat, even grid.
- **Canal towers.** Seen from the corner, the canal's across-the-water skyline still stands in the sea (canal sector,
  not changed here).

## Step 13: oldtown dressed, its landmarks placed (owner brief, 2026-11-15)

Branch `feature/neon-oldtown-dressing`. Replaces step 11's provisional oldtown and the oldtown row of the
reserved-footprint table: with step 12 every landmark piece is placed, so `NEON_LANDMARKS_NOT_PLACED` is empty and
`NEON_RESERVED` is gone (the square's footprint is `NEON_SQUARE`). Nothing here changes without `?look=3d` (historical; gate removed), on Low or
on another track.

### As placed (`src/neon-scenery-plan.ts`)

| Piece | Lap metres | Side, offset | Instances |
| --- | --- | --- | --- |
| `oldtown_gate` | 7058 (the sector starts at 7038) | over the road, 0 m | 1 |
| `lantern_span` | every 24 m from 7345 to 8281 | over the road, 0 m | 40 |
| `lantern_span` | 7637 and 7673 | over the square, 42 m left | 2 |
| `clock_tower` | 7655 | 45 m left, on the square, facing the road | 1 |

- **Oldtown (7066 to 8737):** unbroken rows of the kit's lowest pieces, the timber shops, 17.5 m from the centre
  line, spaced along each row's own line so the inside of a bend has no bare ground. No block, tower, blade sign or
  screen in the sector; no street lamp under the lanterns.
- **Square:** the tower between two lantern strings and four trees, a back row of ten shops and an end terrace of
  four at each side, open to the street.
- **Plaza court:** the sculpture moved in from 36 to 30 m left; three glass towers close the court behind it, a
  screen in each gap, a row of trees down each side.
- **Underpass straight (950 to 1280):** three kinds of block cycled per plot, the right side one on, so no two
  neighbours or facing plots match.
- The lantern spans stop before the rooftop shortcut (8290); no straddling piece stands within 10 m of a gameplay
  prop or over a shortcut corridor. The two shops behind the shortcut's section sign (8225) stand back 4 m.
- Collision, VFX ports, rings and shortcut corridors did not move.

### Evidence

Measured 2026-11-16 on one desktop machine; per-device numbers and captures are in the ignored
`../audits/neon-oldtown-dressing/`.

- [x] RED first, then GREEN: `tests/neon-scenery-plan.test.js` (the gate, the lantern spans and their clearances,
  the square, no gap in a shop row, the stood-back shops at the sign), `tests/neon-landmarks-glb.test.js` and
  `tests/neon-highlights.test.js` (the unplaced list; empty once merged with step 12).
- [x] `tests/neon-parity.test.js` hashes unchanged.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] High draw calls in a race under `?look=3d` (historical; gate removed), cap 380, read by a capture probe with the car held at each point:
  grid 332 at most, underpass straight 192, oldtown 171 to 201 (181 to 195 before), plaza court 208; home 254 (cap
  540).
- [x] Captures looked at against step 11's: the gate approach, the lantern bends, the square and tower, the sign,
  the rooftop corridor, the plaza court and the underpass straight. Not approved; see below.
- [ ] `tests/neon-look-browser.spec.js` with its four new probes (16 in all): not run, on the owner's instruction of
  2026-11-16 that no browser spec runs.
- [x] Owner art approval of oldtown, the square and the plaza court. Accepted by eye on 2026-11-16 (Step 22).
- [ ] Owner playtest.
- [ ] Phone, portrait and landscape (`make phone-diag`).

Still wrong:

- The clock tower's brick was near-black at night, only its faces reading (lit in step 15). Alongside the square
  it sits at the edge of the view: it reads from the bends before it.
- The square and the plaza court stand on the plain paving slab: no pattern, steps or kerb.
- After the S-bends (8288 to 8737) the street has shops and lamps only, with the glass skyline straight behind one
  rank of roofs.
- The road railing runs into the gate's plinths; the recessed shops leave a 4 m notch at the shortcut sign.
- The underpass straight's podium shopfronts are the same along both sides; only the blocks above vary.

## Step 14: harbour sky and white road glare (2026-11-16)

Branch `feature/neon-harbour-sky`. Seen on the first 10 km lap tour: down the harbour straight the sky was a wall of
blurred yellow buildings and the wet road and the car's hood were white. Only the Neon night and rain-night rows of
`COAST_ENV_VARIANTS` and the four Neon domes change; Coast's rows and domes are untouched.

- **Cause, sky:** the source panorama's near floodlit embankment buildings (lon -180 to -84, up to about 43 degrees)
  sit at about 10 times the median of the rest of the dome, and the harbour heading looks straight at them.
- **Cause, glare:** the key light was measured on the 1k map, about 90% of it that wall, so it was a sun at 27 to 31
  degrees straight down the heading. Switching off the bloom, the environment, the wet-road mirror and the dome one
  at a time left the glare; only the key removed it.
- **Fix, in the asset build** (`assets-src/neon-sky/build.py`): `FILL` replaces the wedge on the domes with shifted
  whole columns of the far skyline (nothing mirrored, no iconic tower copied); the key is aimed from the filled sky
  (55 degrees at night, 76 in rain) at the same irradiance on the road. The 1k environment maps are byte-identical,
  so the city keeps the wall's glow as ambient. The dome gain of step 8 did not move.
- **Prevention:** `.claude/rules/3d-asset-pipeline.md` item 16; guards below.

### Evidence

Measured 2026-11-16 on one desktop machine; captures and per-probe numbers in the ignored
`../audits/neon-harbour-sky/`.

- [x] RED first, then GREEN: `tests/neon-sky-manifest.test.js` (*no heading's sky is a floodlit wall*, *the key
  light is not the floodlit wall*), `tests/neon-lighting.test.js` (dome pins and the key direction follow the
  manifest).
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] Before and after captures compared by region at High under `?look=3d` (historical; gate removed), rain night: harbour road ahead mean
  luma 210 with 1.3% clipped to 104 with none; car 162 with 5.1% clipped to 72; the other sectors within capture
  noise. Not approved; see below.
- [x] Draw calls: measured in Step 20. The change replaces four textures and two light parameters and adds no
  mesh, material, light or pass.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.
- [ ] No capture of Coast, of Neon on Low (was: without `?look=3d`; historical; gate removed), of Ultra (8K dome) or of a phone.
- [x] Owner art approval of the harbour sky. Accepted by eye on 2026-11-16 (Step 22).

Still wrong:

- The far skyline on the dome is soft, bokeh more than a skyline, at High (4K dome); Ultra was not captured.
- On a dry night the view ahead over the gantries is near-black, with the skyline only to the left.
- The wet road at the harbour keeps a warm tan sheen from the overhead key; the puddles do not reflect the neon.
- The fill leaves faint vertical haze columns at its seams and one repeated tower 150 degrees from its source.

## Step 15: harbour and oldtown landmarks lit for game night (2026-11-16)

Branch `feature/neon-landmark-light`. The container stacks, the ship, the oldtown gate and the clock tower were
silhouettes at night: their walls' emissive was zero. No real-time light, draw call, node or material is added.

- **Baked work light** (`assets-src/neon-landmarks/build/lighting.py`): yard masts, berth floods and warm street
  floods exist only while Blender bakes a `work` pass into the sectors emissive atlas, then are deleted. The atlas
  stores albedo times that light, so each texel keeps its own material. Lamp texels take none, so their level and
  bloom margin are unchanged. Lamp spill plus work light is capped (`LIT_MAX` 0.35 stored, 0.525 at runtime, under
  the 0.9 bloom threshold).
- **Ship:** hull albedo raised; deck cargo repacked so its containers carry 10.74 texels per metre (5.02 before)
  against the stack's 12.08.
- `harbour_gantry` and `lantern_span` are unchanged. Kit A's atlases are byte-identical.
- GLB structure unchanged (45 nodes, 27 meshes, 2 materials, 7 images, 0 lights); 3 880 908 to 3 959 896 bytes of
  a 4 000 000 limit; 29 990 of 32 000 triangles.

### Evidence

Measured 2026-11-16 on one desktop machine; captures and numbers in the ignored `../audits/neon-landmark-light/`.

- [x] RED first, then GREEN: `tests/neon-landmarks-glb.test.js` (*the harbour and oldtown walls show their material
  at game night*, *the containers on the ship deck carry the stack's texel density*) and the manifest pins.
- [x] Wall `lit` in `contract.json` `surfaces`, 0 before: stack containers 0.055, ship containers 0.099, hull 0.039,
  gate brick 0.058, gate stone 0.107, tower brick 0.071, tower stone 0.088.
- [x] Sectors emissive: no white texel, none over the bloom; a WebGL probe of each piece (road and hero view,
  night and rain night) shows the over-bloom share and white pixels equal to before.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] Captures looked at, per piece: the stack's colourways and the tower's and gate's brick now read. Not
  approved; see below.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16. The pre-push layout gate did run on this branch's push.
- [x] Draw calls in a race with the relit pieces: measured in Step 20 (structure unchanged).
- [x] Owner art approval. Accepted by eye on 2026-11-16 (Step 22).
- [ ] Phone.

Still wrong:

- The stack's white boxes read flat pale grey at hero distance, their corrugation softer than the colour map's.
- The ship's stern and funnel are still dark and its deckhouse bright; at road distance the hull is a dark navy
  mass with a red boot line.
- The baked light is fixed to the authored half of mirrored pieces and ignores the runtime key direction.
- GLB headroom is 40 104 bytes: the next landmark change needs a budget decision first.

## Step 16: plain stretches dressed from the driver's seat (2026-11-16)

Branch `feature/neon-scenery-richness`. Placement only (`src/neon-scenery-plan.ts`; `src/neon-scenery.ts` lets a
placement carry one uniform `scale`). No asset, collision, ring or VFX port moves. It closes step 13's list.

- **Clock tower:** moved to the far end of the square (lap 7678, 30 m out), so it stays within 20 degrees of the
  heading on the approach and 45 degrees alongside. It stood 45 m out at the square's middle and slid out of view.
- **Square and plaza court:** stone aprons of `canal_bank`; the sculpture at 1.5 times its modelled size.
- **After the S-bends (8300 to 8720):** 20 lantern strings along both pavements, clear of the rooftop shortcut.
- **Gate and sign:** the railing stops at the gate plinths; the shops run unbroken past the shortcut sign.
- **Underpass straight:** each block kind has its own street front. **Boulevard:** roof screens on the low blocks.
- **Skyline over the water:** a second rank, staggered and turned, still 300 m or more out.
- **Prevention:** `.claude/rules/3d-asset-pipeline.md` item 19.

### Evidence

Measured 2026-11-16 on one desktop machine; captures and per-probe numbers in the ignored
`../audits/neon-scenery-richness/`.

- [x] RED first, then GREEN: `tests/neon-scenery-plan.test.js` (the tower's bearing, the railing at the gate and
  aprons, the pavement strings, the sculpture, the underpass fronts, the boulevard roofline, the skyline's depth).
- [x] `tests/neon-parity.test.js` hashes unchanged.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] High draw calls under `?look=3d` (historical; gate removed), read by a capture probe: race 332 at most (rain, underpass), cap 380; home
  255, cap 540.
- [x] Before and after captures looked at, night and rain night, 19 probes. Not approved; see below.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.
- [x] Owner art approval. Accepted by eye on 2026-11-16 (Step 22).
- [ ] Owner playtest; phone.

Still wrong:

- The sculpture is hidden until lap 9340; the tower is small from 7450.
- The railing's stop at the gate is proven by test only, not seen in a capture.
- The ground screen at lap 1050 is near-white; the boulevard roofline still repeats.
- The underpass podium needs geometry variants, not only dressing.

## Step 17: sky sharpness, far shore and harbour road (2026-11-16)

Branch `feature/neon-sky-polish`. It closes step 14's list. Only Neon's domes, 1k maps and lighting rows change;
`src/coast-sea.ts` gains a `mirrorLod` uniform whose Coast values reproduce the old sampling.

- **Soft skyline, cause:** `SOFTEN` blurred every texel below 22 degrees to hide LED text. It now masks by chroma
  and peak, so only the LED facades are softened (sharpness at night 0.447 of a source 0.574).
- **Tan wet road, cause:** the domes hid the floodlit wall but the 1k maps kept it, and the wet road mirrors the 1k
  map. The fill now applies to both, with the removed light returned overhead so the horizontal irradiance holds
  (night 2.085 to 2.076).
- **Fill:** a low far shore of whole shifted columns; no repeated tower within one view.
- **Key and water:** key re-aimed from the filled sky; the night water mirrors the skyline sharper.
- **Prevention:** `.claude/rules/3d-asset-pipeline.md` items 17 and 18.

### Evidence

Measured 2026-11-16 on one desktop machine; captures and per-probe numbers in the ignored
`../audits/neon-sky-polish/`.

- [x] RED first, then GREEN: `tests/neon-sky-manifest.test.js` (*the 1k map's sky is not a floodlit wall either*,
  *keeps the download's horizontal irradiance*, *only LED facades are softened*), `tests/coast-sea.test.js`
  (*mirrors the skyline sharper*), and the dome, 1k and lighting pins.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] Captures compared by region at High under `?look=3d` (historical; gate removed): rain harbour road 128/105/82 to 80/77/86; dry-night
  harbour road-ahead luma 36 to 44; nothing clipped. Race draw calls 316 at most. Not approved; see below.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.
- [ ] No capture of Coast with the new uniform, of Ultra (8K dome) or of a phone.
- [x] Owner art approval of the sky. Accepted by eye on 2026-11-16 (Step 22).

Still wrong:

- Cloud brightness steps at two fill seams; some lamps soften to blobs.
- The harbour's far shore is low, and its dry-night road is still the darkest on the lap.
- Rain's horizontal irradiance rose (1.434 to 1.613).

## Step 18: landmark and city kit rebuild (2026-11-16)

Branch `feature/neon-landmark-polish`. It closes step 15's list except the baked light's direction. No real-time
light, draw call, node or material is added; pivots, clear spans and footprints do not move.

- **City kit towers:** a lit curtain wall in place of dark boxes with edge trim (`assets-src/neon-city/`).
- **White containers flat, cause:** the tone curve ran on albedo times light, so the lamp spill pushed white paint
  past the roll-off. `build.py` now tone-maps the light and multiplies the albedo afterwards. This path is shared,
  so kit A's atlases changed and were re-pinned RED first; their white, bloom and peak stats did not move.
- **Cargo ship:** stern and funnel floods; masts 18000 to 15000 W for the deck cargo's relief, and five hull floods
  whose cones end under the cargo so the hull is lifted without touching it.
- **Rail underpass:** a structural bay every 6 m on walls and ceiling (kit A).
- **Bytes:** the GLB came out over its limit, so the occlusion-roughness slot of this asset alone takes a stronger
  UASTC RDO (`scripts/assets/optimize-glb.mjs`). 3 959 896 to 3 849 128 bytes; the 4 000 000 limit did not move.
- The same merge brings `develop` in. `tests/fixtures/legacy-race-replay.json` keeps `develop`'s hash for every
  track; Neon's three are re-recorded from the merged code (the 10 km lap on `develop`'s contact rules).

### Evidence

Measured 2026-11-16 on one desktop machine; build logs and RED logs in the ignored `../audits/neon-landmark-polish/`.

- [x] RED first, then GREEN: `tests/neon-landmarks-glb.test.js` (*the cargo ship shows its hull, stern and funnel*,
  *the light containers keep their corrugation*, *a structural bay every 6 m*), `tests/optimize-glb-steps.test.js`,
  `tests/neon-city-glb.test.js` and the manifest pins.
- [x] `contract.json`: ship containers relief 0.877 to 0.951 (floor 0.95), hull `lit` 0.0557 (floor 0.055), hull
  ends 0.0444 (floor 0.03); stack containers relief 0.972. Sectors emissive: no white texel, none over the bloom.
- [x] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test` and `npm run build` on the merge.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.
- [x] Draw calls on High with the rebuilt pieces, 13 probes per weather: race 332 at most in rain (underpass,
  700 m) and 296 at night, home 259 (caps 380 and 540).
- [x] WebGL captures looked at, night and rain: underpass 800 m (ribs and bays read), expressway 3300 m (towers
  carry lit windows), harbour 4950 to 5450 m (containers, gantries, ship hull and deckhouse read).
- [x] Owner art approval. Accepted by eye on 2026-11-16 (Step 22).
- [ ] Phone.

Still wrong:

- Dry night, harbour straight, the white bar on the player car's rear deck: fixed in Step 19.

- Two guards hold by thin margins (relief 0.951 of 0.95, hull 0.0557 of 0.055): the next lighting change to the
  ship re-measures both.
- The baked light is the same for every yaw and ignores the runtime key direction; a fix needs a shader change.
- The occlusion-roughness atlases carry stronger compression; not compared by eye against the old ones.

## Step 19: the night key on a street axis (2026-11-16)

Owner decision of 2026-11-16: turn the night key onto a street axis. It closes step 18's rear-deck glint.

- **Cause, measured:** the bar is the player car's sloped rear deck mirroring the key into the chase camera. It
  shows when the key stands 105 to 150 degrees off the heading, on either side (over the car's shoulder), under
  about 76 degrees of elevation. Step 17's key (elevation 58.2) stood 119 degrees off the harbour heading. Step
  18's reading ("the straight heads toward the key") had the angle wrong. A lane map at 5200 m with a probe key
  gave 160 to 1300 px of luma >= 235 in the car box at 119 degrees and 70 to 240 at 135, and 0 to 7 at 0, 45,
  90, 105, 150, 165 and 180. Raising the key at 119 degrees: 1486 px at 58, 165 at 65, 33 at 70, 5 at 77.
- **Why not a diagonal key:** the lap drives all four street directions, so a diagonal key stands 135 degrees
  off two of them and only moves the bar (measured on the west canal and plaza).
- **Change:** `on_street_axis` (`assets-src/neon-sky/build.py`) turns night's key about the vertical onto the
  street axis nearest its measured azimuth, a 29.1 degree turn to due east on the grid. Elevation, colour and
  intensity are kept; `key.filled` in the manifest keeps the measured direction. The rebuild wrote every sky
  file byte for byte as before: no texture, gain or sha256 pin changed. `src/coast-lighting.ts` takes the new
  `sunDirection` for `night` only; Coast's four rows are untouched.
- **Rain night is not turned.** Its key (elevation 76.7) was swept at four azimuths on every long straight, both
  outer lanes: the car-box numbers did not move with the key, so the key is not what shows there.
- **Prevention:** item 20 of `.claude/rules/3d-asset-pipeline.md` and the two guards below.

### Evidence

Measured 2026-11-16 on one desktop machine, High, 1280x720; captures, numbers and logs in the ignored
`../audits/neon-landmark-polish/`.

- [x] RED first, then GREEN: `tests/neon-lighting.test.js` (*the key light never stands over the car's shoulder on
  a long straight*) failed on the old night row (harbour, 119.1 degrees off) and passes on the new one;
  `tests/neon-sky-manifest.test.js` (*night's is turned onto the nearest street axis*) pins the build's rule.
- [x] Sky rebuild: every shipped file identical; only `manifest.json` (`key`, `scriptSha256`) changed.
- [x] Harbour, dry night, the five probes 4500 to 5450 m: car box 0 px at each (before: 1518, 1097 and 1011 at
  4950, 5200 and 5450 m). Rain night, same probes: 0 to 26 (before 0 to 19).
- [x] Every long straight, both outer lanes, night and rain: no white bar on the rear deck in any capture looked
  at (north boulevard, harbour, west canal, underpass). The car's lit flank reads a little lighter at night.
- [x] `npm run typecheck`, `node --test tests/module-size.test.js`, `npm test` and `npm run build`.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.
- [x] Owner art approval of the turned key (facades, water highlights and shadows under it).
  Accepted by eye on 2026-11-16 (Step 22).
- [ ] Phone; Medium and Ultra.

Still wrong:

- White pixels that are not the key stay in the car box, steady across every key azimuth tried, in both
  weathers: north boulevard (bonus rings, lane dashes and kerb lights behind the car; about 200 to 900 px
  depending on where the rings stand) and the west canal and oldtown gate in the left lane (bollard lamps; about
  50 to 160 px). The box measures the picture around the car, not only its paint. Not chased.
- Rain, plaza, right lane: a probe key directly behind the car gave 126 px where the shipped key gives 2. Not
  explained; the guard lets a key above 76.5 degrees stand anywhere.
- The guard's numbers come from one car body (the Roadster GLB) on one machine at High; a new car body, key or
  lap direction re-runs the lane sweep (item 20).
- Cast shadows from the night key are too faint in the captures to read their new direction.
- `assets-src/neon-sky/build.py` is 414 lines (400 before); asset build scripts are outside the module-size gate.

## Step 20: closing audit (2026-11-16)

Every "Still wrong" entry of steps 12 to 19 and every open item that is not the owner's, checked against fresh
WebGL captures of the lap under `?look=3d` (historical; gate removed) (High, 1280x720, night and rain night, 30 probes each from the grid to
the plaza court). One state per entry:

- **(a)** fixed in this step, RED test first, capture before and after;
- **(b)** already fixed by a later step, with the capture that shows it;
- **(c)** closed as an accepted limit, with the measured constraint beside it.

Captures are observations, not approval. Captures, logs and numbers: ignored `../audits/neon-closing-audit/`
(`before-*` at `44995607`, `after-*` at this step's head).

### Fixed in this step

- **The plaza sculpture on the approach** (`bc061622`). The court's near tree row and the last pavement tree stood
  on the line from every lane to the plinth, and at the landmark kit's strength (1.5) its only lamp, the violet
  rings, sat at a third of the bloom threshold. The near row now splays back, the pavement trees stop 40 m before
  the court, and the sculpture has its own strength (4.5) on a copy of the kit material. No draw added. Rule item
  21; guards `tests/neon-scenery-plan.test.js` (*the sculpture shows on the approach*) and
  `tests/neon-scenery.test.js` (*the sculpture has its own emissive strength*).
- **The street screen beside the car** (`922233ca`). At the city kit's strength (1.7) the screen's graphics stood
  at 1.55x the bloom threshold over 58 m2 of lit texels; passing it on the straight after the rail tunnel
  (1150 m) 28% of its pixels were white (30% in rain). It now has its own strength (1.2): 9% white at night and 15% in
  rain (the box includes the HUD's white text), the picture reads violet with white graphics. No draw added. Rule item 22; guard `tests/neon-scenery.test.js` (*the
  street screen has its own emissive strength*).

### Audit table

| # | Entry (step) | State | Evidence |
| --- | --- | --- | --- |
| 1 | Sculpture hidden until 9340 m (16) | a | `bc061622`; RED `red-sculpture.log`, GREEN `green-sculpture.log`; `14b`, `14c`, `14d` before and after, both weathers: a small violet glow at 9200 m, the lit plinth and lower blades from 9300 m, nothing in front of it at 9360 m |
| 2 | Sculpture's upper blades stay dark steel (found here) | a, step 21 | `a5f06b60`; the blades' median runtime emissive above half height 0.0 to 0.327, under the bloom (0.54 of 0.9); RED `red-landmarks.log`, GREEN `green-landmarks.log`; `14c`, `14d`, `14e` before and after, both weathers |
| 3 | Clock tower small from 7450 m (13, 16) | c | 228 m out it stands about 55 px of 720; it reads at 7550 m and fills the view at 7630 m (`12`, `12b`, `12c`). Only the sculpture is scaled (`tests/neon-scenery-plan.test.js`), and the tower's bearing is guarded (rule 19) |
| 4 | Ground screen at 1050 m near-white (16) | a | `922233ca`; RED `red-screen.log`, GREEN `green-screen.log`; `03c` before and after |
| 5 | Boulevard roofline repeats (16) | b | Step 16's rooftop screens and open plots: `02`, `02b` show towers, blocks and screens at mixed heights |
| 6 | Underpass straight: one podium shopfront both sides (13, 16) | a, step 21 | `43a9ae67`; a round-arched arcade bay on `block_retail_a`, so each side alternates two bay shapes (0.57 / 0.257 against 0.772 / 0.789); city GLB 9 376 of 11 000 triangles, 1 144 956 of 1 300 000 bytes; RED `red-podium.log`, GREEN `green-podium.log`; `03`, `03c`, `03d` before and after, both weathers |
| 7 | Harbour sky wedge, glow ahead, white road (12, 14) | b | Steps 14 and 17 (rules 16 and 18): harbour sky box 6 to 18 of 255 at night (`07` to `07e`), no frame with a white road |
| 8 | Near-black containers, hull, gantry; flat ship windows (12) | b | Steps 15 and 18: colourways and corrugation read at `07`, `07c`; hull, deckhouse and lit windows at `07e` |
| 9 | Far skyline on the dome soft at High (14, 17) | c | Sharpness 0.447 and 0.545 (the two dome sizes) against the source's 0.574 and 0.698: 78%, guard 70% (rule 17). The softness left is the panorama's own. Ultra not captured |
| 10 | Cloud steps at two fill seams, haze columns, one repeated tower (14, 17) | c | The source holds about 72 degrees of generic skyline for 178 of wedge, so the fill repeats; feathers 1 degree at the shore, 8 in the sky; every 30-degree bin within 3x the median (rule 16). Not seen in the 30 driven-heading probes |
| 11 | Some dome lamps soften to blobs (17) | c | The sign mask works by chroma and peak (rule 17) and takes saturated lamps with the LED text; same guard as entry 9 |
| 12 | Harbour far shore low (17) | c | The fill's shore is 3 to 8 degrees so no landmark repeats inside one 90-degree view (rule 18) |
| 13 | Harbour dry-night road the darkest on the lap (17) | c | Road box luma 41 to 42 on the straight; 44 to 71 everywhere else. The key's intensity (2.4532) is set by the sky's road irradiance and its direction by the street axis (rules 16, 20); the quay has bollard lamps, not street lamps (`tests/neon-scenery-plan.test.js`) |
| 14 | View ahead over the gantries near-black (14) | c | Sky box luma 6 to 7 at 4500 and 4720 m. The kit window is 6 chunks (723 m) and the plan keeps towers out of the open sea; the dome there is the filled shore of entry 12 |
| 15 | Wet harbour road warm tan (14) | b | Step 17's filled 1k maps: rain road reads cool grey-violet, about 74/67/74 (`07b`, `07d` rain) |
| 16 | Harbour puddles do not reflect neon (14) | c | They mirror the lamps and the sky; the mirror pass redraws only lit pieces (one draw each, N6) and the straight's stacks are unlit. On the boulevard and the plaza the puddles carry the neon (`02`, `14` rain) |
| 17 | Rain's horizontal irradiance 1.434 to 1.613 (17) | c | Not a defect by capture: rain road box luma 68 to 119, no over-bright frame. The 1k map's irradiance is held to the download's within 0.1% by its guard |
| 18 | Square and plaza court on plain paving (13) | b | Step 16's stone aprons, railing and bollards on the street edge (`12c`, `14d`). Inside, the land is the one ground mesh and pavement set (N3, one draw) |
| 19 | Sparse after the S-bends, 8288 to 8737 m (13) | b | Step 16's lantern strings along both pavements (`13b`, `13c`) |
| 20 | Railing at the gate plinths proven by test only (16) | b | Seen: the railing stops each side of the plinths (`11`, `11b`) |
| 21 | 4 m notch at the shortcut sign (13) | b | The sign's lane is 1.6 m; the shop row reads unbroken past it (`13`) |
| 22 | Canal: warm-gold embankment on the dome, not the concept's violet sky (12, parity sheet) | b | Choice: kit skyline in front of the dome, not a tinted dome. A tint is a sky rebuild (every pin moves, the 1k map and the key with it) for one sector; the towers carry the concept's teal and magenta, add no texture and leave Coast alone. `08`, `08b`, `08c`: towers frame both sides |
| 22b | A small warm patch of dome still shows through the arch (found here) | c | The same choice: closing it is the sky rebuild above, or a tower on the road's own line, where the route and its rings run |
| 23 | Across-the-water skyline stands in the sea (12) | c | The canal is over water (N3, N7) and the land is one mesh; the far towers are sunk 6 to 66 m and turned so they read as a far waterfront (`08b`). A bank under them is a second ground mesh |
| 24 | Cherry tree reads as opaque puffs (18) | step 23, capture pending | Cut-out blossom on the tree's own pools: alpha test, no blending, no draw added, one program added. Seen at `02b`, `03c`; the after captures are not taken yet |
| 25 | Emissive 1.7 city, 1.5 landmarks not judged against the darker dome (18) | b | Judged in this step's captures: tubes, blade signs and parapet bands keep their colour in every probe looked at. The two pieces that did not are entries 1 and 4 |
| 26 | Ship's stern and funnel dark, deckhouse bright (15) | a, step 21 | `a5f06b60`; funnel 0.023 to 0.366 (deckhouse 0.464), stern 0.0444 to 0.0888; the two thin guards now hold by 0.004 (relief 0.954 of 0.95) and 0.013 (hull 0.068 of 0.055); `07e`, `07h`, `07j` before and after |
| 27 | Stack's white boxes flat pale grey (15) | c, step 21 | Lifted, not fixed: white relief 0.972 to 0.980 of the colour map's 1.0. More light costs relief (0.908 at +20% power, guard 0.95) and less light nears the lit floor (0.989 at lit 0.0561, floor 0.05); `07g` reads about the same before and after |
| 28 | Baked light ignores the runtime key and yaw (15, 18) | c | Needs a shader change (step 18); baked lamps are local work lights, the key adds on top |
| 29 | Landmark GLB headroom (15) | c | 117 424 bytes and 1 898 triangles left after step 21's re-bake (3 882 576 of 4 000 000 bytes, 30 102 of 32 000 triangles; entry 2's 29 990 was a stale count); the next landmark change still needs the budget decision |
| 30 | Occlusion-roughness atlases, stronger compression, not compared by eye (18) | c | Not compared against the old atlases here either; no banding or blocking seen on the gantries, stacks or gate in this step's captures |
| 31 | Rain, plaza, right lane: 126 px with a probe key behind the car (19) | c | Not reproduced with the shipped key: no white bar on the rear deck at `14` (night or rain). Still unexplained for a key that does not ship; a new key re-runs the lane sweep (rule 20) |
| 32 | Cast shadows too faint to read (19) | c | The night key is 2.4532 and rain's 1.4737, fixed by the sky's road irradiance (rule 16); the street's own light is emissive and casts none |
| 33 | Steady white pixels, north boulevard and west canal left lane (19) | c | Not a defect: rings, lane dashes, kerb lights and bollard lamps in the measuring box. No white bar on the car in any capture looked at |
| 34 | Guard numbers from one car body on one machine (19) | c | Rule 20: a new car body, key or lap direction re-runs the lane sweep |
| 35 | `assets-src/neon-sky/build.py` 414 lines (19) | c | Asset build scripts are outside the module-size gate; unchanged here |
| 36 | Draw calls not measured (14, 15) | b | Measured here, below |

### Evidence

- [x] RED first, then GREEN, for both fixes (logs named in the table).
- [x] `npm run typecheck`, `node --test tests/module-size.test.js`, `npm test` and `npm run build` after each fix.
- [x] Draw calls on High, 30 probes per weather, the peak of six samples each: race 350 at most in rain (plaza,
  9200 m) and 315 at night, home 257 (caps 380 and 540). Before this step: 332 and 304, home 258. No mesh or pool
  was added: the kit draws the same 23 and 22 pools at 9200 and 9300 m before and after; the rest of the
  difference is how many rivals and effects are in the frame.
- [x] Captures looked at, night and rain, before and after. Not approved.
- [ ] `tests/neon-look-browser.spec.js` and every other browser spec: not run, on the owner's instruction of
  2026-11-16.

### Open

Owner items:

- Art approval of the look (every step's art approval box, and the scored parity sheet).
- Playtest of the 10 km lap.
- Phone, portrait and landscape (`make phone-diag`).
- Approval to merge; until then the look stays opt-in behind `?look=3d` (historical; gate removed).
- The owner's instruction of 2026-11-16 keeps every browser spec not run.

Accepted limits (entries marked c above), by what would lift them:

- A landmark kit budget decision: entry 29. Entries 2 and 26 were fixed in step 21 inside the budget; entry 27
  is held between two guards (step 21).
- A city kit rebuild with a second material: none left. Entry 24 was cut out in step 23 without one; entry 6 was
  fixed in step 21.
- A new panorama or sky rebuild: entries 9 to 12, 14 and 22b.
- A shader or lighting change: entries 13, 28 and 32.
- A second ground mesh or mirror draw against the draw-call caps: entries 16 and 23.
- Not captured in this audit: Medium, Ultra (8K dome), Coast, and Neon without `?look=3d` (historical; gate removed). The two fixes touch
  only the kit layer, which draws nothing outside the look.

## Step 21: landmark re-light and a second podium (2026-11-16)

Four of step 20's accepted limits, reopened: each is fixed inside the existing budgets or closed with the number
that blocks it. No cap, ceiling, triangle or byte limit moved. Captures are observations, not approval. Captures,
logs and numbers: ignored `../audits/neon-landmark-relight/` (`before-*` at `0cfa4dac`; `after-*` at `a5f06b60`;
`podium-after-*` at `43a9ae67`; High, 1280x720, night and rain night, HUD hidden).

- **Entry 2, sculpture blades (`a5f06b60`).** The piece's only baked light was its rings' spill, which ended under
  the fan's upper half. Six violet uplights at the plinth are baked into the sculpture's own texels up to a stored
  ceiling (`FILL`, `assets-src/neon-landmarks/build/lighting.py`): ceiling 0.12 x the piece's strength 4.5 = 0.54,
  under the bloom threshold 0.9. Median runtime emissive above half height 0.0 to 0.327 (whole piece 0.140, light
  paint 0.534). A first pass at 0.64 read milky in capture and was retuned. `14c`, `14d`, `14e`: the blades read
  violet with their facets from about 100 m, in both weathers; before, dark steel over a lit base.
- **Entry 26, ship (`a5f06b60`).** The funnel was hull navy beside a white deckhouse (0.023 against 0.464): it takes
  the crane's light paint, and a stern flood lifts the hull end. Funnel 0.366, stern 0.0444 to 0.0888, hull 0.0557
  to 0.068 (guard 0.055), ship containers' relief 0.951 to 0.954 (guard 0.95; 0.950 to 0.954 across 13 500 to
  35 000 W, so the margin is structural). `07e`, `07h`: the funnel is a light block over the deckhouse and the hull
  end reads blue; `07j`: the hull side a little brighter.
- **Entry 27, stack's white boxes (`a5f06b60`): not fixed, closed on two guards.** White relief 0.972 to 0.980 of
  the colour map's 1.0, lit 0.0603 to 0.0589 (floor 0.05). More light flattens the white: 0.908 at +20% power,
  under the 0.95 guard. Less light restores it only as the stack goes dark: 0.989 at lit 0.0561. `07g` reads about
  the same before and after; the corrugation shows in both.
- **Confinement.** 976 153 emissive texels of the first atlas changed: 244 139 on the sculpture's triangles,
  732 014 in gutters, none on another piece's triangles or within 4 texels of one. A zero-power bake reproduced
  every committed texture bit for bit. Landmark GLB 3 882 576 of 4 000 000 bytes, 30 102 of 32 000 triangles,
  30 draws. Rule item 23.
- **Entry 6, podium (`43a9ae67`).** Both podium cells came from one painter: one flat-headed glazed shopfront in
  two colours. A third 12 m shopfront does not fit the city atlas (98.2% full; a 768 x 288 cell overflows by
  28 px), a 4 m bay does: `arcade()` paints a round-arched bay with a fanlight and a neon arch for
  `block_retail_a`, in the spare width of a row. build.py measures each podium's bay shape (share of the run that
  is opening at 1.8 m and at 3.2 m): 0.772 / 0.789 for the glazed fronts, 0.57 / 0.257 for the arcade. City GLB
  1 104 960 to 1 144 956 of 1 300 000 bytes, 9 328 to 9 376 of 11 000 triangles (the block's podium is cut every
  4 m: 16 more per LOD, 434 / 122 / 106 of 550 / 150 / 120), 47 draws. The painter takes no random numbers, so
  every reviewed cell is painted as before; the atlas packing, and with it all four texture files, moved. `03`,
  `03c`, `03d`: a row of warm arches with pink outlines alternates with the violet glazed fronts on both sides.
  Rule item 24.

### Evidence

- [x] RED first, then GREEN. Landmarks: 3 of 18 fail on the old contract and atlas, then 51 of 51 with the
  manifest, scenery and parity suites. Podium: 1 of 27 fail on the old cells (*three store_glass-shaped podiums in
  a row*), then 70 of 70.
- [x] `npm run typecheck`, `node --test tests/module-size.test.js` (3 of 3), `npm test` (3264 pass, 0 fail,
  3 skipped) and `npm run build` at `43a9ae67`.
- [x] Draw calls on High, the peak of six samples at this step's probes, before and after: night home 256 to 258,
  the straight 164 to 170, harbour 156 to 162, sculpture 190 to 191; rain home 257 to 258, the straight 187 to 192,
  harbour 169 to 174, sculpture 210 to 213 (caps 540 and 380). Within sample noise: no mesh, pool or material was
  added. Step 20's 30-probe run was not repeated.
- [x] Captures looked at, night and rain, before and after. Not approved.
- [ ] Browser specs: not run (owner instruction of 2026-11-16).
- [ ] Not captured: Medium, Ultra, the plaza and boulevard plots that also use `block_retail_a`, and LOD 1 and 2 of
  the arcade up close.

## Step 22: owner decisions at close (2026-11-16)

- [x] Merge into `develop`: approved by the owner on 2026-11-16. The look stays opt-in behind `?look=3d` (historical; gate removed).
- [x] Owner art approval: the owner accepted Neon Downtown's look by eye on 2026-11-16. Every step's art approval
  box is ticked on that basis. The scored parity sheet's sign-off (spec v2 §8.1) is separate and stays open.
- [ ] Owner playtest of the 10 km lap, and the phone measurement in portrait and landscape (`make phone-diag`):
  deferred by the owner as follow-ups.
- [ ] Medium, Ultra, the other selectable cars, the default look compared with `develop`, and shader compiles after
  GO: not measured, on the owner's instruction (no browser runs). Not verified.
- Accepted limits carried forward unchanged: Steps 20 and 21.

## Step 23: cut-out blossom on the cherry tree (2026-11-19)

Owner decision 2026-11-19: build it now, before the phone measurement, and record the desktop numbers before and
after.

- [x] The premise in entry 24 was wrong. A second material does not cost a draw. Every piece is already its own
  pooled `InstancedMesh`, one draw per band. The cherry tree (`prop`) has a near pool and no far pool.
- [x] `src/neon-blossom.ts`: the cherry tree's pool wears its own copy of the city kit material.
  - The copy uses `alphaTest` 0.5, with `transparent` false and `depthWrite` on. The kit's front-face culling stays.
  - Florets are cut out only inside the blossom cell of the atlas (`NEON_BLOSSOM_CELL`). The bark lies outside
    that cell.
  - A puff that turns away from the camera loses more florets, so its outline goes ragged.
  - Where a floret shrinks below a pixel, the cut fades out. That stops the far trees from shimmering.
  - Low draws no kit, so Low is unchanged.
- [x] Guards, RED first:
  - `tests/neon-scenery.test.js` (*cut-out blossom copy*): the cut sits between the colour map and the alpha
    test, no pool is added, other pieces stay opaque, and dispose frees the copy but never the GLB's material.
  - `tests/neon-city-glb.test.js` (*the blossom fills the cell*): on every LOD, the crown is inside the cell and
    the trunk is outside it.
- [x] Before numbers: desktop, headless Chrome, rain-night race at 1440 × 900.
  - Columns: probe, peak draw calls, p50 / p95 ms, triangles.
  - High has 115 programs and Medium has 111.

  | Probe | High | Medium |
  | --- | --- | --- |
  | grid | 321, 20.3 / 24.8, 244,243 | 284, 11.3 / 13.8, 167,318 |
  | boulevard 200 m | 337, 16.5 / 22.8, 205,452 | 307, 11.8 / 13.6, 163,070 |
  | underpass straight 1050 m | 206, 17.4 / 26.6, 236,663 | 302, 11.3 / 13.6, 180,485 |
  | market 1500 m | 191, 13.5 / 16.1, 246,368 | 296, 11.1 / 13.5, 188,999 |
  | oldtown 7600 m | 191, 15.3 / 20.5, 252,398 | 177, 10.5 / 12.5, 177,988 |
  | plaza approach 9200 m | 227, 13.7 / 18.1, 312,668 | 203, 10.3 / 11.3, 230,636 |
  | plaza 9350 m | 213, 14.2 / 17.8, 296,615 | 196, 10.1 / 11.1, 228,321 |

- [ ] After numbers and captures (boulevard and plaza against concept frames `02b`, `03c`): not taken.
  - The owner told us on 2026-11-19 not to run any browser test.
  - Draw calls and triangles are unchanged by construction. The unit test shows no pool is added, and the
    geometry is untouched. So the High race peak stays 337 of 380, but only by reasoning, not by measurement.
  - The extra cost is one shader program and fragment work on the crown. That cost is not measured.
  - `tests/neon-look-browser.spec.js` was not run either.
- [ ] Phone (`make phone-diag`), portrait and landscape: p50 / p95 with the cut-out. Still pending.

## By device (repeat per machine; evidence in ignored `../audits/`)

- [x] Desktop Apple silicon baseline for Neon's current look: every selectable map on High and Ultra with p50/p95,
  draw calls and triangles (one Mac, 2026-11-09, Task 5).
- [x] Re-verify the Blender / MCP live scene query on the machine that builds the kit (Phase 0 passes are never
  reused across devices). One Mac, 2026-11-14: addon status and a live scene read both answered; report in
  `../audits/`.
- [x] Desktop p50/p95, draw calls and triangles for the new Neon look, per tier, with and without `?look=3d` (historical; gate removed), home
  and race (one real-GPU Mac, 2026-11-15, `d2a76328`; table in `../audits/`). High with the look stays under both
  N6 caps; triangles rise by about 80k to 110k on High and Ultra.
- [ ] Phone (`make phone-diag`), portrait and landscape: p50/p95 and a sustained run. Needs the owner's hardware.
  Not verified for Coast either.
- [x] Parity sheet scored by an agent from eight real-GPU desktop captures (grid, six sectors, home) against concept
  frames 03 to 08; sheet and captures in `../audits/`. Lowest scores: signage on the expressway and the canal, and
  the plaza sculpture out of frame.
- [ ] Owner sign-off on the scored sheet (spec v2 §8.1).
