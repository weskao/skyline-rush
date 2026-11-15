# Neon landmarks — asset brief

One GLB (`public/models/neon-landmarks/neon-landmarks.glb`, manifest id `neon-landmarks`) with the fifteen
modelled pieces that give the Neon Downtown lap its sector landmarks and the boulevard footbridge
(Task 5b steps 6 and 7, asset half), plus six pieces for the two sectors of the 10 km lap: `harbour` (after
the expressway, a waterfront NITRO straight of 800 m or more with the road on water) and `oldtown` (after the
canal bridge, linked S-bends between older low buildings). The runtime that places them, hides the sea
plane and the old towers, and draws the canal water is a separate change; this folder delivers assets and
data only. The six new pieces are not placed yet: `NEON_LANDMARKS_NOT_PLACED` in `src/model-manifest-neon.ts`
lists them, and `tests/neon-landmarks-glb.test.js` fails when one is placed without leaving that list.

`contract.json` (written by `build.py`) is the machine-readable form of the "Integration contract" below;
`tests/neon-landmarks-glb.test.js` holds the shipped GLB to it.

## Pieces and the frames they were read from

Concept frames: `docs/designs/3d-pipeline/concept-art/neon-downtown/`. They are perspective paintings, so
they give silhouette, construction and colour; every dimension comes from the road (see "Clearances") or is
inferred.

| Piece | Frame | What it is |
| --- | --- | --- |
| `rail_portal` | 04 | Plate-girder rail deck on splayed concrete abutments, amber strips up the mouth. No train. |
| `rail_segment` | 04 | 12 m of tiled wall, ribbed ceiling and amber strip, with a joint frame over one end |
| `expressway_pier` | 06, 07 | Hammerhead pier under the deck, amber wash lights |
| `expressway_rail` | 06 | Parapet, teal rail, cyan band and a cyan marker post every 6 m |
| `canal_arch` | 07 | Twin leaning steel ribs, hangers, bracing, walkway decks and springing blocks; cyan edges |
| `canal_bridge_rail` | 07 | Deck-edge post-and-rail on a stone kerb, cyan lantern posts |
| `canal_bank` | 07 | Stone quay wall, promenade, railing, amber bollard lamp |
| `plaza_sculpture` | 08 | Six faceted steel blades on a violet-lit stepped plinth |
| `boulevard_footbridge` | 03 | Concrete footbridge on two round columns, pink strips under the deck |
| `harbour_gantry` | none | Ship-to-shore crane straddling the road as a gate: 34 m rail gauge on rail bogies with hazard-striped sills, box legs with X bracing and portal diagonals, ladders, land-side stair tower, gratings with handrails, panelled machinery house, A-frame and stays, trolley and cab with the spreader hung on four ropes, festoon cable loops; sodium work lamps, white floods on the boom, red aviation beacons, one cyan accent line |
| `container_stack` | none | Quay block of 40 ft containers, 1 to 4 high in a stepped skyline: corrugated walls (scan normal map), door ends with lock rods, corner castings, eight paints keyed on the container lattice, worn edges and rust; reefer units with a green status lamp |
| `cargo_ship` | none | Moored 150 m container ship: plated hull with waterline and red boot-top, draft marks, bulwark, hatch covers and lashing bridges, lashing rods, deckhouse with human-scale windows, wheelhouse and wings, funnel, lifeboats on davits, masts, bitts and winches, deck lamp posts with sodium lamps, beacons |
| `oldtown_gate` | none | Street archway: brick piers on a stone plinth with string course and capping, a riveted twin-rib steel truss arch (Warren web), a hung sign frame with four invented glyphs in red neon, bracket lanterns and a restrained warm uplight on each pier |
| `lantern_span` | none | Two cast-iron poles (base, collars, finial, bracket arm) with a sagging cable and seven lanterns in three sizes and three warm hues |
| `clock_tower` | none | Brick shaft with proud stone quoins and courses, four lit dials (10:10) with iron hands, louvred belfry over a window-lit chamber, patina roof and spire, warm uplights |

The harbour and oldtown pieces have no concept frame; they are designed from the brief (realism first,
night and rain night) and reviewed in `render.py` shots on wet ground beside car-sized boxes.

Not in the kit: the train, road and deck slabs, canal water, ground, buildings, trees, signs. No piece carries
text, a brand or a logo.

## Sources and licences

The nine placed pieces are project work, modelled and textured by `build.py` (`build/geo.py`,
`build/pieces.py`, `build/materials.py`); their three atlases (`textures/neon_landmarks_*`) are baked from
procedural Blender materials and are byte-identical to the ones they shipped with before the harbour and
oldtown pieces (`tests/neon-landmarks-glb.test.js` pins them).

The six harbour and oldtown pieces (`build/harbour.py`, `build/oldtown.py`, `build/sector_materials.py`)
bake their own four atlases (`textures/neon_landmarks_sectors_*`) from seven CC0 scanned PBR sets from Poly
Haven, each mapped at its real-world size in world space: rusty painted metal (rust colour of worn
patches), container side (corrugation), metal plate 02 (hull plating), box profile metal sheet (cladding,
roofs), red bricks 04, large sandstone blocks and concrete wall 008. `sources.json` records each set's
URL, authors, licence (CC0-1.0), size in metres, and per file its download URL, bytes and sha256;
`fetch_sources.py` downloads them into a cache outside the repo (`POLYHAVEN_CACHE`, shared helper
`fetch_polyhaven`) and the build refuses a file whose hash differs. Manifest licence: `CC0-1.0` with the
Poly Haven authors. Master, script and GLB sha256 are in `src/model-manifest-neon.ts`.

Reference only (no pixels or geometry taken from them):

| Title | Author | URL | Licence | sha256 |
| --- | --- | --- | --- | --- |
| `03-start-finish-boulevard.jpg` | project concept set | in repo, folder above | not stated in the repo | `0f54961f33313a381abb0f8ed30f6fa86831de053d1f95c049cd42d7b4f28853` |
| `04-rail-underpass.jpg` | project concept set | in repo, folder above | not stated in the repo | `ca709dfb72719ad96dde9d3833ba49080e6cdbab59dac69c528b2c7175048e58` |
| `06-elevated-expressway.jpg` | project concept set | in repo, folder above | not stated in the repo | `78c2dea79a6945f840be3640b1d9f334128d799b9de40d437326df64af780eef` |
| `07-canal-arch-bridge.jpg` | project concept set | in repo, folder above | not stated in the repo | `90627d8f1df726240db8b41c48835dc08299219e2711c034bee9a8b66a2ea1d6` |
| `08-violet-plaza-return.jpg` | project concept set | in repo, folder above | not stated in the repo | `1d0208e52a4115a8909f19761d40d76c672caf5840e5ba3f33f69e4ad9f2b661` |

## Rebuild

```sh
python3 -I assets-src/neon-landmarks/fetch_sources.py   # CC0 scans into the cache; verifies sha256
$BLENDER_BIN --background --factory-startup --python assets-src/neon-landmarks/build.py   # CPU bake, minutes
node scripts/assets/export-glb.mjs neon-landmarks
node scripts/assets/optimize-glb.mjs neon-landmarks
node scripts/assets/check-glb.mjs neon-landmarks --promote
```

Then record the new master, script and GLB sha256 and the GLB byte count in `src/model-manifest.ts`
(`tests/model-manifest.test.js` compares them). The master is written with `bpy.data.libraries.write`, so
it holds no UI state, absolute path or `.blend1` backup; Blender prints "Library file, loading empty scene"
when it opens, which is expected.

Preview renders (git-ignored, `docs/designs/3d-pipeline/audits/neon-landmarks/`), each shot beside its frame;
the `harbour` and `oldtown` shots go to `audits/neon-new-landmarks/` without a frame:

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/neon-landmarks/render.py -- [--lod1] [shot ...]
```

## Budgets

Budget N6 allows the whole Neon race 380 draw calls on High. Each piece is one mesh and one material per
LOD; the nine placed pieces share the material `neon_landmarks`, the six harbour and oldtown pieces
`neon_landmarks_sectors`. Drawn as one `InstancedMesh` per piece and
LOD, the nine placed pieces cost at most 18 draws with every piece and both LODs in view, and 2 to 6 in any
one sector. The runtime builds pools only for placed pieces, so the six unplaced ones add no draw call; once
placed, harbour adds up to 6 draws in its sector and oldtown up to 6 in its.

| Piece | Budget LOD0 / LOD1 (triangles) | Measured LOD0 / LOD1 |
| --- | --- | --- |
| `rail_portal` | 1400 / 600 | 1016 / 420 |
| `rail_segment` | 300 / 300 | 196 / 196 |
| `expressway_pier` | 250 / 250 | 156 / 156 |
| `expressway_rail` | 300 / 250 | 220 / 188 |
| `canal_arch` | 4500 / 3500 | 3768 / 3000 |
| `canal_bridge_rail` | 300 / 200 | 220 / 132 |
| `canal_bank` | 250 / 150 | 172 / 100 |
| `plaza_sculpture` | 900 / 900 | 720 / 720 |
| `boulevard_footbridge` | 900 / 450 | 720 / 320 |
| All near LODs | 12000 | 7188 |
| `harbour_gantry` | 6000 / 2400 | 3030 / 1130 |
| `container_stack` | 1500 / 600 | 636 / 156 |
| `cargo_ship` | 6000 / 2400 | 3224 / 1064 |
| `oldtown_gate` | 6000 / 2400 | 1936 / 640 |
| `lantern_span` | 1500 / 600 | 1012 / 372 |
| `clock_tower` | 6000 / 2400 | 3220 / 1068 |
| New near LODs | 14000 (was 9000) | 13058 |

The six budgets were raised in the second look-dev pass so the pieces can carry real structure (lattice,
stairs, hull plating, masonry): the ship, tower and gate stand once on the lap and the gantry three times,
so each may use up to 6000 near; the repeated container stack and lantern span stay at 1500. Every far LOD
of the six is at most 40% of its near LOD (the build and the test both check it).

| File budget | Allowed | Measured |
| --- | --- | --- |
| Triangles, both LODs of every piece | 32000 (was 24000) | 29908 (was 20416) |
| GLB bytes | 4000000 | 3880908 (was 1715072) |
| Largest texture | 2048 px | 2048 px |

Textures (KTX2 in the GLB), per material:

| Atlas | `neon_landmarks` (nine pieces) | `neon_landmarks_sectors` (six pieces) |
| --- | --- | --- |
| Base colour, sRGB | 2048 px | 2048 px |
| Emissive, sRGB | 2048 px | 1024 px (its lamp spill is baked at 1024 anyway; keeps the GLB under 4 MB) |
| Occlusion-roughness-metal, linear | 1024 px | 1024 px |
| Normal (tangent space, OpenGL), linear | none | 1024 px |

The ORM atlas is an addition to the two the plan names: without it the steel arch and the sculpture have no
metal and no roughness contrast. Thin parts (cables, rails, lamps, the containers' colour) use flat swatch
cells.

LOD1 replaces rail posts and mid rails with one dark panel under the top rail, drops the portal's
stiffeners and track rails, and thins the arch hangers from five sides to three. Its silhouette is the same; the build fails if a LOD goes over its budget.

## Clearances

Measured in the code the pieces stand next to (`tests/neon-landmarks-glb.test.js` pins each number):
`ROAD_HALF = 12` and `STEP = 12` in `src/classic-road-render.ts`; kerb outer edge 12.675 m; procedural
tunnel wall outer face 13.1 m and roof top 4.5 m; `TUNNEL_CEILING = 4` and `CAR_HEIGHT = 1.2` in
`src/game.js`, where altitude is clamped to 0..12 m, so a flying car's roof reaches 13.2 m.

| Piece | Kept clear: half width x height | Must clear | Margin |
| --- | --- | --- | --- |
| `rail_portal`, `rail_segment` | 14.0 x 5.6 m | tunnel wall 13.1 m, roof top 4.5 m | 0.9 m, 1.1 m |
| `canal_arch` | 13.5 x 14.0 m | kerb 12.675 m, flight top 13.2 m | 0.83 m, 0.8 m |
| `boulevard_footbridge` | 14.0 x 14.0 m | kerb 12.675 m, flight top 13.2 m | 1.33 m, 0.8 m |
| `expressway_pier` | everything at or below -1.5 m | road surface | 1.5 m |
| `expressway_rail`, `canal_bridge_rail` | nothing above the road within 12.675 m of the centre line | kerb | 0.23 m |
| `harbour_gantry` | 15.5 x 21.0 m | kerb 12.675 m, flight top 13.2 m | 2.83 m, 7.8 m |
| `oldtown_gate` | 14.0 x 15.0 m | kerb 12.675 m, flight top 13.2 m | 1.33 m, 1.8 m |
| `lantern_span` | 14.0 x 14.0 m (lowest point of the cable sag) | kerb 12.675 m, flight top 13.2 m | 1.33 m, 0.8 m |

The oldtown spans are high, not low: `TUNNEL_CEILING` only caps flight inside `tunnel` sections, so
anything lower than 13.2 m over an open road would hit a flying car.

Above its clear height the arch closes over the road: the ribs lean in to 11 m from the centre line at the
crown (34.8 m up) and the bracing starts 21 m up. The underpass shell stands outside the procedural tunnel
walls and above its roof, so the runtime hides those in the 3D look or they cover the ribs and tiles.

## Integration contract

- File: `public/models/neon-landmarks/neon-landmarks.glb` (meshopt and KTX2 decoders), manifest id
  `neon-landmarks`, fallback `procedural-scenery`.
- Axes: Y up, metres, local -Z = driving direction, +X = driver's right.
- Materials: `neon_landmarks` on the nine placed pieces, `neon_landmarks_sectors` (adds a normal map) on the
  six harbour and oldtown pieces; `contract.json` names each piece's `material`. `emissiveFactor` is `[1, 1, 1]`.
- Nodes: each piece is an empty pivot at the GLB origin, unrotated and unscaled, with two mesh children.
  Read `<piece>_lod0` and `<piece>_lod1` geometry for instancing; the pivot name is the piece name.
- Pivot: spanning pieces (`kind: span`) have it on the road centre line at road level; side pieces at the
  centre of their footprint, at the level of the surface they stand on (deck, promenade, plaza).

### Nodes, size and placement

Bounds are min .. max in metres about the pivot, in delivered axes (x right, y up, z back along the road).

| Pivot | Meshes | x | y | z | Sector, lap distance (m) | Placement |
| --- | --- | --- | --- | --- | --- | --- |
| `rail_portal` | `rail_portal_lod0`, `_lod1` | -22.0 .. 22.0 | -0.4 .. 10.68 | -9.5 .. 8.09 | rail underpass, 470-690 | 2: at 478 with yaw = road heading (entry), at 682 with heading + 180 deg (exit) |
| `rail_segment` | `rail_segment_lod0`, `_lod1` | -14.9 .. 14.9 | -0.4 .. 7.3 | -7.5 .. 6.0 | rail underpass, 486-674 | 16: at 491.875 + 11.75 k, yaw = heading at the pivot |
| `expressway_pier` | `expressway_pier_lod0`, `_lod1` | -13.4 .. 13.4 | -16.0 .. -1.5 | -1.55 .. 1.55 | elevated expressway, 1657-2330 | every 36 m on the centre line; hangs below the road |
| `expressway_rail` | `expressway_rail_lod0`, `_lod1` | -0.75 .. 0.45 | -1.6 .. 1.42 | -6.0 .. 6.0 | elevated expressway, 1657-2330 | both sides, 13.2 m out, one per 12 m of the rail's own line |
| `canal_arch` | `canal_arch_lod0`, `_lod1` | -19.5 .. 19.5 | -10.0 .. 36.1 | -66.5 .. 66.5 | canal arch bridge, 2330-2986 | 1: at 2658 (mid-span) on the straight |
| `canal_bridge_rail` | `canal_bridge_rail_lod0`, `_lod1` | -0.75 .. 0.43 | -1.3 .. 1.32 | -6.0 .. 6.0 | canal arch bridge, 2330-2986 | both sides, 13.2 m out, one per 12 m |
| `canal_bank` | `canal_bank_lod0`, `_lod1` | -3.5 .. 3.0 | -8.0 .. 1.43 | -6.0 .. 6.0 | canal arch bridge, 2330-2986 | along each bank, one per 12 m, +X toward the water |
| `plaza_sculpture` | `plaza_sculpture_lod0`, `_lod1` | -7.0 .. 7.0 | 0.0 .. 15.07 | -7.0 .. 7.0 | Violet Plaza, 3200-3607 | 1: 30 m or more left of the centre line near 3400 |
| `boulevard_footbridge` | `boulevard_footbridge_lod0`, `_lod1` | -22.0 .. 22.0 | -0.2 .. 17.38 | -2.84 .. 2.84 | start-finish boulevard, 0-443 | 2: about 150 and 330 on the centre line |

Not yet placed (the 10 km route is built elsewhere; lap distances follow from it):

| Pivot | Footprint | x | y | z | Side / straddle | Count and spacing |
| --- | --- | --- | --- | --- | --- | --- |
| `harbour_gantry` | 36 x 25 m legs and sills (boom to +74 m) | -38.2 .. 74.0 | -8.0 .. 77.0 | -16.0 .. 16.0 | straddle, pivot on the centre line at road level, yaw = heading (boom over the water on the right; heading + 180 deg if the water is on the left); the stair tower stands on the land side between the legs, to 21.4 m from the centre line | 3 per straight, 260 m apart (2.2 s at 118 m/s); the rail beams reach 8 m below the road onto piles |
| `container_stack` | 10 x 24.4 m | -4.98 .. 4.98 | 0.0 .. 10.4 | -12.22 .. 12.22 | land side, pivot 27 m from the centre line (near face 22 m, clear of the gantry stair tower at 21.4 m; was 25 m) | one per 30 m along the quay, yaw alternately heading and heading + 180 deg |
| `cargo_ship` | 25.8 x 157 m | -12.9 .. 12.9 | -3.0 .. 39.7 | -80.95 .. 75.82 | water side, ship centre line 40 m out, pivot at the waterline | 1, under a gantry boom |
| `oldtown_gate` | 37.2 x 5.4 m | -18.6 .. 18.6 | -0.2 .. 21.3 | -2.71 .. 2.71 | straddle, centre line at road level, yaw = heading; the plinths reach 18.6 m from the centre line | 1, at the sector entry just after the canal bridge |
| `lantern_span` | 30.8 x 0.9 m | -15.42 .. 15.42 | -0.3 .. 18.5 | -0.45 .. 0.45 | straddle, centre line at road level, yaw = heading at the pivot | one per 24 m through the S-bends |
| `clock_tower` | 10.6 x 10.6 m | -5.3 .. 5.3 | 0.0 .. 50.5 | -5.3 .. 5.3 | side, inside of an S-bend, 45 m or more out, ground level | 1; at 50.5 m it reads above the low roofs |

### Clear openings and repeat spacing

- Underpass: 28.0 m wide, 5.6 m high, for the whole 204 m between the portal mouths (470 to 690 m with the
  portals' 8 m forecourts). Segments repeat every 11.75 m; any step from 11.2 to 12 m closes, because each
  segment is 13.5 m long and its joint frame (2.3 m, proud of wall, ceiling and roof) covers the next one's
  end. Checked on the route's tightest radius, 118 m.
- Expressway: rail modules are 12 m and repeat on their own line, so the inside of a corner takes fewer
  than the outside (scale the count by `R / (R -+ 13.2)`). Right side yaw = heading, left side heading +
  180 deg: local -X always faces the road. The fascia covers the deck edge down to -1.6 m; the pier top is
  the deck soffit at -1.5 m, so the road slab between them is the runtime's, 1.5 m deep.
- Arch: 120 m span between springing points, 27.0 m wide and 14.0 m high clear over the road. Walkway decks
  run from 13.6 to 18.0 m each side for 132 m. Springing blocks reach down to -10 m; water at about -6 m.
- Bridge rail and bank modules: 12 m, straight runs. The bank's quay wall reaches -8 m.
- Footbridge: 28.0 m wide and 14.0 m high clear; one module spans the road, placed twice.

### Emissive ranges

The emissive atlas holds two things, both in sRGB at their final relative level: the lamps themselves at
full value, and the light they throw on the piece around them (baked, at most 0.4 of the lamp in linear
terms). The runtime only scales the whole map with `emissiveIntensity`; it adds no light for these lamps.

| Lamp | sRGB colour | On |
| --- | --- | --- |
| amber | 1.00, 0.62, 0.18 | underpass strips and mouth, pier and springing-block wash, bank bollards |
| cyan | 0.10, 0.95, 1.00 | expressway band and markers, arch rib edges, bridge deck edge and lanterns |
| violet | 0.74, 0.22, 1.00 | sculpture plinth rings |
| pink | 1.00, 0.16, 0.72 | footbridge soffit and deck-edge strips |

`contract.json` lists each piece's lamps and every lamp colour under `lamps`.

The harbour and oldtown atlas stores its lamps below full value, at the level `contract.json` lists under
`lamp_levels`, so that at the game's landmark strength (`emissiveIntensity` 1.5, `src/neon-scenery.ts`) no
lamp core clips to white and no texel passes the Neon rain-night bloom threshold (0.9): the cores keep
their colour and the runtime's bloom stays for the light it adds itself. `build.py` measures this on the
stored 8-bit atlas and writes it to `contract.json` under `emissive` (sectors atlas: 0 white texels,
0 over the threshold, peak luminance 0.74; nine-piece atlas, unchanged: 0 white, 4608 texels over).

| Lamp | sRGB colour | Level | On |
| --- | --- | --- | --- |
| sodium | 1.00, 0.58, 0.18 | 0.85 | gantry work lamps under the portal, ship deck lamp posts |
| flood | 0.86, 0.93, 1.00 | 0.6 | gantry boom floods, ship floods |
| beacon | 1.00, 0.12, 0.06 | 1.0 | aviation beacons (gantry, ship masts) |
| accent | 0.10, 0.95, 1.00 | 0.45 | the gantry's one cyan accent line |
| window | 1.00, 0.80, 0.52 | 0.55 | crane cab, deckhouse windows, tower chamber |
| reefer | 0.25, 1.00, 0.35 | 0.6 | reefer status lamps |
| lantern_amber, lantern_red, lantern_gold | 1.00, 0.52, 0.18 / 1.00, 0.27, 0.12 / 1.00, 0.72, 0.36 | 0.95 / 0.95 / 0.8 | span lanterns, gate bracket lanterns, uplights |
| sign | 1.00, 0.20, 0.10 | 0.9 | the gate sign's invented glyphs |
| dial | 1.00, 0.88, 0.66 | 0.5 | clock faces |

Oldtown uses warm lamps only, against the cyan and violet of the rest of the lap.

Suggested `emissiveIntensity`: 1.0 without bloom, up to 3.0 with it; the preview renders use 3.0. Suggested
LOD switch: 120 m for the 12 m modules and the footbridge, 250 m for the portal, arch and sculpture. Neither
suggestion has been tried in the game.

## Where the kit departs from the frames

Judged on the preview renders beside each frame. Those are Cycles renders with plain stand-in road, water
and ground, not the game: no building, tree, rain or bloom is in them, and none of this has been seen in
WebGL.

- **Underpass (04).** The opening is 28.0 x 5.6 m, about 5 : 1; the frame's is about 2.6 : 1. The road is
  24 m wide and the game stops a car's roof at 4 m, so the frame's tall mouth cannot be had without a
  narrower road. The deck is a steel plate girder with stiffeners; the frame shows a deep concrete
  fascia. Inside, one continuous amber strip per wall replaces the frame's separate wall washers.
- **Expressway (06).** The rail is a parapet with a cyan band and small marker posts. The frame's rail is
  taller, three-bar, with large cyan panel posts; ours reads as a continuous cyan line, not as panels.
  Street lamps are not in the kit.
- **Arch (07).** Span 120 m with a rise of 34 m (0.28), sized to the straight it stands on; the frame's
  arch is shorter and steeper, with fatter box ribs. The hangers are 12 cm rods and vanish beyond about
  100 m. The springing blocks are plain wedges.
- **Sculpture (08).** Six blades fan from the plinth as in the frame, but they are slimmer and have fewer
  broad facets. The violet light is the plinth rings and what they throw on the lower blades; the frame
  lights the whole sculpture a saturated magenta-violet, and ours reads a paler, cooler lilac in the preview.
- **Footbridge (03).** The frame's deck is about 7 m up; ours has its soffit at 14.2 m so a flying car
  passes under it. Deck (1.8 m deep) and columns (3.2 m across) were made heavier to match, but it still
  reads taller and more open than the frame's squat bridge, and its ends are free, not built into
  buildings.
- **Bank (07).** Quay wall, coping, railing and bollard lamps only: no steps, planters or trees.

## Harbour and oldtown: departures from the brief

Judged on the `render.py` shots (Cycles, night, wet stand-in ground, car-sized boxes), not in WebGL.

- **Gate silhouette.** The first gate (a roof beam over a tie beam) read close to a shrine gate; the second
  look-dev pass replaced it with a secular street archway (brick piers, riveted steel truss arch, hung sign
  frame with invented glyphs), tied to no one culture's sacred architecture.
- **Container stack instead of a block.** One stack module (10 x 24 m) repeats along the quay instead of a
  single large block: it keeps the triangles low and lets the alternating yaw break the skyline.
- **Gantry as a gate.** A real ship-to-shore crane stands on the quay, not over a road; here its 34 m
  gauge straddles the road (legs at 17 m) and the land leg stands on the quay.
