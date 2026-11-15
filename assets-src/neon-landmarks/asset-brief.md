# Neon landmarks — asset brief

One GLB (`public/models/neon-landmarks/neon-landmarks.glb`, manifest id `neon-landmarks`) with the nine
modelled pieces that give the Neon Downtown lap its four sector landmarks and the boulevard footbridge
(Task 5b steps 6 and 7, asset half). The runtime that places them, hides the sea plane and the old towers,
and draws the canal water is a separate change; this folder delivers assets and data only.

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

Not in the kit: the train, road and deck slabs, canal water, ground, buildings, trees, signs. No piece carries
text, a brand or a logo.

## Sources and licences

Everything is project work, modelled and textured by `build.py` (`build/geo.py`, `build/pieces.py`,
`build/materials.py`); the three atlases under `textures/` are baked from procedural Blender materials.
No third-party geometry, texture, HDRI or font is used, so there is no outside source to record. Manifest
licence: `owned`. Master, script and GLB sha256 are in `src/model-manifest.ts`.

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
$BLENDER_BIN --background --factory-startup --python assets-src/neon-landmarks/build.py   # CPU bake, minutes
node scripts/assets/export-glb.mjs neon-landmarks
node scripts/assets/optimize-glb.mjs neon-landmarks
node scripts/assets/check-glb.mjs neon-landmarks --promote
```

Then record the new master, script and GLB sha256 and the GLB byte count in `src/model-manifest.ts`
(`tests/model-manifest.test.js` compares them). The master is written with `bpy.data.libraries.write`, so
it holds no UI state, absolute path or `.blend1` backup; Blender prints "Library file, loading empty scene"
when it opens, which is expected.

Preview renders (git-ignored, `docs/designs/3d-pipeline/audits/neon-landmarks/`), each shot beside its frame:

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/neon-landmarks/render.py -- [--lod1] [shot ...]
```

## Budgets

Budget N6 allows the whole Neon race 380 draw calls on High. Each piece is one mesh and one material per
LOD; all eighteen meshes share the material `neon_landmarks`. Drawn as one `InstancedMesh` per piece and
LOD, the kit costs at most 18 draws with every piece and both LODs in view, and 2 to 6 in any one sector.

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

| File budget | Allowed | Measured |
| --- | --- | --- |
| Triangles, both LODs of every piece | 16000 | 12420 |
| GLB bytes | 4000000 | 1451000 |
| Largest texture | 2048 px | 2048 px |

Textures (KTX2 in the GLB): base colour 2048 px sRGB, emissive 2048 px sRGB, occlusion-roughness-metal
1024 px linear. The third atlas is an addition to the two the plan names: without it the steel arch and
the sculpture have no metal and no roughness contrast.

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

Above its clear height the arch closes over the road: the ribs lean in to 11 m from the centre line at the
crown (34.8 m up) and the bracing starts 21 m up. The underpass shell stands outside the procedural tunnel
walls and above its roof, so the runtime hides those in the 3D look or they cover the ribs and tiles.

## Integration contract

- File: `public/models/neon-landmarks/neon-landmarks.glb` (meshopt and KTX2 decoders), manifest id
  `neon-landmarks`, fallback `procedural-scenery`.
- Axes: Y up, metres, local -Z = driving direction, +X = driver's right.
- Material: `neon_landmarks` on every mesh. `emissiveFactor` is `[1, 1, 1]`.
- Nodes: each piece is an empty pivot at the GLB origin, unrotated and unscaled, with two mesh children.
  Read `<piece>_lod0` and `<piece>_lod1` geometry for instancing; the pivot name is the piece name.
- Pivot: spanning pieces (`kind: span`) have it on the road centre line at road level; side pieces at the
  centre of their footprint, at the level of the surface they stand on (deck, promenade, plaza).

### Nodes, size and placement

Bounds are min .. max in metres about the pivot, in delivered axes (x right, y up, z back along the road). Lap
distances are those of the 10 km lap (2026-11-15); the meshes did not change.

| Pivot | Meshes | x | y | z | Sector, lap distance (m) | Placement |
| --- | --- | --- | --- | --- | --- | --- |
| `rail_portal` | `rail_portal_lod0`, `_lod1` | -22.0 .. 22.0 | -0.4 .. 10.68 | -9.5 .. 8.09 | rail underpass, 690-910 | 2: at 698 with yaw = road heading (entry), at 902 with heading + 180 deg (exit) |
| `rail_segment` | `rail_segment_lod0`, `_lod1` | -14.9 .. 14.9 | -0.4 .. 7.3 | -7.5 .. 6.0 | rail underpass, 706-894 | 16: at 711.875 + 11.75 k, yaw = heading at the pivot |
| `expressway_pier` | `expressway_pier_lod0`, `_lod1` | -13.4 .. 13.4 | -16.0 .. -1.5 | -1.55 .. 1.55 | elevated expressway and harbour causeway, 2851-5988 | every 36 m on the centre line; hangs below the road |
| `expressway_rail` | `expressway_rail_lod0`, `_lod1` | -0.75 .. 0.45 | -1.6 .. 1.42 | -6.0 .. 6.0 | elevated expressway 2857-4351, harbour corner 5594-5988 | both sides, 13.2 m out, one per 12 m of the rail's own line |
| `canal_arch` | `canal_arch_lod0`, `_lod1` | -19.5 .. 19.5 | -10.0 .. 36.1 | -66.5 .. 66.5 | canal arch bridge, 5988-7038 | 1: at 6500 (mid-span) on the straight |
| `canal_bridge_rail` | `canal_bridge_rail_lod0`, `_lod1` | -0.75 .. 0.43 | -1.3 .. 1.32 | -6.0 .. 6.0 | canal arch bridge, 5990-7038 | both sides, 13.2 m out, one per 12 m |
| `canal_bank` | `canal_bank_lod0`, `_lod1` | -3.5 .. 3.0 | -8.0 .. 1.43 | -6.0 .. 6.0 | canal banks, the harbour quay and its mole stand-in (provisional) | along each bank and down both sides of the harbour straight, one per 12 m, +X toward the water |
| `plaza_sculpture` | `plaza_sculpture_lod0`, `_lod1` | -7.0 .. 7.0 | 0.0 .. 15.07 | -7.0 .. 7.0 | Violet Plaza, 8750-10 000 | 1: 30 m or more left of the centre line near 9400 |
| `boulevard_footbridge` | `boulevard_footbridge_lod0`, `_lod1` | -22.0 .. 22.0 | -0.2 .. 17.38 | -2.84 .. 2.84 | start-finish boulevard, 0-650 | 2: about 150 and 330 on the centre line |

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
