# Coast cliff greenery — asset brief

One GLB (`public/models/coast-greenery/coast-greenery.glb`, manifest id `coast-greenery`) holding three shrub
thickets that `src/coast-greenery.ts` instances on the up-facing faces of the scan cliffs (`cliff_a`, `cliff_b`)
in the `?look=3d` Coast scene, Medium and up. Low never loads it (fallback `procedural-scenery`). If the GLB
fails to load, the scan scenery still shows, without shrubs.

The grass on the rock itself is not part of this asset: `greenTops()` in `src/coast-greenery.ts` blends it into
the cliff, arch and rock materials by world normal.

## Sources (all CC0-1.0, Poly Haven)

| Source | URL | Authors | Used for |
| --- | --- | --- | --- |
| Searsia Lucida | https://polyhaven.com/a/searsia_lucida | James Ray Cock (modelling), Jenelle van Heerden (photography) | `shrub_a`, `shrub_b`, `shrub_c` |

The 1K glTF stays outside the repo in `$POLYHAVEN_CACHE` (default `$HOME/.cache/skyline-rush/polyhaven`, filled
by `scripts/assets/fetch_polyhaven.py`). `build.py` verifies each file's sha256 against that cache's
`sources.json` before use. The impostor bake and the cards are project work.

## Rebuild

```sh
python3 -I scripts/assets/fetch_polyhaven.py fetch          # once per machine
$BLENDER_BIN --background --factory-startup --python assets-src/coast-greenery/build.py   # ~1 min, CPU Cycles
node scripts/assets/export-glb.mjs coast-greenery
node scripts/assets/optimize-glb.mjs coast-greenery
node scripts/assets/check-glb.mjs coast-greenery --promote
```

`build.py` writes `coast-greenery.blend` (editable master, relative image path) and `textures/coast_shrub_diff.png`.
After a rebuild, update the three sha256 values and `bytes` of the `coast-greenery` entry in `src/model-manifest.ts`.

## Conventions

- Metric, +Y up in glTF (Blender +Z). Every node sits at the origin with its pivot at the ground, on the axis
  the three cards share. The runtime scales them per instance.
- One material, `coast_shrub`: base colour + alpha in one texture, glTF `MASK` (cutoff 0.5), roughness 0.9,
  `KHR_materials_specular` `specularFactor` 0, single-sided (each card has its own back face).

## Recipe

1. Each node is a thicket of five scan variants (`searsia_lucida_a` … `_g`, table `SHRUBS` in `build.py`). One
   scan alone is airy (about 20% of its silhouette is leaf) and reads as twigs from the road.
2. Render the thicket orthographically from three yaws (0°, 60°, 120°) under a uniform white sky: Cycles, 96
   samples, transparent film, Standard view transform, source specular off. The result is the scan's albedo with
   its own sky occlusion and no baked sun, so the game's sun lights it.
3. Pack the nine renders into a 1024 px atlas (3 × 3 cells of 341 px, 336 px tiles). Leaf colour is dilated
   into the transparent texels so mips do not fade the edges to black.
4. Build three crossed cards per node, front and back faces. Both faces share near-up normals
   (`right × 0.25 + up`), so a card is lit like the ground it stands on from either side and the three cards of
   a thicket do not split into light and dark planes.

Traps met while tuning:

- Outward "dome" normals light the two halves of a card differently and draw a vertical seam down its middle.
- With the default specular, cards seen at grazing angles pick up a pale sky sheen and read as flat paper.
  Specular is 0 in the asset, not in the runtime.

## Budgets and actuals

| Item | Actual | Budget |
| --- | --- | --- |
| Triangles | 36 (12 per node) | 100 |
| Draws | 3 | n/a |
| GLB bytes | 163,824 | 700,000 |
| Texture | one 1024 px ETC1S RGBA KTX2, 11 mips | 1024 px |

Runtime: 72 instances per host cliff, three InstancedMesh draws for the whole coast.

## Known limitations

- No wind animation.
- Cards are three fixed planes: from directly above (Fly mode over a cliff top) the cross shape is visible.
- Shrubs grow on `cliff_a` and `cliff_b` only; the sea arch and rocks get the grass blend but no shrubs.
- The shrub tint and the grass colour are runtime constants in `src/coast-greenery.ts`, not a scanned grass texture.
