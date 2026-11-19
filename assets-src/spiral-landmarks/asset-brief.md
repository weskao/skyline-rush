# Sky Spiral landmark kit

Task 8c step 5 (assets). Look: `docs/designs/3d-pipeline/sky-spiral-look-brief.md`: a clear day above the clouds,
white and grey panelled structure, blue as the only accent light, no magenta.

One GLB, `public/models/spiral-landmarks/spiral-landmarks.glb`: twelve mesh nodes, one material
(`spiral_landmarks`), one atlas. Manifest entry: `src/model-manifest-spiral.ts`. Guard:
`tests/spiral-landmarks-glb.test.js`. Measured numbers: `contract.json` (written by `build.py`).

## Rebuild

```
python3 -I assets-src/spiral-landmarks/fetch_sources.py
$BLENDER_BIN --background --factory-startup --python assets-src/spiral-landmarks/build.py
node scripts/assets/export-glb.mjs spiral-landmarks
node scripts/assets/optimize-glb.mjs spiral-landmarks
node scripts/assets/check-glb.mjs spiral-landmarks --promote
```

The scans download outside the repo (the shared Poly Haven cache of `scripts/assets`); only `sources.json`
(URL, bytes, sha256 per file) is kept. The GLB is the same on every rebuild; the `.blend`'s bytes are not, so
after a rebuild record the new `masterSha256` (and `scriptSha256` when `build.py` changed) in the manifest.
Preview renders (git-ignored, `docs/designs/3d-pipeline/audits/spiral-landmarks/`):

```
$BLENDER_BIN --background --factory-startup --python assets-src/spiral-landmarks/render.py -- [shot ...]
```

## Sources (all CC0-1.0, Poly Haven)

| Set | Author | Used for |
| --- | --- | --- |
| `concrete_panels` | Amal Kumar | tower shell |
| `blue_metal_plate` | Rob Tuytel | painted panels (repainted white) and gunmetal decks |
| `snow_field_aerial` | Rob Tuytel | peak snow |
| `aerial_rocks_02` | Rob Tuytel | peak rock |

Pieces, atlas layout and painted cells (clouds, lamps, hazard bands, chevrons, windows) are the project's own.

## Nodes

Game axes: +Y up, metres. Each node's origin is its pivot. A GLB node carries its own dequantization transform:
place a node by its pivot, measure it through `matrixWorld` (rule 29 of `.claude/rules/3d-asset-pipeline.md`).

| Node | Triangles (cap) | Pivot and size |
| --- | --- | --- |
| `tower` | 4,048 (6,000) | axis on the origin, y = 0 at the helix-entry road level; y -140 to +400; radius 40 m for y -10 to +115, flared to 62 m at the foot, tapered to 24 m under the crown; light strip on +Z |
| `tower_far` | 919 (1,200) | same pivot, outline, UVs and material: draw it instead of `tower` at distance |
| `strut` | 220 (300) | origin at the deck end, top at y = -0.5, 170 m along +X, 4.4 m wide, truss 25 m deep at the tower end; blue line under the top chord |
| `platform_a` | 1,238 (1,500) | round, 40.8 m across; deck top y = 0; spire to +38, keel to -42 |
| `platform_b` | 740 (1,500) | faceted, 49.2 m along X by 29.2 m along Z; deck top y = 0; spires to +33 and +21, keel to -36 |
| `station` | 280 (800) | 30.6 x 10.5 x 14.6 m; origin at the base centre |
| `chevron_sign` | 40 (120) | origin at the post base; board 4 m wide facing +Z, lit on both faces; chevrons point +X (a half turn about Y points them -X) |
| `gap_marker` | 70 (200) | 6 m post, origin at the base; yellow-black bands, blue beacon |
| `cloud_a` | 352 (400) | 420 x 300 m, 80 m tall; origin at the centre of the underside |
| `cloud_b` | 352 (400) | 330 x 310 m, 64 m tall |
| `cloud_c` | 352 (400) | 500 x 270 m, 90 m tall |
| `peak` | 552 (800) | 500 m base, 260 m tall; origin at the base centre; open underneath (the cloud sea hides the base) |

Total 9,163 triangles, twelve draws if every node is shown once (instancing is the runtime's).

Things the placement must know:

- In the strut span (y -10 to +115) the shell is exactly 40 m. The ring gantries, eight ribs and the light-strip
  housing stand up to 3 m proud of it, so a strut end at 40 m sinks into the shell or a gantry, never floats.
- The tower's bounding box reaches z = +63.05 (the strip housing on the flared foot), not 62.
- Clouds and the peak are opaque and single-sided; the clouds have a closed underside, the peak has none.
- Fins and stays on the platforms are two faces 6 cm apart (no coincident faces, no double-sided material).

## Atlas

2048 px base colour (sRGB), 1024 px normal, occlusion-roughness-metal and emissive; KTX2 in the GLB. Rows from
the bottom: `shell` (concrete panels, joints, window slots), `panel` (white panel), `metal` (gunmetal), `peak`
(rock under a ragged snow line), then one row of cells: cloud gradient, blue lamp, hazard bands, chevron board,
windows, white, dark, grey. The bands repeat along U (UVs run past 0..1 there: keep `RepeatWrapping` on S).

Day-light albedo (linear): white 0.60, decks 0.20, cloud top 0.48 and underside 0.25 to 0.37, snow 0.52: flat
upward faces stay under 0.5 so the sun does not clip them. All nodes share the material, so a cloud-only tint
needs a material copy owned by the runtime.

## Lamps

Blue only, linear (0.0395, 0.402, 1.0). Stored luminance (0.2126, 0.7152, 0.0722):

| Lamp | Luminance |
| --- | --- |
| tower strip, strut line, platform rims, chevrons, beacons | 0.368 |
| lit window panes (every third pane) | 0.166 |

The GLB's emissive factor is 1; the runtime sets the strength. About 3.1 lifts the strip to a 1.15 bloom
threshold. Lit texels are 2.6 % of the atlas. The cloud cell and the peak band hold no emissive texel
(`contract.json` `unlit`; asserted by the build and the test).
