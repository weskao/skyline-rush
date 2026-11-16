# Coast boats — asset brief

One GLB (`public/models/coast-boats/coast-boats.glb`, manifest id `coast-boats`) with the three boats the
Coast race puts on the open sea in the 3D look (Medium and High): `sailboat_a` (cream sloop, white sails),
`sailboat_b` (navy sloop, tanbark sails) and `motorboat` (cabin boat with its wake). `src/coast-boats.ts`
places and moves them, one InstancedMesh per node. Low never loads the file: its manifest fallback is
`procedural-scenery`.

## Source

Project work, modelled procedurally by `build.py`; no third-party geometry or textures. Poly Haven was
surveyed first (models tagged boat, ship, sail, yacht, dinghy): its only CC0 vessels are 17th-century
ships, which do not fit this coast. `build.py` reuses `MeshBuilder` and the vertex-colour material from
`assets-src/coast-scenery/build/`.

## Rebuild

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/coast-boats/build.py   # ~2 s
node scripts/assets/export-glb.mjs coast-boats
node scripts/assets/optimize-glb.mjs coast-boats
node scripts/assets/check-glb.mjs coast-boats --promote
```

Then record the new master, script and GLB sha256 and the GLB byte count in `src/model-manifest.ts`
(`tests/model-manifest.test.js` compares them).

## Conventions the runtime relies on

- Bow along Blender +x, up +z, pivot on the centre line at the waterline, amidships.
- Sails set to Blender -y: `boatPose` heels a sailing boat to that side.
- One material, `coast_boat_paint`: vertex colours only, no textures. Three draws for any fleet size.
- Colours are linear RGB and deliberately dim. The Coast day light puts about three times a flat upward
  face's albedo on screen, so decks, roofs and foam stay under 0.5 or they clip and bloom.
- The motor boat's wake is part of its mesh, 0.18 m above the waterline, reaching 18 m astern and 4.9 m
  to each side. The runtime keeps that boat level and on wide turns (`MOTOR` and `MOTION` in
  `src/coast-boats.ts`); a longer wake needs a larger `MOTOR.margin` there.
- Budget: 3,000 triangles and 120 kB for the file (currently 2,287 triangles, 25.8 kB).
