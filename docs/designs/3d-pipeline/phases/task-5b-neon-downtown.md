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
  - [ ] Generator and redistribution licence of the set: the owner has not supplied them.
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
  - [ ] Owner to confirm: Endless, Event Lab and Daily Neon records start fresh on road layout 3 (`neon@3`); the
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
  - [ ] Look-dev by eye and owner art approval: key intensity (2.7 night, 1.55 rain night), bloom and dome gain are
    measured starting values. The lit skyline blooms in the centre sightline until the step 5 city blocks stand in
    front of it. Coast's water plane still shows on Neon under the dome until step 7 hides it.
- [ ] **4 Wet road.** Blender-baked KTX2 city asphalt (base colour sRGB; normal and roughness/AO linear) with lane
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
  - [ ] Underpass lamps in the mirror layer: left out, each mirrored pool is one more draw and the race is over the
    N6 cap (step 8c). Revisit with that decision.
- [ ] **5 City kit in Blender** (`assets-src/neon-city/`): modelled, not photoscanned.
  - [x] Close buildings: six modules (two glass towers, a retail and an office block, two tile-roofed market shops),
    three LODs each, ground pivots, one material on four shared KTX2 atlases, CC0 sources recorded with sha256.
    Commit `0e92ebc7`; `tests/neon-city-glb.test.js`.
  - [x] Neon sign and billboard kit: five pieces in the same GLB; the box accents are hidden while the kit is drawn.
    The GLB's emissive strength (6) clips under the race bloom, so the layer sets 2.4 (`EMISSIVE` in
    `src/neon-scenery.ts`).
  - [x] Street furniture: lamp, traffic light, railing, kerb and cherry tree; the elevated rail is the hero landmark
    (step 6).
  - [x] Far skyline: four low-poly towers, one instanced draw each, in place of the unit boxes on Neon only.
  - [x] Placement: 33 chunks a lap (about 121 m), keyed by lap position and seed, one `InstancedMesh` per piece and
    LOD band, outside the kerbs; both GLBs are in the scene before a race can start, else the procedural city stays.
    `src/neon-scenery-plan.ts`, `src/neon-scenery.ts`; `tests/neon-scenery-plan.test.js` (9 tests),
    `tests/neon-scenery.test.js` (8 tests), RED first. Real WebGL: `tests/neon-look-browser.spec.js` (*draws both kits
    in place of the procedural city, through a race, with no NaN pixel*).
  - [ ] Practice mode drives the legacy straight road, which has no sectors: it keeps the procedural city.
  - [ ] Look-dev by eye and owner art approval. Known from the first captures: street furniture is drawn only near
    the car (N6) and appears at about 360 to 600 m; the pavement is one flat dark material; the kit's kerb doubles
    the procedural kerb through the market; the emissive values are a first pass.
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
  - [ ] Canal look: the water is still Coast's sea plane under the rain-night dome, and the frame washes out white
    over the bridge with or without the kits (capture 2026-11-15). Belongs with the step 3 look-dev.
- [x] **8a Gameplay parity pins.** Course frame, lanes, tunnel extents, shortcut, ring and pickup layout and
  gameplay-prop positions pinned at layout 6, before any Neon asset: `tests/neon-parity.test.js` (4 tests).
  Step 1b re-pins them once, at layout 7; after that no art step may move them.
- [x] **8b Fallback and develop-look guards on today's scene.** `tests/neon-look-browser.spec.js`: Neon on Low under
  `?look=3d` and Neon on High without the gate keep sea, towers, skyline, RoomEnvironment and an identity grade, and
  fetch no HDRI, KTX2 or Coast/Neon model; Neon on High under the gate compiles nothing after GO and draws no Coast
  scenery. 24 of 24 under CI timing (`--repeat-each=8 --workers=4 --retries=0`).
- [ ] **8c N6 draw-call cap** on High (home 540, race 380).
  - [x] Home: 319 calls with both kits (one Mac, 2026-11-15). `tests/neon-look-browser.spec.js` (*stays under the
    draw-call cap on the home showcase*).
  - [ ] Race: 443 calls at the start and up to 670 mid-lap, against 380 (the procedural race drew 562 to 564). The
    kits are 46 of them plus 18 in the mirror pass. The cars are the rest: 108 traffic cars are separate meshes (19
    each) and draw 129 to 430, the player 84, the rivals about 106. No scenery budget meets the cap, so the test
    stays `test.fixme` with these numbers. **Owner decision needed:** instance the traffic (its own task, all
    classic tracks) or set a Neon race cap.
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

## By device (repeat per machine; evidence in ignored `../audits/`)

- [x] Desktop Apple silicon baseline for Neon's current look: every selectable map on High and Ultra with p50/p95,
  draw calls and triangles (one Mac, 2026-11-09, Task 5).
- [x] Re-verify the Blender / MCP live scene query on the machine that builds the kit (Phase 0 passes are never
  reused across devices). One Mac, 2026-11-14: addon status and a live scene read both answered; report in
  `../audits/`.
- [ ] Desktop p50/p95, draw calls and triangles for the new Neon look, per tier, against the baseline above.
- [ ] Phone (`make phone-diag`), portrait and landscape: p50/p95 and a sustained run. Not verified for Coast either.
- [ ] Parity review (spec v2 §8.1) against the N1 reference on a real-GPU desktop; owner sign-off on the scored
  sheet.
