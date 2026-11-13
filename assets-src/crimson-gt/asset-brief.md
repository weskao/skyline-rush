# Crimson GT — asset brief

Second player car (`crimson-gt`), selectable in the Garage. Its shape is built from the deep-red GT
in the four studio panels (top-left 2x2) of
`docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg`, not from the
Roadster: every body curve is read off the hand-traced panel silhouettes. Only the rig pivots
(wheels, wing, lift ports) are the Roadster's contract numbers, so `src/garage-model-rig.ts` binds
it unchanged. The board is a concept illustration, not a blueprint, and its panels do not agree as
one 3D object: every number below is measured from one panel, forced by the contract, or inferred,
and says which. The model is an interpretation of the concept, not a replica.

```text
ASSET      VH_crimson_gt (files and runtime id: crimson-gt)
CATEGORY   vehicle, wheeled, hinged prop parts (active wing, rams), rigid (no skinning)
VIEWS      ref/side.png                 409x189 px, near-orthographic; grid-solved az 270, el 1, lens 135; no wing
           ref/front_three_quarter.png  419x189 px, perspective; grid-solved az 211, el 2, lens 50; no wing
           ref/rear_three_quarter.png   419x195 px, perspective; grid-solved az 331, el 0, lens 42; wing raised
           ref/rear.png                 409x195 px; grid-solved az 0, el 3, lens 85; no wing, thrusters lit
           Crops come from ref/crop_panels.py. No top, front or underside view exists.
SCALE      1 unit = 1 m. side.png is registered by its two hub centres onto the contract wheelbase 2.77 m
           (85.1 px/m, 255.2 px/m on the 3x enlargement). Ground is y .02, the game's tyre contact plane.
PROPORTIONS read off side.png after that registration: tyre radius .337 (hub y .357), nose z -2.22 (orthographic
           trace; the model uses -2.27, the best fit at the solved lens), tail z 2.04, roof 1.084 at z -.08,
           fender crown .818 at z -1.25, tail top .775, sill .165 between the wheels.
           Model: body length 4.31 m (4.34 with splitter and nozzle bezels), half-width 1.175 at the rear arch.
PARTS      body; glass_canopy; roof (body-colour upper: roof, pillars, buttresses); headlamp (light blade +
           slashes); tail_light; front_intake; corner_intake_l/r; rear_fascia; rear_corners; side_intake_l/r;
           rocker_l/r; mirror_l/r; splitter; diffuser — static.
           wheel_fl/fr/rl/rr (contract pivot, rig-bound) > <wheel>_axle (static, lowers the hub to y .357) >
           tyre, barrel, caliper (static) and <wheel>_spin > 5 forked spokes, hub, disc.
           wing (contract pivot) > wing_stow (static, (0, -.22, -.42): rests the blade over the tail deck) >
           wing_blade (rig-bound, hinged on its leading edge at y .86, z 1.63) > wing_aerofoil with fixed
           endplates; wing_tip_r/l are empty nodes (the rig folds them, nothing hangs on them);
           wing_stow > wing_pylons (swan necks, rise with the blade);
           wing > wing_rams (rig-bound rot.x / scale.y; ships empty, this wing has no ram bay).
           cabin (floor liner, bulkhead, steering wheel), cabin_seats (dash top, two seat backs);
           hood_vent_l/r (recess) > hood_vent_slats_l/r — static.
           thruster_01..04 (contract lift ports) > *_nozzle; lift_fans > lift_fan_01..04 > *_disc;
           nozzle_rear_01..04 > *_tube, *_throat, one rigid offset (0, -.33, -.415) from the contract rear ports.
SILHOUETTE low pointed wedge nose with a full-width light blade; long teardrop canopy peaking ahead of the
           centre; rising shoulder into wide rear haunches; black triangular side intake; short tail with a
           full-width red light bar over four round nozzles; wing stowed flat on the tail deck, raised in flight.
MATERIALS  gt_paint (factory deep red sRGB #9a1424, metallic .74, roughness .17, clearcoat; tinted at runtime by
           the Garage paint), gt_glass, gt_trim, gt_carbon, gt_tire, gt_rim (dark), gt_nozzle, gt_fan,
           gt_light (rear LED, emissive driven at runtime), gt_lamp (front blade emissive), gt_cabin (tan).
           gt_glass is see-through (alpha blend) over the cabin. Factors only.
           Textures: one shared 1024 px atlas (UV channel 0), plus the tiling flake:
             textures/crimson_gt_normal.png  tangent-space normal, OpenGL +Y, Non-Color -> clearcoat normal on
                                             gt_paint (the smooth coat keeps the baked edges), normalTexture elsewhere
             textures/crimson_gt_ao.png      ambient occlusion, Non-Color, R channel   -> glTF occlusionTexture
             textures/crimson_gt_flake.png   128 px tiling normal, 48 repeats, strength .35 -> gt_paint base normal
                                             (metallic flake under the clearcoat; written by bake.py)
ARTICULATION no armature, no clips. The runtime rig copies local TRS from the procedural car onto the same node
           names as roadster2; `<wheel>_axle` and the nozzle offset are static and read by src/garage-model.ts.
INFERRED   see the list below
TARGET     three.js WebGLRenderer, GLB through scripts/assets (export -> optimize -> check). Budget 60,000
           triangles (actual 22,996; low LOD 13,926), 1.5 MB (actual 1,204,084 B; low LOD 541,088 B),
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
(`assets-src/roadster2/build`); the shape lives in `build/gt_body.py` (curves) and
`build/gt_parts.py` (parts). `bake.py` calls the Roadster's `bake()` with its own panel lines.

## Forms gate

Tooling is the Roadster's (`assets-src/roadster2/gate/gate_render.py`, `gate_measure.py`) with
`gate/refs.json`: hand-traced mattes and anchors on 3x enlargements; side and both three-quarter
views register by the two visible hub faces, the rear view by the tyre contact points. The gate
picks the best camera from a grid per view, so a number is "best over the grid", not one fixed camera.

```bash
"$BLENDER_BIN" --background --python assets-src/roadster2/gate/gate_render.py -- \
  --blend assets-src/crimson-gt/crimson-gt.blend --refs assets-src/crimson-gt/gate/refs.json --out <dir>
python3 assets-src/roadster2/gate/gate_measure.py --refs assets-src/crimson-gt/gate/refs.json \
  --renders <dir>/gate_render.json --out <dir>
```

Silhouette IoU per iteration (target 0.90). Iterations 2-3 were the Roadster-proportioned first
build with an earlier set of mattes and anchors, so they are not directly comparable to 4-6.

| Iteration | Side | Front 3/4 | Rear 3/4 | Rear | Change |
| --- | --- | --- | --- | --- | --- |
| 2 | 0.812 | 0.812 | 0.780 | 0.651 | first full car, Roadster proportions |
| 3 | 0.822 | 0.833 | 0.776 | 0.745 | arch radius, nose z -2.30, tail z 2.44 |
| 4 | 0.930 | 0.848 | 0.775 | 0.862 | rebuilt from the panel silhouettes: tyre r .337, length 4.26 m |
| 4, finer camera grid | 0.939 | 0.862 | 0.862 | 0.862 | same geometry; the first grid's best cameras sat on its edges |
| 5 (rejected) | 0.932 | 0.865 | 0.846 | 0.818 | pointed nose z -2.27, tapered tail plan, haunch +.03, lower tail raked to side.png, larger endplates |
| 6 | 0.936 | 0.865 | 0.871 | 0.857 | 5 with the deep lower tail restored, haunch +.015, calmer endplates |
| 6 without the wing (measurement only) | 0.968 | 0.872 | 0.880 | 0.905 | what the wing costs: .032 / .007 / .009 / .048 |
| 8 (shipped), rest pose | 0.952 | 0.878 | 0.877 | 0.882 | wing stowed on the tail deck (owner approved), hood vents, cabin behind see-through glass; front 3/4 lens grid widened to 24-85 |
| 8, wing deployed (`gate/pose_deployed.py`) | 0.936 | 0.865 | 0.871 | 0.837 | the runtime's raise = 1 pose; the rear 3/4 panel is the only one that shows the wing up |

**The 0.90 target is met in the side view only** (0.952 at rest). Front 3/4 0.878, rear 3/4 0.877 (0.871 in
the deployed pose its panel shows) and rear 0.882 are the measured values; shape iterations stopped here.
The mattes were not changed after iteration 4. The three-quarter views are also very sensitive to azimuth:
2 degrees either way costs .01 to .05. Why the other three views stay below 0.90, read from the overlay
sheets (not isolated by a separate probe):

- Rear: the stowed wing's endplates and the mirrors lie outside the panel matte, and the body is 5-7 cm
  wider per side than rear.png (scale conflict with side.png, table below). Without any wing the view
  measured 0.905.
- Front 3/4: the panel has a band of extra roof and tail, the render extra nose. The side panel (0.952)
  fixes roof height and overhang, so closing this view would open that one (panel conflict).
- Rear 3/4, deployed: the panel's roof is higher and its body bottom lower than the render, and the
  raised endplate stands above the matte.

## Deviations (measured on iteration 6, render minus panel, at the anchor scale)

The body is unchanged since iteration 6; the wing rows describe the old roof-height wing and no longer
apply at rest (iteration 8 stows it).

| View | Where | Difference | Cause |
| --- | --- | --- | --- |
| Side | top edge, nose to tail deck | within 1.6 cm | — |
| Side | nose tip | within 3.2 cm | panel is not a true orthographic view |
| Side | wing | 25-32 cm above the tail, up to 141 cm of blade behind the roof line | side.png shows no wing (panel conflict) |
| Side | lower tail at y .22 | 21 cm beyond the panel | rear.png and the rear 3/4 panel show a deep fascia down to the diffuser; side.png rakes it away (panel conflict; iteration 5 followed side.png and lost .016 / .039 in the rear views) |
| Rear | body width, all heights | 5-7 cm wider per side | registered by tyre contacts, rear.png is 4-5% smaller than side.png says; the arches must cover the tyre outer face at x 1.175 |
| Rear | roof | 3-4.5 cm higher | same scale conflict |
| Rear | wing and mirrors | 28-44 cm above the haunches, 29-77 cm outboard at blade height | rear.png shows no wing |
| Front 3/4 | underside | panel 7-10 cm lower | panel shadow line traced as body; underside inferred |
| Front 3/4 | cabin, far side | panel up to 14 cm higher | canopy width and far-side roof are inferred |
| Front 3/4 | wing | 24-48 cm above the far haunch | panel shows no wing |
| Rear 3/4 | cabin and front fender | panel 11-50 cm higher on the far side | far-side hub anchor is inferred; canopy width inferred |
| Rear 3/4 | rear face underside | panel 10-26 cm lower | lower fascia hidden by thruster glow; depth inferred |
| Rear 3/4 | near rear corner | 12-15 cm beyond the panel | tail plan width inferred (tapered to .95 half-width in iteration 5) |

Deviations kept on purpose:

| What | Panel | Model | Why |
| --- | --- | --- | --- |
| Wheel pivots | hub y .357 | pivot y .46 with a static `<wheel>_axle` at -.103 | contract pivot; owner approved the smaller tyre |
| Rear nozzles | y .31, z 1.975 | same; contract rear ports are y .64, z 2.39 | owner approved the shorter tail; the rear-port VFX follow the nozzles |
| Lift ports | not shown | contract (+-.79, .3, -1.3 / 1.45), inside the floor | contract |
| Nose z | -2.22 (orthographic trace) | -2.27 | best fit at the solved camera (lens 135) |

| Wing at rest | absent in three panels | stowed flat over the tail deck on a static `wing_stow` node | owner approved 2026-11-13; three panels show no wing, the contract pivot does not move |
| Wing raised | high above the tail on tall supports (rear 3/4 panel) | the Roadster's raise (pivot up, blade tilted), lower than the panel | the rig's motion is shared; short swan-neck pylons rise with the blade, the rams are empty nodes |

Not built: the red glow under the wing in the rear 3/4 panel.

## Inferred (not shown by any panel)

- Every width: no top or front view. Nose, shoulder, canopy, buttress and tail plan widths are read
  from the two three-quarter panels; the haunch is held to the tyre outer face (x 1.175).
- Scallop depth on the flank, hood centre height and its raised centre section, deck height under the upper.
- Underbody, sill inset, wheel wells, inner arch walls.
- The whole cabin: floor liner, bulkhead, steering wheel, dash top, two seat backs and their tan colour.
  The front 3/4 panel shows a tan interior through the glass and resolves nothing else.
- Hood vent size, position and louvre count: the front 3/4 panel shows only two dark patches.
- Paint flake size (about 1.2 mm), density and strength; no panel resolves the paint surface.
- The stowed wing: its rest height, the leading-edge hinge line and the (0, -.22, -.42) offset; how high
  the raised wing stands (lower than the rear 3/4 panel); the pylons' stalk and neck shape.
- The right side of the car (mirrored from the left).
- Lower rear fascia depth, diffuser and its strakes: hidden by thruster glow in rear.png.
- Rim depth, spoke section, brake disc and caliper; the panels show five forked spokes only.
- Panel lines (door cuts, hood rear seam): the panels are 189 px tall and do not resolve them.
- Wing chord, span (1.96 m), endplate shape and pylon spacing: one small perspective panel.
- Mirror size and position.
- Material factors (metallic, roughness, clearcoat, glass tint) and the factory red itself, sampled
  from lit panel pixels rather than a paint spec.
- Hub anchors hidden behind bodywork in the three-quarter panels (rear hub in the front 3/4, front
  hub in the rear 3/4), and the rear tyre contact points in rear.png.

## Licence

The board's generator and terms are not yet recorded in
`docs/designs/3d-pipeline/concept-art/README.md`. The owner approved deriving this model from it;
that record is still a release gate.
