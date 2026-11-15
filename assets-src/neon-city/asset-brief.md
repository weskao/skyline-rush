# Neon Downtown city kit — asset brief

One GLB (`public/models/neon-city/neon-city.glb`, manifest id `neon-city`) holding the 20 modules the Neon
Downtown race places at runtime (Task 5b step 5): close buildings, neon signs and billboards, street furniture
and the far skyline. Everything is modelled by `build.py`; nothing is photoscanned. Placement, lighting, bloom
and the wet road belong to the runtime, not to this asset. Low tier never loads it: the manifest fallback is
`procedural-scenery`.

Reference frames: `docs/designs/3d-pipeline/concept-art/neon-downtown/` (`03-start-finish-boulevard.jpg` for the
glass towers, spire and boulevard furniture, `05-night-market-chicane.jpg` for the tile-roofed shops).

## Sources (all CC0-1.0, Poly Haven)

Wall, roof, bark and metal surfaces are cropped from seven 1K PBR sets (Diffuse, `nor_gl`, `arm`). Windows, shop
interiors, signs, billboards, lanterns, blossom and every emissive pixel are painted by `build/cells.py`
(project work).

| Title | Authors | URL | Licence | Used for (atlas cells) |
| --- | --- | --- | --- | --- |
| Concrete Wall 008 | Charlotte Baglioni, Dario Barresi | https://polyhaven.com/a/concrete_wall_008 | CC0-1.0 | `concrete`, `roof_flat`, kerb, `office_grid` wall |
| Granite Tile 04 | Amal Kumar | https://polyhaven.com/a/granite_tile_04 | CC0-1.0 | `granite`, storefront piers, `retail_upper` wall |
| Plastered Wall 05 | Charlotte Baglioni | https://polyhaven.com/a/plastered_wall_05 | CC0-1.0 | `plaster`, market fronts |
| Black Painted Planks | Dimitrios Savva | https://polyhaven.com/a/black_painted_planks | CC0-1.0 | `planks`, market timber |
| Roof Tiles 14 | Rob Tuytel | https://polyhaven.com/a/roof_tiles_14 | CC0-1.0 | `rooftile` |
| Sakura Bark | Charlotte Baglioni | https://polyhaven.com/a/sakura_bark | CC0-1.0 | `bark` |
| Metal Plate 02 | Rob Tuytel | https://polyhaven.com/a/metal_plate_02 | CC0-1.0 | `steel_dark`, `steel_light` |

sha256 of each downloaded file (`<set>_<map>_1k.jpg`); `sources.json` holds the same values with URL and byte
size, and `build.py` refuses a cache file whose hash differs:

| Set | Diffuse | nor_gl | arm |
| --- | --- | --- | --- |
| `concrete_wall_008` | `a203166d280d3cfc6a91bbc9ffdae406eb9555b4a4f658cd92619063eb17c147` | `83cd3fa2c7cbf4c81402386065daf8fa6f72e1f1f77e02ccb1eedb28496909ae` | `12b8b88bd0a9b303150f45cf0080371d78b7f04744d4ab14030b8958ec7dc2e3` |
| `granite_tile_04` | `b9398f9d9a2b0aa66cb869bbcff4582a686f90aaefb1b03dea872db15369de61` | `985ee06cbf14c8cfdcead64761bc8eaeebe489a5b5572f846d4d5de60407a075` | `ca6e89cd74746435614a361b97a167a037873bb92e980176ba97e1d9e9ab26ad` |
| `plastered_wall_05` | `b10e2fc12c6f6bb8a355fe7c5d6eab19222337414ce055df0701e75f5f603764` | `560ca5b81f8c37a1bf9d44f9d20adc983d1cad3a7c6aa23835a1e1c1b63da98f` | `9b71c8e72e1f5ff6965b9a8b58f6de338045828001f22143d77e056f7c2ea464` |
| `black_painted_planks` | `47ce0f57b7ae902f4eb194e70569a0da34523f1df57ba2c4116216f403c301d2` | `3ea2d1add30314e45036fa8dc5f0f862588e9b260c45592ab332240b4e25a337` | `ed6635bccb61fb1b739fef4b6d7eb7dfa9fe5c0517ec317a251754b19e12cf1e` |
| `roof_tiles_14` | `756217e3dfa9ddfd9d880a9f4938abca7fb7dfcf9b7184949894eed33868ae6f` | `b0478c93821c9cf83b9c0f1ed8c2d46e335b336a2236f7c220364bf0a8bbf30d` | `1970d2156abc65215155d8137bf37234c1cd2755936ba1f884774b719d815495` |
| `sakura_bark` | `07005839dad2b6f729fbcd1b7cf7260819e92b7b4e95bb241452b559dddb6e09` | `01c142d8547ff40219a4abca599842a990aceb4495984bc65aa744f677dd9cc1` | `6818b30aced4603a5b581da2e2bac850179123baef670df55a8c8b22fd40fc4b` |
| `metal_plate_02` | `6e80877d0e9d5973d96298c6091df7ace906b0a6760afc4f3592e4855f3f1d4c` | `58736fbb8aa4fc6690cf8152b174db65caf22a766375b625fb0087e1bc955bc7` | `e099a8385d53f4a515b7e0ce94f85d88657fcac49c23979474f5394b22dd550b` |

Raw sources stay outside the repo in `$POLYHAVEN_CACHE` (default `$HOME/.cache/skyline-rush/polyhaven`).

## Rebuild

```sh
python3 -I assets-src/neon-city/fetch_sources.py                                      # fills the cache, verifies sha256
$BLENDER_BIN --background --factory-startup --python assets-src/neon-city/build.py    # master + textures/
node scripts/assets/export-glb.mjs neon-city
node scripts/assets/optimize-glb.mjs neon-city
node scripts/assets/check-glb.mjs neon-city --promote
node --test tests/neon-city-glb.test.js tests/model-manifest.test.js
```

`build.py` writes `neon-city.blend` (editable master, relative image paths) and `textures/` (the four atlases),
asserts every LOD against `modules.json` and prints `NEON_CITY_SUMMARY` (triangles, footprints, emissive
levels). After a rebuild, update `masterSha256` and `glb.sha256` / `glb.bytes` in the manifest row.

Review renders (git-ignored, `docs/designs/3d-pipeline/audits/neon-city/`): one sheet per module with every
LOD, street views of the buildings and two mock streets.

```sh
$BLENDER_BIN -b assets-src/neon-city/neon-city.blend --python assets-src/neon-city/review.py
```

## Conventions

- Metres. +Y up in glTF (Blender +Z). The street side of every module faces three.js +Z (Blender −Y).
- The pivot is on the ground at the centre of the footprint. Wall-mounted signs keep a ground pivot too: place
  them at the foot of the wall and the sign hangs at its modelled height.
- No alpha, no vertex colour, no animation, no lights. One UV set.
- Signs carry abstract bars and invented glyph shapes only: no lettering, logo or brand.

## Budgets and actuals

Per-LOD triangle budgets live in `modules.json`; `build.py` and `tests/neon-city-glb.test.js` both enforce them.

| Module | LOD 0 | LOD 1 | LOD 2 |
| --- | --- | --- | --- |
| `tower_glass_a` | 681 (700) | 294 (320) | 192 (200) |
| `tower_glass_b` | 361 (500) | 178 (240) | 142 (200) |
| `block_retail_a` | 418 (550) | 106 (150) | 90 (120) |
| `block_office_b` | 436 (550) | 114 (150) | 98 (130) |
| `shop_market_a` | 244 (340) | 88 (120) | 52 (80) |
| `shop_market_b` | 290 (380) | 88 (120) | 58 (80) |
| `sign_blade_a` | 38 (60) | 10 (16) | |
| `sign_blade_b` | 58 (80) | 14 (20) | |
| `sign_stack_a` | 96 (130) | 30 (40) | |
| `billboard_a` | 196 (260) | 50 (70) | |
| `billboard_b` | 54 (80) | 6 (12) | |
| `street_lamp` | 96 (130) | 30 (40) | |
| `traffic_light` | 302 (400) | 45 (60) | |
| `railing` | 152 (200) | 54 (70) | |
| `cherry_tree` | 2,882 (3,200) | 810 (900) | 56 (80) |
| `kerb_redwhite` | 10 (12) | 4 (6) | |
| `skyline_tower_a` | 43 (60) | 18 (24) | |
| `skyline_tower_b` | 36 (50) | 18 (24) | |
| `skyline_tower_c` | 92 (120) | 54 (70) | |
| `skyline_spire` | 109 (110) | 35 (44) | |

GLB: 9,328 triangles in all 47 LOD meshes (budget 11,000), 1,093,972 bytes (budget 1,300,000), max texture
2048 px (budget 2048). One material, four textures: colour 2048 ETC1S sRGB, emissive 2048 sRGB, normal 1024
linear, occlusion/roughness/metal 1024 linear (one ORM image for both slots). Atlas fill 98.2%.

Draw calls (N6, 380 on High shared with road, cars and effects): the kit costs one draw per module LOD that has
at least one instance on screen. All 47 at once is the ceiling; a sector uses only its own modules (table
below), so the boulevard, the heaviest, tops out at 37 and the night market at 17 if every LOD of every module
is visible together. The real figure depends on placement and LOD distances and is not measured here.

## Integration contract

- **File**: `public/models/neon-city/neon-city.glb`, manifest id `neon-city` (`src/model-manifest.ts`), decoders
  meshopt + KTX2, fallback `procedural-scenery`.
- **Scene graph**: `Scene > <module> > <module>_lod<N>`. `<module>` is an empty node at the origin with an
  identity matrix: it is the pivot. Each `<module>_lod<N>` is one mesh with one primitive. Meshopt quantization
  leaves a translation and scale on the mesh node, so build each instance matrix as
  `placement × lodMesh.matrix` (or bake `lodMesh.matrix` into the geometry once); using the geometry without
  it gives a wrongly sized module.
- **Material**: every mesh uses the one material `neon_city` (opaque, single-sided), so one shared material
  instance serves every `InstancedMesh`. Roof overhangs and awnings are single-sided.
- **LODs**: LOD 0 is the full module, each next LOD is strictly lighter. Suggested switch distances (the
  runtime decides): buildings and trees 60 m and 160 m, signs and furniture 45 m, skyline 600 m.
- **Emissive**: `emissiveFactor` [1, 1, 1] with `KHR_materials_emissive_strength` 6; the atlas holds the
  colour and relative level. Linear luminance after the strength, mean over the lit area / peak:

| Surface | Mean | Peak |
| --- | --- | --- |
| Neon tubes: pink, red, violet, amber, cyan, green | 1.52, 1.32, 1.11, 2.65, 4.0, 4.37 | same (flat) |
| Lamp head (`lamp_warm`) | 4.31 | 4.31 |
| Blade signs (`sign_blade_a`, `sign_blade_b`) | 1.54, 0.92 | 5.98, 3.39 |
| Small sign boards (blade b, stack, shops) | 1.25–1.74 | 4.74–5.96 |
| Billboards (`billboard_a`, `billboard_b`) | 0.88, 0.67 | 4.92, 4.72 |
| Storefront glass (retail, office) | 1.04–1.29 | 5.46–5.67 |
| Market shopfronts, lanterns | 1.09–1.11, 1.45 | 3.47–3.75, 2.42 |
| Glass-tower windows (`tower_glass_a`, `_b`) | 0.27, 0.32 | 0.51, 0.61 |
| Office and retail upper windows | 0.33, 0.22 | 0.70, 0.30 |
| Skyline windows (towers a, b, c) | 0.74–0.82 | 1.28–1.46 |
| Cherry blossom | 0.19 | 0.36 |

  Neon, signs, shopfronts and lamps exceed 1 and are the bloom sources. Tower and skyline windows stay near or
  below 1 so the skyline does not bloom into one mass. `billboard_b`'s mean is below 1 because most of the
  panel is dark background; its glyphs peak at 4.72.

### Modules

Footprint is the LOD 0 bounding box in module space (three.js axes, metres); +Z is the street side.

| Module | LODs | Footprint x | Footprint z | Height | Sectors |
| --- | --- | --- | --- | --- | --- |
| `tower_glass_a` | 0–2 | −12.2 … 12.2 | −12.2 … 13.4 | 104.9 | boulevard, violet_plaza |
| `tower_glass_b` | 0–2 | −14.2 … 14.2 | −10.2 … 10.2 | 91.5 | boulevard |
| `block_retail_a` | 0–2 | −12.3 … 12.3 | −6.3 … 7.5 | 21.7 | boulevard, violet_plaza |
| `block_office_b` | 0–2 | −12.35 … 12.35 | −6.25 … 7.6 | 36.2 | boulevard, underpass |
| `shop_market_a` | 0–2 | −4.45 … 4.45 | −4.2 … 5.12 | 8.06 | night_market |
| `shop_market_b` | 0–2 | −4.4 … 4.4 | −3.95 … 4.96 | 8.33 | night_market |
| `sign_blade_a` | 0–1 | −0.15 … 0.15 | −0.75 … 0.75 | 6.0 … 11.6 | boulevard, night_market |
| `sign_blade_b` | 0–1 | −0.15 … 0.15 | −0.75 … 0.75 | 6.0 … 13.0 | boulevard, violet_plaza |
| `sign_stack_a` | 0–1 | −0.25 … 0.25 | −0.45 … 0.52 | 6.95 | night_market |
| `billboard_a` | 0–1 | −5.15 … 5.15 | −1.1 … 0.34 | 8.95 | boulevard, expressway |
| `billboard_b` | 0–1 | −2.68 … 2.68 | −0.3 … 0.4 | 7.82 … 15.98 | boulevard, violet_plaza |
| `street_lamp` | 0–1 | −0.22 … 0.22 | −0.22 … 3.3 | 9.1 | boulevard, underpass, expressway, canal_bridge |
| `traffic_light` | 0–1 | −0.42 … 0.4 | −0.26 … 5.5 | 6.91 | boulevard |
| `railing` | 0–1 | −5 … 5 | −0.19 … 0.19 | 1.36 | boulevard, underpass, night_market, canal_bridge, violet_plaza |
| `cherry_tree` | 0–2 | −3.09 … 3.35 | −2.38 … 2.29 | 6.37 | boulevard, night_market, canal_bridge, violet_plaza |
| `kerb_redwhite` | 0–1 | −2 … 2 | −0.5 … 0.5 | 0.09 | underpass, night_market, violet_plaza |
| `skyline_tower_a` | 0–1 | −16.5 … 16.5 | −16.5 … 16.5 | 226 | boulevard, expressway, canal_bridge |
| `skyline_tower_b` | 0–1 | −16.5 … 16.5 | −10.5 … 10.5 | 169 | boulevard, expressway, canal_bridge |
| `skyline_tower_c` | 0–1 | −17.55 … 17.55 | −17.55 … 17.55 | 156 | boulevard, expressway, canal_bridge |
| `skyline_spire` | 0–1 | −16 … 16 | −16 … 16 | 252 | boulevard, expressway, canal_bridge |

Node names are exactly `<module>` and `<module>_lod0` … `<module>_lod<last>`; the manifest `nodes` array lists
all 67. Sector membership is data in `modules.json` (`sectors` per module) and is a suggestion for dressing,
not a rule.

### Placement notes

- **Buildings**: the storefront, awning and entrance are on +Z. Glass-tower and block podiums are 24.4–28.4 m
  wide; market shops are 8.8–8.9 m wide and read as a row when placed side by side.
- **Blade signs** hang from a wall plane at local z = −0.75 and project toward the street: put the pivot 0.75 m
  in front of the wall. `sign_blade_a` spans 6.0–11.6 m; `sign_blade_b` has a blade at 7.4–13.0 m and a small
  board at 6.0–7.2 m.
- **`sign_stack_a`** is a free-standing 6.95 m post of stacked boards for the market.
- **`billboard_a`** stands on two legs, screen 3.2–8.8 m, facing +Z. **`billboard_b`** is wall-mounted: wall
  plane at local z = −0.3, screen 8.0–15.8 m.
- **`street_lamp`**: column at the pivot, arm reaching toward +Z, head at z 2.2–3.3 m, 9 m up. It emits no
  light; add runtime lights or a baked pool if wanted.
- **`traffic_light`**: 6.8 m column at the pivot, 5.5 m arm toward +Z with heads at z 2.6 and 5.0. Lenses face
  −X, so it is drawn for traffic driving toward +X; rotate it to face oncoming cars. Green is lit.
- **`railing`**: 10 m tile, posts every 2.5 m, cyan marker post at the centre; copies tile end to end along X.
- **`kerb_redwhite`**: 4 m × 1 m tile, 2 m red then 2 m white along X, low lip on the +Z (road) side; copies
  tile end to end along X.
- **`cherry_tree`**: its footprint is the canopy; the trunk stands on the pivot.
- **Skyline**: built for instancing by the hundred behind the close buildings. Window cells are 32 m × 96 m.
- The road is fixed by the route (four lanes of 5 m). Keep every pivot outside the driving corridor and the
  railing line; nothing in this kit is sized to match the road and nothing should be scaled to do so.

## Inferred (not shown in the concept frames)

- Back and side faces of every building, and all roofs seen from above.
- `tower_glass_b` (the slab tower) and `block_office_b` detail: the frames show them only at a distance.
- Real sizes: taken from a 3.6 m office floor, 1.5 m window bay and a 9 m lamp, not from a scale in the art.
- The traffic light and kerb profile; the frames show them small.

## Known shortfalls against the concept

- **Cherry tree**: LOD 0 breaks the crown into 33 clusters on five boughs with gaps between them, shaded dark
  underneath and lit on top, but they are still opaque puffs, not frame 03's airy sprays of single flowers (the
  kit has no alpha, and Poly Haven has no CC0 cherry-blossom scan, so the blossom stays painted). The boughs are
  straight segments. LOD 0 is the heaviest mesh in the kit (2,882 triangles); LOD 2 is a two-lump cap.
- **Spire**: concave and leaning with a slanted crown, but the 32 m footprint (pinned by placement) keeps it
  slimmer than frame 03's broad sail; the triangle budget (110) is spent, so the crown has no neon trim of its own.
  The sign is a lit panel, not readable lettering.
- **Kerb**: flat ramp with red and white paint; no ribbing and no white border line.
- **Glass towers**: closer to frame 03's blue glass (unlit rooms glow dim blue, rain streaks and per-pane
  tilt break the reflections), but more offices are lit than in the frame and the window tile still repeats every
  16 bays.
- **Roof and awning overhangs** are single-sided: seen from below and behind, they vanish.
- **`shop_market_b`**: the sign board is partly hidden by its lean-to roof from low angles.
- **Review renders** have no bloom, rain or road reflection pass, so neon pink reads paler than it will in game.
- Not in this kit: the overpass, road markings, planters, people, vehicles and any animated sign.
