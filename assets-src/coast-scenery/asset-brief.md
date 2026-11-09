# Coast close scenery — asset brief

One GLB (`public/models/coast-scenery/coast-scenery.glb`, manifest id `coast-scenery`) holding the roadside
kit the Coast race places at runtime (deterministic 120 m chunks, InstancedMesh per node). Low tier never
loads it: its manifest fallback is `procedural-scenery`.

## Sources (all CC0-1.0, Poly Haven)

| Source | URL | Authors | Used for |
| --- | --- | --- | --- |
| Coastal Cliff 01 | https://polyhaven.com/a/coastal_cliff_01 | Rob Tuytel (photography, processing), Rico Cilliers (cleanup) | `cliff_a` |
| Coastal Cliff 02 | https://polyhaven.com/a/coastal_cliff_02 | Rob Tuytel | `cliff_b` |
| Coastal Cliff 04 | https://polyhaven.com/a/coastal_cliff_04 | Rob Tuytel (photography, processing), Rico Cilliers (cleanup) | `sea_arch` (kitbashed) |
| Coast Rocks 05 | https://polyhaven.com/a/coast_rocks_05 | Rob Tuytel | `rock_a`, `rock_b` |
| Palm Bark | https://polyhaven.com/a/palm_bark | Charlotte Baglioni | palm trunk material |
| Metal Plate 02 | https://polyhaven.com/a/metal_plate_02 | Rob Tuytel | guard-rail roughness/normal |

Palm geometry, fronds and the W-beam rail are modelled procedurally by `build/props.py` (project work).
Raw 2K/8K sources stay outside the repo in `$POLYHAVEN_CACHE` (default `$HOME/.cache/skyline-rush/polyhaven`,
filled by `scripts/assets/fetch_polyhaven.py`). `build.py` verifies each file's sha256 against that cache's
`sources.json` before use.

## Rebuild

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/coast-scenery/build.py   # ~50 s
node scripts/assets/export-glb.mjs coast-scenery
node scripts/assets/optimize-glb.mjs coast-scenery
node scripts/assets/check-glb.mjs coast-scenery --promote
```

`build.py` writes `coast-scenery.blend` (editable master, relative image paths) and `textures/`.

## Conventions

- Metric, +Y up in glTF (Blender +Z). Every node's pivot sits at ground contact, centred in plan.
- Scan pieces face Blender -Y = three.js +Z. `guard_rail` beam faces the road at three.js +Z (Blender -Y),
  posts behind it, 12 m long, posts at ±1, ±3, ±5 m, so copies tile end to end every 12 m.
- `sea_arch` is an empty with two linked shells (`sea_arch_front`, `sea_arch_back`, rotated 180°, 4 m apart).
- Scan pieces have a ground skirt (cliffs 2.5 m, rocks 0.4 m) below the pivot, so uneven terrain shows no gap.

## Recipe (scan pieces)

1. Import the 8K-detail scan as HIGH (`merge_vertices=True`, otherwise UV seams split it into islands).
2. LOW = collapse-decimated copy keeping the scan UVs. `rock_b` is the boulder above z = 0.5 m of Coast Rocks 05.
   The arch is the largest Coastal Cliff 04 island, plan-straightened and bent 190° (`bend_arch`).
3. Cycles selected-to-active tangent NORMAL bake of HIGH (geometry + its own normal map) into the LOW UVs
   (cage extrusion / max ray: cliffs 0.4 / 0.9 m, rocks 0.04 / 0.1 m). Lows sharing a map are baked joined.
4. Albedo and ARM are the scan's own maps, resampled. ARM G → roughness, R → glTF occlusion (one ORM image).

## Budgets and actuals

| Node | Tris (budget) | Textures |
| --- | --- | --- |
| `cliff_a` | 11,385 (12k) | 1K diff / ARM / normal |
| `cliff_b` | 11,188 (12k) | 1K diff / ARM / normal |
| `sea_arch` (2 shells) | 18,986 (20k) | 1K diff / ARM / normal |
| `rock_a`, `rock_b` (shared) | 2,718 / 2,176 (3k) | 1K diff, 512 ARM / normal |
| `palm_a`, `palm_b` | 5,154 / 4,482 (6k) | 512 bark diff / normal; fronds use vertex colour |
| `guard_rail` | 408 (1.5k) | 512 roughness / normal (mirrored crop) |

GLB: 56,497 tris, 11 draws, 5,827,256 bytes (budget 6,000,000), max texture 1024 px.

Texture encoding: base colour ETC1S (sRGB), normals UASTC (linear), ARM/roughness ETC1S (linear) through the
`KTX2_SLOT_OVERRIDES` entry in `scripts/assets/optimize-glb.mjs`, then meshopt. Normals dominate the bytes
(~1.1–1.2 MB per 1K UASTC map; gltf-transform applies no RDO to normals), which is why the 4 m rock uses 512 px
normal/ARM (still ~128 px/m, denser than the 41–92 m cliffs at 1K).

## Known limitations

- Stretched skirt/soffit UVs show as vertical streaks on arch close-ups and slightly at rock bases; both are
  read from the road at distance, but a close orbit shows them.
- `cliff_a` texel density is about 11 px/m: soft at point-blank range. A 2K Ultra set is not shipped because
  the manifest `lods` only model high/low; it would need a separate entry and byte budget.
- Fronds are vertex-coloured mesh leaflets without an alpha texture; no wind animation.
- No in-game WebGL capture yet: contact-sheet renders are Blender EEVEE stills, not in-game screenshots.
