# Neon Downtown asphalt (task 5b step 4, asset half)

Dark, fine-grained wet city asphalt for the Neon Downtown `?look=3d` road. One seamless 24 m x 24 m tile, baked in
Blender from a CC0 scan and encoded to KTX2. It mirrors the Coast set (`assets-src/coast-asphalt/`) file for file, so
the existing Coast road material loads it unchanged.

| File | What |
| --- | --- |
| `bake.py` | Builds the tile material in Blender, bakes base colour / normal / packed at 1K and 2K, encodes KTX2, saves the master, prints a `SUMMARY` (hashes, bytes, puddle coverage) |
| `preview.py` | Cycles renders of the baked PNGs: 3 x 3 tiles from above, and a neon-lit night street dry (`night`) and wet (`rain`) |
| `neon-asphalt.blend` | Editable master (tile plane + node material; input images are rebuilt by `bake.py`, not packed) |

## Rebuild

From the repo root, after `python3 -I scripts/assets/fetch_polyhaven.py fetch` (the scan is already in its `SOURCES`):

```sh
"$BLENDER_BIN" --background --factory-startup --python assets-src/neon-asphalt/bake.py -- <png-dir>
"$BLENDER_BIN" --background --factory-startup --python assets-src/neon-asphalt/preview.py -- <png-dir> docs/designs/3d-pipeline/audits/neon-asphalt
```

`bake.py` refuses a cached input whose sha256 differs from the cache's `sources.json`. `-- <png-dir> --no-encode`
writes PNGs and the master only, for look iteration. Needs `toktx` (KTX-Software) on `PATH` for the encode. After a
rebuild, copy the `SUMMARY` hashes and bytes into the `neon-asphalt` entry of `src/material-manifest.ts`, together with
the new sha256 of `bake.py` and `neon-asphalt.blend`; `tests/neon-asphalt-material.test.js` fails until they match.

## Source and licence

| Field | Value |
| --- | --- |
| Title | Asphalt Track |
| Author | Dimitrios Savva |
| URL | https://polyhaven.com/a/asphalt_track |
| Licence | CC0-1.0 (Poly Haven) |
| Files (4K) | sha256 |
| `asphalt_track_diff_4k.jpg` | `5719cb6a2cacdcd22edc82118be79a54b24c681aa2a6c1c3bf6a00d50f68c6c9` |
| `asphalt_track_nor_gl_4k.png` | `b4a8aa21b43c27faeb349ae43cff15f753b08078173a8c38a9eecfac2eedcdf1` |
| `asphalt_track_rough_4k.jpg` | `2666b02ff3293dad8b44b6b69131d09a51ca25d087133d3ccf5a0e820e5fac33` |
| `asphalt_track_ao_4k.jpg` | `1bd099b091e50af2f00881a17e2203476285f520699a39a194708cbb988127b9` |

Download URLs: `https://dl.polyhaven.org/file/ph-assets/Textures/{jpg,png}/4k/asphalt_track/<file>`. The concept frames
in `docs/designs/3d-pipeline/concept-art/neon-downtown/` are a mood target only; no pixel of them is in the tile.

Why this scan: near-black, even and crack-free, the dark city asphalt of concept frames 03-08, and dark asphalt is
what lets the neon read in the wet mirror. The scan is warm brown-black (mean linear albedo 0.016), so `bake.py`
keeps 25 % of its saturation, adds a slight cool cast and scales it to a mean albedo of 0.12.

## Integration contract

For the session that wires Neon into `src/track-look.ts`.

**Load.** Material id `neon-asphalt` in `MATERIAL_MANIFEST` (`src/material-manifest.ts`). It has the same shape as
`coast-asphalt`; `coastRoadFiles` reads `MATERIAL_MANIFEST['coast-asphalt']`, so the one consumer change is that id,
for example a set-name parameter: `coastRoadFiles(resolution, id = 'coast-asphalt')`. `createCoastRoadMaterial`,
the tier rule (`coastRoadTier`: Low procedural, Medium 1K, High 2K, Ultra 2K plus the detail normal) and
`ROAD_UV_METRES` stay as they are.

| Map | Path (under `public/`) | Colour space | three.js |
| --- | --- | --- | --- |
| base colour | `materials/neon-asphalt/asphalt_basecolor_{1k,2k}.ktx2` | sRGB (DFD transfer sRGB, BT.709) | `map`, `SRGBColorSpace` |
| normal | `materials/neon-asphalt/asphalt_normal_{1k,2k}.ktx2` | linear | `normalMap`, OpenGL tangent space (+Y = +v), `NoColorSpace` |
| packed | `materials/neon-asphalt/asphalt_packed_{1k,2k}.ktx2` | linear | R `aoMap`, G `roughnessMap`, B puddle mask, `NoColorSpace` |

All KTX2 are UASTC + zstd, 1024² / 2048², full mip chain, rows v = 0 first (`flipY = false`), `RepeatWrapping`.

**Tiling.** One UV repeat = 24 m in both axes (`ROAD_UV_METRES`): u across the road (0 = left edge, 1 = right edge of
the 24 m width), v along it. The tile is periodic, so it repeats along the road with no seam.

**Layout baked into the tile** (matches the classic road; do not move lanes for it): wheel ruts at ±0.9 m around the
lane centres −7.5 / −2.5 / +2.5 / +7.5 m, slightly darker and smoother; gutter grime and pooled water from |x| > 9.6 m
to the edge.

**Lane paint.** Not in the texture, exactly as on Coast: the white dashed lines at −5 / 0 / +5 m are the instanced
`laneLines` geometry (`src/classic-road-render.ts`, unlit `#d9dcda`). They stay on in the Neon look.

**Puddles.** `packed.b`, 0 dry .. 1 standing water, 17 % of the tile above 0.5, pooled in ruts and gutters. The Coast
shader already reads it (`smoothstep(.4, .95, texelRoughness.b) * wetness`), so no shader change and no extra file.

**Wetness.** The `wetness` uniform, 0 .. 1, set with `setWetness` (no recompile). N2 allows only night and rain night
on Neon, so the intended values are `rain` → 0.85 (as `coastWetness('rain')`) and `night` → 0 (dry). Neon needs its
own preset map: `coastWetness` returns 0.35 for `dusk` and 0.25 for `fog`, which Neon does not show.

**Brightness.** Mean linear albedo 0.12 in the base colour; the Coast material's `color: '#a0a0a0'` (0.35 linear)
brings it to about 0.04 on screen, darker than Coast (about 0.07). Dry roughness mean 0.83. The wet look relies on the
scene environment and the lights-only mirror (`wet-reflection.ts`), which the integrating session feeds with the
neon signs, windows and tunnel strips.

**Budget (N6).** Same caps as Coast: download 3.3 MB at 1K and 13 MB at 2K, GPU 4.5 MB Medium and 17.5 MB High/Ultra
(`budgets` in the manifest entry).

**Preview.** `preview.py` renders with the runtime's wet terms copied into Cycles. Renders go to the git-ignored
`docs/designs/3d-pipeline/audits/neon-asphalt/`; they are an offline look check, not an in-game capture.
