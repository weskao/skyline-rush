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
- [ ] **1b Route reshape (N7).** Done when all of these hold:
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
- [ ] **2b Neon's own entry** in `src/track-look.ts`, and the bloom pick in `src/world.js` (still
  `trackId === 'coast'`). Open: the entry names Neon's HDRIs, road set and scenery GLB, which steps 3–6 produce.
- [ ] **3 Night lighting and sky.** Two CC0 night-city HDRIs (night, rain night), PMREM 256 so no program changes
  mid-race,
  shown on the sky dome; key light matched to the HDRI; bloom threshold set under the neon signs and windows and
  over the sky.
- [ ] **4 Wet road.** Blender-baked KTX2 city asphalt (base colour sRGB; normal and roughness/AO linear) with lane
  paint and a puddle mask, `wetness` driven by the rain preset. Signs, windows and tunnel light strips join the wet
  mirror layer as opaque unlit meshes.
- [ ] **5 City kit in Blender** (`assets-src/neon-city/`): modelled, not photoscanned.
  - [ ] Close buildings: 4–6 facade modules with storefronts, baked emissive window atlas and CC0 PBR wall sets,
    each with LODs and a stable pivot.
  - [ ] Neon sign and billboard kit (emissive, HDR so they bloom and mirror), replacing the box accents.
  - [ ] Street furniture: lamps, traffic lights, barriers, an overpass or elevated rail as the hero landmark.
  - [ ] Far skyline: low-poly towers with an emissive atlas, instanced, replacing the unit boxes on Neon only.
  - [ ] Placement: deterministic 120 m chunks keyed by distance and seed, `InstancedMesh`, outside the driving
    corridor and its railings; loaded before GO.
- [ ] **6 Rail underpass** (N5, N7): one Blender underpass GLB (rail bridge deck, abutments, amber lamps) on the
  `tunnel` section from step 1b. The section's extent and collision follow the route, not the art.
- [ ] **7 Waterfront, canal and towers** (N3, N4, N7): hide the sea plane and the bridge towers on Neon, fill the
  former waterfront with step 5 city blocks and far skyline, and add the canal with its arch bridge and the plaza
  sculpture as sector landmarks.
- [x] **8a Gameplay parity pins.** Course frame, lanes, tunnel extents, shortcut, ring and pickup layout and
  gameplay-prop positions pinned at layout 6, before any Neon asset: `tests/neon-parity.test.js` (4 tests).
  Step 1b re-pins them once, at layout 7; after that no art step may move them.
- [x] **8b Fallback and develop-look guards on today's scene.** `tests/neon-look-browser.spec.js`: Neon on Low under
  `?look=3d` and Neon on High without the gate keep sea, towers, skyline, RoomEnvironment and an identity grade, and
  fetch no HDRI, KTX2 or Coast/Neon model; Neon on High under the gate compiles nothing after GO and draws no Coast
  scenery. 24 of 24 under CI timing (`--repeat-each=8 --workers=4 --retries=0`).
- [ ] **8c N6 draw-call cap** on High (home 540, race 380). The test exists in `tests/neon-look-browser.spec.js` as
  `test.fixme`: the procedural Neon scene draws 162 to 163 at home and 562 to 564 in a race (one Mac, 2026-11-14),
  so the race cap is met only once steps 5 to 7 replace the box skyline and remove the towers.
- [ ] **8d Asset guards**, written with the assets they guard (steps 3 to 6): no missing GLB; load failure falls
  back; Neon in the shader-warmup and black-frame specs under the gate; chunk eviction without leaks or duplicate
  draws; `tests/module-size.test.js` on the new modules.
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
