# Pickup cell — asset brief

One GLB (`public/models/pickup-cell/pickup-cell.glb`, manifest id `pickup-cell`): the blue energy-cell
power-up. One mesh node `pickup_cell`, one opaque material `pickup_cell_pbr`, no animation. Its manifest
fallback is `procedural-pickup`. Project work, no third-party source.

## Reference

`ref/front.png`, `ref/side.png`, `ref/back.png`, `ref/threequarter.png` are 314 px crops of the reference
sheet supplied with the task. Shapes in `build.py` were measured off the front crop at 310 px per unit.

Measured from the reference: overall silhouette (armoured collars above and below a darker waist), the
octagonal plan, the brow plates with two bolts each, the amber chevron in a dark notch, the cap light strips,
the front glass window with the lightning emblem, the three side light bars, the back light slot.

Inferred (not visible in any crop): the underside and the top of the cap (mirrored top to bottom), the left
side (mirrored from the right), collar depth, bolt counts on hidden faces, the amber chevrons on the back.

Left out on purpose: the lightning arcs and the halo around the reference are effects, not geometry.

## Rebuild

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/pickup-cell/build.py   # ~70 s
node scripts/assets/export-glb.mjs pickup-cell
node scripts/assets/optimize-glb.mjs pickup-cell
$BLENDER_BIN --background --factory-startup --python scripts/assets/pickup_kit.py -- review pickup-cell
node scripts/assets/check-glb.mjs pickup-cell --promote
```

`build.py` holds the shapes only. Materials, bevels, UVs, the high-to-low bake and the save live in
`scripts/assets/pickup_kit.py`, shared with `pickup-can`, `pickup-tank` and `pickup-overcharge`. The build
writes `pickup-cell.blend` (editable master, relative image paths) and `textures/`. The review step renders
the exported GLB into `review/final.png` and `review/turntable.png`.

## Conventions

- +Y up in glTF (Blender +Z), emblem faces three.js +Z (Blender -Y), pivot at the bounding-box centre.
- Size 1.24 × 1.5 × 1.24; the kit refuses anything above 1.35 × 1.6 × 1.35.
- 1626 triangles (budget 3000), optimized GLB 296 136 bytes (budget 300 000).
- One texture set on UV0: base colour, normal (OpenGL +Y) and emissive at 512 px, ORM at 256 px.
  ORM stays at 256 because a 512 px ORM does not fit the byte budget.
- Light shapes (emblem, strips, bars, slot) are real geometry, so their outlines do not depend on texture
  resolution.
- Armour metallic is 0.85, not 1, so the prop keeps some diffuse where the scene has no environment map.
- Ambient occlusion is also multiplied into base colour as cavity dirt (non-directional), so panels separate
  under flat lighting.
