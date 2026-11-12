# Task 7 — Concept hero car and Garage car selection

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec v2 Phase 6 · Scope tags: [README.md](README.md).

**Starts after:** Phase 2d (Roadster close-out, default-on). May run in parallel with Task 5 on its own branch.
**Look target:** the studio 2×2 panels of
[concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg):
- front 3/4 view: light blade
- side view: low wedge, cab-forward canopy
- rear 3/4 view: swan-neck wing deployed
- rear view: full-width light bar and quad round thrusters

There are no badges or logos.

**Files (expected):**
- Car assets: `assets-src/<car-id>/` (build script and Blender master), `public/models/<car-id>/` (GLB and low LOD),
  and the manifest entry in `src/model-manifest.ts`.
- Rig: `src/garage-model-rig.ts`, reused as-is.
- Car selection:
  - a new car catalog next to `src/appearance.ts` / `src/garage-skin-catalog.ts`
  - `src/garage-ui.ts` and the Garage Vue/HTML templates for the car picker
  - the save and Cloud Save fields, i18n strings, and What's New / release notes
- Tests: unit and browser specs for each of the above.

**Produces:** a second player car that players can select, equip and race. It uses the same physics, ports and
equipment as the Roadster, and the procedural Roadster stays its load fallback.

## Owner gates (ask before starting the affected step)
- [x] The car's display name and stable ID (the working ID `concept-gt` is a placeholder).
  - **Decided 2026-11-09 (owner):** display name **Crimson GT**, stable ID **`crimson-gt`**. Replaces the `concept-gt`
    placeholder; the ID is final and must not change after release.
- [ ] The unlock rule: stars threshold, trial, or free; and the default paint.
  - **Decided 2026-11-09 (owner): trial + stars.** The car follows the paint model's locked/trial/owned/equipped
    states: equippable during an account-scoped trial, owned permanently once the stars threshold is reached. A
    preview never grants the car.
  - **Still open:** the stars threshold value and the default paint.
  - **Decided 2026-11-12 (owner), for the first build:** both cars are open to everyone (no lock, trial or stars
    threshold is implemented), and the default paint is the car's own factory colour (`factory`, deep red `#9a1424`
    on the GT; the Roadster keeps Pearl). The trial + stars rule above is not built, so this gate stays open.
- [ ] The concept board's generator and terms of use, recorded in [../concept-art/README.md](../concept-art/README.md).
  This is a release gate.
  - **Decided 2026-11-09 (owner): the board is AI-generated; its generator and terms of use are recorded in the
    concept-art README, and the GT may be derived from the board's design.** Derivation is allowed only once that
    record shows the terms permit commercial use and redistribution.
  - **Still open:** the owner writes the generator name and terms into the README (not recorded yet).

## By project (committed once)
- [x] RED tests first (2026-11-13), part 1: `tests/crimson-gt-model.test.js`, `tests/car-catalog.test.js` and
  `tests/crimson-gt-browser.spec.js`, each RED before its implementation.
  - the manifest has the required nodes and pivots (`wheel_*`, `wing_*`, `thruster_01..04`, `lift_fan_01..04`): same
    `nodes` list as `roadster2`
  - the GLB thruster, wing and wheel pivots sit within 1e-4 m of the procedural ports, on both LODs
  - 2026-11-13 rebuild, RED on the old GLBs (`wheel_fl_axle: node exists`): each hub hangs on a static
    `<wheel>_axle` at y .357, and the rear nozzles sit one rigid offset (0, -.33, -.415) from the rear ports
  - the equipped car persists across reload (local save)
  - a save without a car loads as the Roadster with its paint
- [ ] RED tests, part 2 (not written):
  - collision box, road contact and camera target are identical to the Roadster's. No test asserts it; the
    simulation (`src/game.js`) takes no car input and is unchanged.
  - the equipped car persists across Cloud Save (the car is a local save only, see below)
  - a preview never grants the car (nothing to grant while both cars are open to everyone)
- [x] Blockout from the four studio panels (image-to-3D allowed only as a blockout). Then author the car in Blender
  around the shared collision envelope and ports. Do **not** move the ports to match the image.
  - 2026-11-12: `assets-src/crimson-gt/` (`build.py`, `bake.py`, `crimson-gt.blend`), authored in bpy, no
    image-to-3D mesh. Ports and pivots are the Roadster's. Silhouette IoU against the panels is 0.745 to 0.833,
    below the 0.90 forms target; the measured deviations and the inferred list are in
    `assets-src/crimson-gt/asset-brief.md`. Parity review and sign-off stay open under "By device".
  - 2026-11-13: rebuilt from the panel silhouettes instead of the Roadster's shape (`build/gt_body.py`,
    `build/gt_parts.py`). Wheel, wing and lift-port pivots stay on contract; the owner approved a smaller tyre
    (radius .337) and a shorter tail with the rear nozzles ahead of the contract rear ports. Silhouette IoU:
    side 0.936, front 3/4 0.865, rear 3/4 0.871, rear 0.857 (0.968 / 0.872 / 0.880 / 0.905 without the wing,
    which only one panel shows). The 0.90 target is met in the side view only.
- [x] Materials: a deep-red metallic clearcoat that responds to `PAINTS`, emissive light blade and rear bar,
  dark glass, five-spoke wheels.
  - 2026-11-13: all 6 `PAINTS` tint the GLB body (`tests/crimson-gt-browser.spec.js`).
  - LOD0 22,540 triangles / 1,180,364 B, low 13,636 triangles / 509,964 B, KTX2 normal and AO (2026-11-13 rebuild).
  - `check-glb: PASS` on both LODs; manifest hashes match (`tests/model-manifest.test.js`).
- [ ] Material gaps: the paint has no flake layer (factors only); no interior behind the glass, no hood vents.
  The rims are dark since the 2026-11-13 rebuild.
- [x] Rig via `bindGarageRig` unchanged (`src/garage-model-rig.ts` has no diff); the wheels spin in a race. All 6
  paints and all 22 `GARAGE_SKINS` preview on the new car (`tests/crimson-gt-browser.spec.js`, 2026-11-13).
- [ ] Wing tilt/raise and lift fans following the jets are not asserted on the GT (same rig nodes as `roadster2`,
  whose specs cover them); only the last of the 22 skins was inspected in a screenshot.
- [x] Garage car selection UI (2026-11-13, `src/GarageCarPicker.vue`, `src/car-catalog.ts`):
  - a car picker on Garage Home and Preview Studio, showing the car in use
  - the equipped car is shown on the Home showcase and in races, with no URL flag
  - keyboard (Enter on a native button), touch on phone portrait 390x844 and landscape 844x390, and car names in
    every supported language (`tests/i18n.test.js`)
  - each car remembers its own paint; the GT lists its factory colour first
- [ ] Car picker: locked/trial/owned states (not built: both cars are open); focus order not asserted; the factory
  colour is a plain swatch because no painted card art exists for it.
- [x] Local save for the equipped car (`skyline-rush-car`) and each car's paint (`skyline-rush-car-paints`), with a
  backward-compatible load: no entry means the Roadster, whose paint stays in `skyline-rush-paint`. No change to
  existing paint or skin entitlements.
- [ ] Cloud Save field for the equipped car (owner 2026-11-12: local save only for now).
- [x] The Low tier requests only `crimson-gt-low.glb`; rival cars stay procedural (one GLB root in a race); a
  missing GLB falls back to the procedural car with no page error. The car never swaps during a race.
- [ ] Preload and compile the equipped car before GO: the shader-program count stayed constant over the first
  seconds of a Coast race, but `tests/shader-warmup-browser.spec.js` (boost, afterimages, top speed) has not been run
  with the GT equipped, and a race started before the GLB arrives runs on the procedural car.
- [x] `npm test`, `npm run typecheck`, `npm run build` and `node --test tests/module-size.test.js` (2026-11-13).
- [ ] Regression: rerun the Phase 2b all-track matrix and the Phase 2c equipment audit with the new car;
  `make verify`, and exact-HEAD full CI.
- [ ] What's New entry and release notes; update the `UPCOMING` notes per the repo's release rules.

## By device (repeat per machine; evidence in the ignored `../audits/`)
- [ ] Live Blender MCP scene query before the first Blender edit (Task 4's per-device setup).
- [ ] Concept-board parity review (spec v2 §8.1) of the four studio panels on a real-GPU desktop.
- [ ] Real-phone screenshots and frame-time p50/p95 for the new car versus the Roadster (`make phone-diag`).
- [ ] Owner visual sign-off on the scored parity sheet.
