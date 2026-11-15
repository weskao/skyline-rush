# Neon Downtown pavement (ground material, asset half)

Wet night city pavement for the Neon Downtown ground beside the road: plain grey concrete slabs, 0.6 m x 0.3 m, in a
half-slab running bond. One seamless 7.2 m x 7.2 m tile, baked in Blender from a CC0 scan and encoded to KTX2. Same
maps, packing, colour spaces and KTX2 settings as the Neon road set (`assets-src/neon-asphalt/`). Not wired into the
scene yet: `'Neon ground'` in `src/neon-scenery.ts` is still the flat `#0d1118` plane.

| File | What |
| --- | --- |
| `bake.py` | Builds the tile material in Blender, bakes base colour / normal / packed at 1K and 2K, encodes KTX2, saves the master, prints a `SUMMARY` (hashes, bytes, measured albedo, roughness, puddle coverage) |
| `preview.py` | Cycles renders of the baked PNGs: 3 x 3 tiles from above, and an eye-height sidewalk under the Shanghai Bund night HDRI with neon panels, dry (`night`) and wet (`rain`) |
| `neon-pavement.blend` | Editable master (tile plane `pavement_tile_7.2m` + node material; input images are rebuilt by `bake.py`, not packed) |

## Rebuild

From the repo root, after `python3 -I scripts/assets/fetch_polyhaven.py fetch` (the scan is in its `SOURCES`):

```sh
"$BLENDER_BIN" --background --factory-startup --python assets-src/neon-pavement/bake.py -- <png-dir>
"$BLENDER_BIN" --background --factory-startup --python assets-src/neon-pavement/preview.py -- <png-dir> <out-dir>
```

`bake.py` refuses a cached input whose sha256 differs from the cache's `sources.json`. `-- <png-dir> --no-encode`
writes PNGs and the master only, for look iteration. Needs `toktx` (KTX-Software) on `PATH` for the encode. The preview
needs `shanghai_bund_1k.hdr` (`python3 -I assets-src/neon-sky/fetch.py`); keep its renders out of the repo. After a
rebuild, copy the `SUMMARY` hashes and bytes into the `neon-pavement` entry of `src/material-manifest.ts`, together with
the new sha256 of `bake.py` and `neon-pavement.blend`; `tests/neon-pavement-material.test.js` fails until they match.

## Source and licence

| Field | Value |
| --- | --- |
| Title | Concrete Pavement |
| Author | Charlotte Baglioni |
| URL | https://polyhaven.com/a/concrete_pavement |
| Licence | CC0-1.0 (Poly Haven) |
| Scan size | 1.8 m x 1.8 m (Poly Haven dimensions), seamless |
| Files (4K) | sha256 |
| `concrete_pavement_diff_4k.jpg` | `a1e3883c740fb73e24c8d4d181b8223382da967a4ffca01488a895d17676fb6b` |
| `concrete_pavement_nor_gl_4k.png` | `5fe151952320d03a05513aa59d4249f5a73d00de6c803ab4b3145f2a64c0a9a3` |
| `concrete_pavement_rough_4k.jpg` | `8da7c47876de509add8ac96270b71ae7ec070faf9dc36c9f0c0a75f70dac0619` |
| `concrete_pavement_ao_4k.jpg` | `c335500df3d0778abce52751c887b9906b4a75d434673352fe324ae64365aeb2` |

Download URLs: `https://dl.polyhaven.org/file/ph-assets/Textures/{jpg,png}/4k/concrete_pavement/<file>`. The source
files stay in `$HOME/.cache/skyline-rush/polyhaven/concrete_pavement/` (fetched by the script above, never committed),
as for every Poly Haven input. The Neon concept frames are a mood target only; no pixel of them is in the tile.

Why this scan: plain rectangular slabs with crisp joints are the ordinary downtown sidewalk of the concept frames, and
flat slabs break the wet mirror into per-slab neon streaks. The scan is a warm grey (mean linear albedo 0.185), so
`bake.py` keeps 30 % of its saturation, adds a slight cool cast and scales it to a mean albedo of 0.16. That puts it a
step lighter than the road (0.12), so the kerb line reads at night.

**Joint grid** (measured on the scan AO): rows every 0.3 m with joints at v = 0, odd rows shifted half a slab; per-slab
fields in `bake.py` are built on that grid and land within about 0.6 cm of the real joints.

## Integration contract

For the session that wires the ground material into `src/neon-scenery.ts`.

**Load.** Material id `neon-pavement` in `MATERIAL_MANIFEST` (`src/material-manifest.ts`). Same entry shape and maps as
`neon-asphalt` / `coast-asphalt`, so the road loader (`coastRoadFiles`, `createCoastRoadMaterial`) can read it by id;
the same tier rule applies (Low procedural, Medium 1K, High / Ultra 2K).

| Map | Path (under `public/`) | Colour space | three.js |
| --- | --- | --- | --- |
| base colour | `materials/neon-pavement/pavement_basecolor_{1k,2k}.ktx2` | sRGB (DFD transfer sRGB, BT.709) | `map`, `SRGBColorSpace` |
| normal | `materials/neon-pavement/pavement_normal_{1k,2k}.ktx2` | linear | `normalMap`, OpenGL tangent space (+Y = +v), `NoColorSpace` |
| packed | `materials/neon-pavement/pavement_packed_{1k,2k}.ktx2` | linear | R `aoMap`, G `roughnessMap`, B puddle mask, `NoColorSpace` |

All KTX2 are UASTC + zstd, 1024² / 2048², full mip chain, rows v = 0 first (`flipY = false`), `RepeatWrapping`.

**Tiling.** One UV repeat = 7.2 m in both axes (`tileMetres`), so u, v = world x, z / 7.2 on the flat ground (planar
UVs; slab rows run along u). The tile is 12 slabs x 24 rows and its edges are joints, so it repeats without a seam.
The ground plane is not the road ribbon, so it does not use `ROAD_UV_METRES`.

**Shading.** Base colour mean linear albedo 0.155; with the road material's `#a0a0a0` factor about 0.054 on screen.
Dry roughness (packed.g) 0.80 / 0.88 / 0.95 (p5 / mean / p95), with joints a little rougher. Wetness: the Neon `rain`
and `track` value 0.85 (`trackLook('neon').wetness`) through the road shader gives slab roughness about 0.43 and 0.2
in puddles, the intended wet-night range. No metalness.

**Puddles.** `packed.b`, 0 dry .. 1 standing water, 11 % of the tile above 0.5: broad shallow pools about 2 m across,
water standing in the joints (0.6), and about 7 % of slabs sunk with a thin film that glosses up toward the slab
middle (at most 0.5: a full mirror there read as a lit rectangle in the preview). The road shader reads it unchanged (`smoothstep(.4, .95, texelRoughness.b) * wetness`).

**Normal.** Scan detail plus a random tilt per slab (0.7° 1 sigma), so each wet slab mirrors the neon at its own angle.

**Bytes.** 1K set 2,047,577 B (base colour 567,062, normal 743,413, packed 737,102); 2K set 7,909,224 B (base colour
2,192,973, normal 2,881,521, packed 2,834,730). The test holds each texture to a third of the Neon road's
per-resolution download budget (1.1 MB at 1K, 4.33 MB at 2K) and the set to the same budgets as `neon-asphalt`.
