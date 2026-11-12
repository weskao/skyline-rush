# Crimson GT — asset brief

Second player car (`crimson-gt`), selectable in the Garage. Its shape follows the deep-red GT in the
four studio panels (top-left 2x2) of
`docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg`, built around the
Roadster's contract pivots and ports so `src/garage-model-rig.ts` binds it unchanged. The board is
a concept illustration, not a blueprint: every number below is either measured from one panel,
forced by the contract, or inferred, and says which.

```text
ASSET      VH_crimson_gt (files and runtime id: crimson-gt)
CATEGORY   vehicle, wheeled, hinged prop parts (active wing, rams), rigid (no skinning)
VIEWS      ref/front_three_quarter.png  419x189 px, perspective, az 215, el 4-8, lens 35-50 (grid-solved)
           ref/side.png                 409x189 px, near-orthographic, az 268-270, el 2, lens 50-85 (grid-solved)
           ref/rear_three_quarter.png   419x195 px, perspective, az 322-325, el 4-9, lens 35-50, wing raised
           ref/rear.png                 409x195 px, az 0, el 3-5, lens 85, thrusters lit (glow hides the lower fascia)
           Crops come from ref/crop_panels.py. No top, front or underside view exists.
SCALE      1 unit = 1 m, contract scale: wheel centres (x +-1.05, y .46, z -1.35 / 1.42), tyre radius .44,
           wing pivot (0, 1.08, 2.25), lift ports (+-.79, .3, -1.3 / 1.45), rear ports (x +-.22 / +-.62, y .64, z 2.39).
           side.png is registered by its two hub centres onto the contract wheelbase 2.77 m (255.2 px/m at 3x).
PROPORTIONS read off side.png after that registration: length 4.25 m (nose z -2.225, tail z 2.03), roof 1.185 at
           z -.09, tail top .88, sill .26, tyre radius .337.
PARTS      body; glass_canopy; rear_buttresses; headlamp (light blade + slashes); tail_light; front_intake;
           rear_fascia; side_intake_l/r; rocker_l/r; mirror_l/r; splitter; diffuser; wing_bay — static.
           wheel_fl/fr/rl/rr (pivot, rig-bound) > tyre, disc, caliper (static) and *_spin > rim, 5 spokes, hub.
           wing (pivot) > wing_blade (rig-bound) > wing_aerofoil, wing_tip_r, wing_tip_l (scale x -1);
           wing > wing_swan_necks, wing_rams (rig-bound rot.x / scale.y).
           thruster_01..04 (lift ports) > *_nozzle; lift_fans > lift_fan_01..04 > *_disc;
           nozzle_rear_01..04 (rear ports) > *_tube, *_throat.
SILHOUETTE low wedge nose with a full-width light blade; long teardrop canopy peaking ahead of the centre;
           rising shoulder into wide rear haunches; black triangular side intake; flat tail with a
           full-width red light bar over four round nozzles; swan-neck wing.
MATERIALS  gt_paint (factory deep red sRGB #9a1424, metallic .74, roughness .17, clearcoat; tinted at runtime by
           the Garage paint), gt_glass, gt_trim, gt_carbon, gt_tire, gt_rim, gt_nozzle, gt_fan,
           gt_light (rear LED, emissive driven at runtime), gt_lamp (front blade emissive). Factors only.
           Textures: one shared 1024 px atlas (UV channel 0):
             textures/crimson_gt_normal.png  tangent-space normal, OpenGL +Y, Non-Color -> glTF normalTexture
             textures/crimson_gt_ao.png      ambient occlusion, Non-Color, R channel   -> glTF occlusionTexture
ARTICULATION no armature, no clips. The runtime rig copies local TRS from the procedural car onto the same node
           names as roadster2.
INFERRED   see the list below
TARGET     three.js WebGLRenderer, GLB through scripts/assets (export -> optimize -> check). Budget 60,000
           triangles (actual 17,296; low LOD 10,534), 1.5 MB (actual 1,201,628 B; low LOD 504,628 B),
           textures <= 1024 px (low LOD 512), KTX2 normal/AO, meshopt.
```

## Coordinate convention

Same as the Roadster (`assets-src/roadster2/asset-brief.md`): geometry is authored in three.js car
space (Y up, nose toward -Z) and written to Blender as `(x, -z, y)`.

## Build

```bash
"$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/build.py
"$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/bake.py
node scripts/assets/export-glb.mjs crimson-gt
node scripts/assets/optimize-glb.mjs crimson-gt && node scripts/assets/check-glb.mjs crimson-gt --promote
node scripts/assets/optimize-glb.mjs crimson-gt --lod low && node scripts/assets/check-glb.mjs crimson-gt --lod low --promote
```

Then update the `crimson-gt` hashes in `src/model-manifest.ts` (`node --test tests/model-manifest.test.js`
names any that differ). `build.py` imports the Roadster's mesh, node and material helpers
(`assets-src/roadster2/build`), and `bake.py` calls the Roadster's `bake()` with its own panel
lines; only body panels get the bevelled normal bake (small parts stay flat, which keeps the GLB
inside 1.5 MB).

## Forms gate

Tooling is the Roadster's (`assets-src/roadster2/gate/gate_render.py`, `gate_measure.py`) with
`gate/refs.json`: hand-traced mattes and anchors on 3x enlargements; side and both three-quarter
views register by the two visible hub centres, the rear view by the tyre contact points.

```bash
"$BLENDER_BIN" --background --python assets-src/roadster2/gate/gate_render.py -- \
  --blend assets-src/crimson-gt/crimson-gt.blend --refs assets-src/crimson-gt/gate/refs.json --out <dir>
python3 assets-src/roadster2/gate/gate_measure.py --refs assets-src/crimson-gt/gate/refs.json \
  --renders <dir>/gate_render.json --out <dir>
```

Silhouette IoU per iteration (target 0.90):

| Iteration | Side | Front 3/4 | Rear 3/4 | Rear | Change |
| --- | --- | --- | --- | --- | --- |
| 2 | 0.812 | 0.812 | 0.780 | 0.651 | first full car |
| 3 (shipped) | 0.822 | 0.833 | 0.776 | 0.745 | arch radius, nose z -2.30, tail z 2.44, rear anchors on the panel ground |

**The 0.90 target is not met in any view.** The gap is mostly the contract, not tuning left undone:
after registering by the hubs the panel car is a smaller car on smaller wheels, so the contract
tyres and tail stand outside its outline (the blue area of the side overlay). The shipped model is
a contract-fitted interpretation of the concept, not a replica.

## Deviations forced by the contract

| What | Panel (side.png) | Model | Why |
| --- | --- | --- | --- |
| Tyre radius | 0.337 m | 0.44 m | wheel physics, arches and ground contact are the Roadster's |
| Tail end | z 2.03 | z 2.44 | rear VFX ports sit at z 2.39 |
| Tail deck height | 0.88 | 1.00 | wing pivot at y 1.08 and the stowed wing bay |
| Front fender crown | 0.897 | 0.962 | must clear the 0.44 m tyre (rear haunch 1.03, likewise raised) |
| Body half-width at the arches | not measurable | >= 1.20 | must cover the tyre outer face (x 1.185) |
| Wing | tall twin-pylon wing in the rear 3/4 panel | low swan-neck wing, 0.16 m travel | the rig drives the Roadster's wing motion |
| Overall length | 4.25 m | 4.74 m | sum of the two rows above |

## Inferred (not shown by any panel)

- Every width: no top or front view. Shoulder, canopy, buttress and tail widths are read from the
  two three-quarter panels by eye, then held to the contract minimum at the arches.
- Underbody, wheel wells, inner arch walls, everything behind the glass (no interior is modelled).
- The right side of the car (mirrored from the left).
- Lower rear fascia and diffuser: hidden by thruster glow in rear.png.
- Rim depth, spoke section, brake disc and caliper; the panels show five broad spokes only.
- Panel lines (door cuts, hood seams): the panels are 189 px tall and do not resolve them.
- Material factors (metallic, roughness, clearcoat, glass tint) and the factory red itself, sampled
  from lit panel pixels rather than a paint spec.
- Hub anchor positions hidden behind bodywork in the three-quarter panels, and the rear tyre
  contact points in rear.png.

## Licence

The board's generator and terms are not yet recorded in
`docs/designs/3d-pipeline/concept-art/README.md`. The owner approved deriving this model from it;
that record is still a release gate.
