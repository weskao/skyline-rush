# Task 5b — Neon Downtown look development (Blender city kit, wet night road)

Part of `docs/superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md` · **Proposed, not in spec v2**: the spec's
Phase 3 covers Coast and Phase 4 the six course maps; Neon Downtown (classic track `neon`, the second map in
`src/race-tracks.ts`) has no phase and no concept-board panel. Scope tags: `README.md`. Planning only: no code yet.

**Look target:** a generated Neon Downtown concept panel (N1), not made yet. The board has no Neon panel.
**Files (expected):** new `src/neon-*.ts` modules (`src/world.js` is at its legacy line ceiling), `assets-src/neon-*/`,
`public/models/neon-*/`, `public/materials/`, `public/environments/`, the model and material manifests, new tests.
**Produces:** Neon Downtown under `?look=3d` on Medium+ with a Blender-built city, a wet PBR night road with neon
reflections and a matching night sky, with the track frame, lanes, tunnels, obstacles and collisions unchanged.

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
| Gameplay props | Barriers, swinging gates, lane closures, a branch marker (`src/track-themes-classic.ts`); shortcut at 1150–1650 m. Never moved for art. |

## Owner decisions (decided 2026-11-14)

- [x] **N1 Look target: a text-to-image Neon Downtown concept panel.** Pink-violet neon and no lightning, so it reads
  apart from Stormline Megacity (cyan rails, magenta glow, lightning). Generating the panel is step 0 below.
- [x] **N2 Time of day and weather: night and rain night only.** No day, dusk or fog look on Neon.
- [x] **N3 Waterfront: the sea becomes city blocks.** No water treatment on Neon.
- [x] **N4 Bridge towers: removed** from Neon, not rebuilt.
- [x] **N5 Tunnels: modelled in Blender.**
- [x] **N6 Budget: the same caps as Coast.** Today that is the High draw-call cap, home 540 and race 380
  (`tests/coast-scenery-browser.spec.js`). Coast has no recorded triangle cap or per-tier cap beyond High.

N3 and N4 apply to the `?look=3d` look on Medium+; without the gate, and on Low, Neon keeps its sea and towers, as
Coast does for D1 and D2.

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
- [ ] **0 Concept panel (N1).** Generate the Neon Downtown panel with the text-to-image skill: night and rain-night
  views, pink-violet neon, wet road, no lightning. Save it under `../concept-art/`, record its generator and
  redistribution licence in that folder's `README.md`, and add its panel row there. It is concept art: mood only,
  never a geometry source or in-game evidence. Owner approves the panel before step 1.
- [ ] **1 Look brief.** Per panel view: camera, time of day, weather and the spec v2 §8.1 items each shot scores,
  recorded before any change (as `coast-look-brief.md` did). It also fixes which of the two looks (night, rain
  night) each race preset shows.
- [ ] **2 Per-track look config.** Replace the `trackId === 'coast'` checks in the lighting plan and the asset host
  with a per-track entry (environment, road set, scenery layer), so Neon opts in without a second copy of the Coast
  code. RED first: Neon without `?look=3d`, Neon on Low, and Coast under `?look=3d` all render as before.
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
- [ ] **6 Tunnels** (N5): one Blender tunnel-segment GLB (lining panels, light strips, cable trays) instanced along
  the three sections. Section extents and collision stay as they are.
- [ ] **7 Waterfront and towers** (N3, N4): hide the sea plane and the bridge towers on Neon and fill the former
  waterfront side with step 5 city blocks and far skyline.
- [ ] **8 Guards.** Parity tests: course frame, lanes, tunnel extents, shortcut, ring layout and gameplay-prop
  positions unchanged; no missing GLB; Low and load failure fall back; no shader compiled after GO
  (shader-warmup and black-frame specs); chunk eviction without leaks or duplicate draws; the N6 draw-call cap on
  High (home 540, race 380) as a Neon browser test;
  `tests/module-size.test.js`.
- [ ] **9 Licence review** of every source, owner art approval, `make verify`, exact-HEAD CI.

## By device (repeat per machine; evidence in ignored `../audits/`)

- [x] Desktop Apple silicon baseline for Neon's current look: every selectable map on High and Ultra with p50/p95,
  draw calls and triangles (one Mac, 2026-11-09, Task 5).
- [ ] Re-verify the Blender / MCP live scene query on the machine that builds the kit (Phase 0 passes are never
  reused across devices).
- [ ] Desktop p50/p95, draw calls and triangles for the new Neon look, per tier, against the baseline above.
- [ ] Phone (`make phone-diag`), portrait and landscape: p50/p95 and a sustained run. Not verified for Coast either.
- [ ] Parity review (spec v2 §8.1) against the N1 reference on a real-GPU desktop; owner sign-off on the scored
  sheet.
