# Roadster 2 — asset brief

Garage-only real 3D Roadster 2 (`?model=roadster`), replacing the procedural car's visible
parts while the procedural car keeps driving the pose (`src/garage-model-rig.ts`). References:
`docs/designs/roadster2-reference/` (third-party photos, artistic reference only; see its README).

```text
ASSET      VH_roadster2 (files and runtime id: roadster2)
CATEGORY   vehicle, wheeled, hinged prop parts (active wing, rams), rigid (no skinning)
VIEWS      14 side profile      side,  az 270 (review_render convention), el 0, lens 50 (grid-solved), car fills ~25 % of height, ground at y 298 px
           05 front nose        front, az 180, el 2, lens 50 (grid-solved), car fills ~80 %, ground ~y 950 px (in shadow)
           13 rear (lower car)  back,  az 0, el 4, lens 85 (grid-solved), flight mode, wing deployed, tyres under thruster smoke
           06 rear quarter      rear three-quarter right, az 20, el 3, lens 50 (grid-solved), wing deployed
           15, 09, 03, 02, 04, 01, 11: detail only (perspective, cropped or low resolution), not measured
SCALE      1 unit = 1 m. Contract scale, not photo scale: wheel centres (x +-1.05, y .46, z -1.35 / 1.42),
           tyre radius .44, wing pivot (0, 1.08, 2.25), lift/rear ports from src/effects.js and src/aero-vfx.js,
           bounds within +-3 % of the procedural car (src/car-model.js makeCar(CAR_STYLES.roadster)).
PROPORTIONS checked by the forms gate after registering each photo by the contract anchors (below):
           wheelbase / length, roof height / wheelbase, front and rear overhang / wheelbase, sill height / tyre radius,
           body width / track (front, rear), rear-face width / height, ten band widths per view
PARTS      body; glass_canopy; glass_surround (pillars/roof edge tubes); rocker_l/r; splitter; diffuser; headlamp;
           tail_light; wing_bay — static, children of the root.
           wheel_fl/fr/rl/rr (pivot, rig-bound) > *_tire, *_barrel (static) and *_spin (spin node) > *_inset, *_blades, *_hub.
           wing (pivot) > wing_blade (rig-bound) > wing_aerofoil, wing_tip_r, wing_tip_l (scale x -1, like the procedural tip);
           wing > wing_swan_necks, wing_rams (rig-bound rot.x/scale.y).
           thruster_01..04 (lift ports, effects.js LIFT_PORTS) > *_nozzle; nozzle_rear_01..04 (aero-vfx.js REAR_PORTS) > *_tube.
           All separate objects, rigid; pivots are empties whose TRS matches the procedural node of the same role.
SILHOUETTE wedge nose with low splitter; single short roof peak with raked windshield and rear glass; tall rear deck
           with active wing on swan necks; dark sill/rocker band between large wheels; boxed rear fascia with four ports.
MATERIALS  roadster_paint (tinted per car by the Garage; clearcoat), roadster_glass (bronze tint, double-sided),
           roadster_trim, roadster_carbon, roadster_tire, roadster_rim, roadster_nozzle (satin bronze),
           roadster_light (brake light, emissive driven at runtime), roadster_lamp (headlamp emissive).
           Colours/roughness come from the procedural car, factors only (no base-colour texture).
           Textures: one shared 1024 px atlas (UV channel 0) for every mesh:
             textures/roadster2_normal.png  tangent-space normal, OpenGL +Y, Non-Color  -> glTF normalTexture
             textures/roadster2_ao.png      ambient occlusion, Non-Color, R channel   -> glTF occlusionTexture
ARTICULATION no armature. Runtime rig copies local TRS from the procedural car onto: wheel_*, wing, wing_blade,
           wing_rams, wing_tip_l/r. wheel_*_spin exists for rolling but is NOT bound by the rig yet (open item).
           No animation clips.
INFERRED   see the list below
TARGET     three.js r186.1 WebGLRenderer, GLB through scripts/assets (export -> optimize -> check), Garage camera,
           budget 60,000 triangles (actual 6,608; low LOD 4,150), textures <= 1024 px (actual 1024; low LOD 512), KTX2 normal/AO.
```

## Coordinate convention

Geometry is authored in three.js car space (Y up, nose toward -Z) and written to Blender as
`(x, -z, y)`, so the car faces **+Y in Blender**, not the skill's default -Y. The glTF exporter's
Y-up conversion maps it back to three.js car space exactly, which is what the rig needs. Side
effect for review renders: `review_render.py` view `front` (az 0) shows the car's **rear**, `back`
(az 180) its front, `left` (az 270) its left side with the nose on the left like photo 14.

## Forms gate

Tooling: `gate/refs.json` (photos, mattes, anchors, camera grid), `gate/gate_render.py` (Blender:
silhouettes per camera plus the contract anchors projected through that camera),
`gate/gate_measure.py` (Pillow + numpy: matte, register, IoU, ten band widths, overlay sheet).

Method, per the coordinator's gate rules:
1. **Matte first.** Photo 14: per-row background model from the edge columns, colour distance > 60,
   column fill, plus hand polygons for the light rear tip (include) and the floor shadow under the
   sill and beside the tyres (exclude). Photos 05, 13, 06: hand-traced polygons.
2. **Register by contract anchors, not overall length.** A similarity transform maps the two photo
   anchors onto the same two contract points projected by the render camera. Side and rear quarter
   use the two hub centres (x = +-1.23 hub face); front and rear use the two tyre contact points.
3. **Score the registered pair:** IoU over the frame, and widths at ten bands. Metres are exact for the
   side view only. Front and rear are approximate (perspective at the anchors' depth), and rear-quarter
   metres are not meaningful, so read those in percent.
4. **Camera solved by grid search** over azimuth, elevation and lens per view (the camera is fitted, never
   the geometry). Regions the photo cannot compare are excluded from both masks (`ignore`).

Target (working values): IoU >= 0.90, band widths within 5 %. **Not met; see the deviations.** Owner decision 2026-11-07: the 0.90 target conflicts with the fixed contract, so IoU is tracked as a non-regression measure and fidelity is accepted by detail plus owner visual sign-off.

| Iteration | Change | side | front | rear | rear quarter |
| --- | --- | --- | --- | --- | --- |
| it1 baseline | procedural port | 0.729 | 0.872 | 0.810 | 0.764 (az grid 15-30) |
| it2 | sills/body bottom .22 between and .30 beside the arches, rocker to .20, roof -.035, diffuser closes the rear face, splitter raised | 0.773 | 0.872 | 0.852 | 0.822 (az grid 10-25, camera only) |
| it3 | one short roof peak, raked windshield and rear glass, rear shoulders lowered toward the tail | 0.793 | 0.873 | 0.853 | 0.818 |
| it5 | roof peak +5 mm (back inside the -3 % height bound), splitter closed up to the nose, canopy base sunk below the body surface (closed a see-through gap) | 0.792 | 0.867 | 0.854 | 0.818 |
| it6 art pass | body/canopy resampled (Catmull-Rom clamped to each span, no overshoot: stations and bounds unchanged), finned diffuser and lamp pockets, rocker -> low sill strip at x 1.17 | **0.791** | **0.860** | **0.925** | **0.828** |

Stopped after it3 + one fix-up pass: front, rear and rear quarter stopped improving at it2 (|delta| < 0.005),
side moved +0.02 at it3, and what remains in the side view is contract-forced (below).

Final band widths (render minus reference, top to bottom, percent of reference width):

- side: n/a, +73, +34, +18, +17, +15, +15, +20, +24, n/a (the middle bands are the length difference)
- front: +6, +1, +34, +10, +7, +6, +8, +7, +7, +7
- rear: +5, +5, +4, +5, +5, +7, +5, +5, +3, +8
- rear quarter: -89, -49, -3, -2, -1, +6, +6, +2, +3, -100 (the top two and the last band sit at the
  edge of the ignored wing region and the shadowed tyre bottom)

### Recorded deviations

**contract-forced** (the anchors, tyre radius and +-3 % bounds are fixed by the spec; not chased):

- Wheelbase 2.77 m and tyre radius .44 m. Registered by wheel centres, photo 14's tyre reads as .36 m, so
  ours shows about .08 m more tyre below the body and the silhouette is .08 m taller at the bottom.
- Overhangs and length. In the registered side view the photo car is 4.29 m long and ours 4.94 m:
  front overhang about 1.23 m vs .77 m, rear about 1.05 m vs .60 m. The length floor is 4.96 m (procedural
  5.115 m - 3 %). Our 5.05 m could still drop by .09 m (not done, worth about 0.01 IoU at best).
- Roof height. The photo roof reads at about 1.21 m. Ours is 1.305 m (total height 1.306 m, -2.7 % against
  the procedural 1.342 m); the -3 % floor stops it there.
- Wing pivot at (0, 1.08, 2.25). In the side view the wing sits above the photo's tail line (about .93 m).
  The anchor is contract.
- Front and rear width: the rear reads 5-8 % wider and the front 6-10 % wider than the registered photos.
  Track and hub positions are contract, and the body sides already meet the tyre outer faces.

**not contract-forced, open** (art decisions, outside this forms pass):

- Wheel design: five swept blades (the procedural design) where photos 14 and 15 show a six-spoke wheel.
- Wheels sit partly behind the body sides at the arches (no wheel wells; body bottom steps over the tyre top).
- it6 resolved: door cuts, sill line and hood seams are baked into the normal map from boolean grooves on the
  body HIGH copy (`bake.py` GROOVES); lamp pockets are trim frames behind the lights; the diffuser is a deck plate
  over seven fins; the rocker is a low sill strip at x 1.17 (no longer coplanar). Still open: light blade and
  plate recess as geometry.

## INFERRED

- Photo 14: where the dark sill ends and the floor shadow begins between the wheels (set at 289 px, about .19 m).
- Photo 05: the car-right front tyre is hidden in shadow; its contact point is placed under the fender edge
  (110, 950), symmetric to the visible car-left tyre (1638, 950). Everything below the splitter is ignored.
  Front registration is the weakest of the four, and the uniform +6 % ring in its overlay is most likely this anchor.
- Photo 13: flight mode with the wing deployed; everything above the light bar is ignored. Tyre contact points
  are under thruster smoke and come from the tyre outer edges.
- Photo 06: wing deployed; the wing band left of the C-pillar is ignored.
- Underbody, wheel wells and interior: not visible in any measured photo. The underbody is the closed body loft
  floor, there are no wheel wells and no interior.
- Materials: colour, metalness and roughness factors are the procedural car's, not measured from photos.

## Build, bake, gate

From the repo root (`$BLENDER_BIN` = Blender 5.2.x):

```sh
"$BLENDER_BIN" --background --factory-startup --python assets-src/roadster2/build.py   # geometry + UV atlas
"$BLENDER_BIN" --background --factory-startup --python assets-src/roadster2/bake.py    # normal + AO, wires materials
"$BLENDER_BIN" --background --python .claude/skills/blender-image-to-3d/scripts/validate.py -- \
  --blend assets-src/roadster2/roadster2.blend --collections LOW --budget-tris 60000 --require-uv
"$BLENDER_BIN" --background --python assets-src/roadster2/gate/gate_render.py -- \
  --blend assets-src/roadster2/roadster2.blend --refs assets-src/roadster2/gate/refs.json --out <dir>
python3 assets-src/roadster2/gate/gate_measure.py --refs assets-src/roadster2/gate/refs.json \
  --renders <dir>/gate_render.json --out <dir>
```

`build.py` always runs before `bake.py`: build rewrites the master without textures and bake adds
them. Both write datablocks only (`bpy.data.libraries.write`, uncompressed), so the `.blend` stores
no UI state and no home directory. Texture paths are relative (`//textures/...`). The baked PNGs
rebuild byte-identically; the `.blend` does not, because Blender writes memory addresses into it.

Validation (it6 master): FAIL 0, WARN 26 (all cap n-gons, triangulated on export), 6,608
triangles, every mesh UV'd. A raw export through `scripts/assets/export_glb.py` holds only the 64
shipping nodes (43 meshes), the nine `roadster_*` materials, and the two atlas images, used only
in the normalTexture and occlusionTexture slots. It contains no cameras, lights or bake helpers.
