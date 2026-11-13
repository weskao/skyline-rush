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
  - **Decided 2026-11-13 (owner):** the 2026-11-09 rule stands (trial + stars). The stars threshold value is still
    not decided, so the locked/trial/owned states are not built and this gate stays open.
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
- [x] Tests, part 2 (2026-11-13):
  - collision box, road contact and camera target are identical to the Roadster's: `tests/car-catalog.test.js`
    (the simulation takes no car input) and `tests/crimson-gt-browser.spec.js` "the GT stands on the road and under
    the chase camera exactly like the Roadster" (car root, chase camera, procedural tyres equal; GLB tyres touch the
    road within 0.005). These are guards: the product already behaved this way, so there was no product RED.
  - the equipped car persists across Cloud Save: see the Cloud Save box below.
- [ ] A preview never grants the car: not written, nothing to grant while both cars are open to everyone (waits for
  the unlock rule).
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
  - 2026-11-13, iteration 8: the wing rests stowed over the tail deck (owner-approved; the contract pivot is
    unchanged and a static `wing_stow` node carries the offset), so the three panels without a wing are measured
    in the rest pose and the rear three-quarter panel with the wing raised. Rest: side 0.952, front 3/4 0.878,
    rear 3/4 0.877, rear 0.882. Wing raised: 0.936 / 0.865 / 0.871 / 0.837. **0.90 is met in the side view only**;
    the measured ceilings and their reasons per view are in `assets-src/crimson-gt/asset-brief.md`. The mattes were
    not tuned.
- [x] Materials: a deep-red metallic clearcoat that responds to `PAINTS`, emissive light blade and rear bar,
  dark glass, five-spoke wheels.
  - 2026-11-13: all 6 `PAINTS` tint the GLB body (`tests/crimson-gt-browser.spec.js`).
  - LOD0 22,996 triangles / 1,204,084 B, low 13,926 triangles / 541,088 B, KTX2 normal, AO and flake
    (2026-11-13, iteration 8).
  - `check-glb: PASS` on both LODs; manifest hashes match (`tests/model-manifest.test.js`).
- [x] Material gaps closed (2026-11-13): a tiling flake normal map under the clearcoat (the baked normal shapes
  the coat), see-through glass over a cabin with seats, and a hood vent pair with slats.
  `tests/crimson-gt-model.test.js` "flake layer under the clearcoat, see-through glass over a cabin, hood vent pair"
  on both LODs; RED on the previous GLBs (no `cabin`, `hood_vent_l` or `crimson_gt_flake`, opaque glass). The cabin,
  vents and flake are inferred (the panels show them only partly): listed in the asset brief.
- [x] Rig via `bindGarageRig` unchanged (`src/garage-model-rig.ts` has no diff); the wheels spin in a race. All 6
  paints and all 22 `GARAGE_SKINS` preview on the new car (`tests/crimson-gt-browser.spec.js`, 2026-11-13).
- [x] Wing and lift fans (2026-11-13): `tests/crimson-gt-browser.spec.js` "the GT wing rests stowed, tilts and
  raises with the procedural wing, and the lift fans follow the jets" (the GLB `wing` and `wing_blade` follow the
  procedural parts, the endplates stay on the blade, the fans show with the jets). All 22 skins were captured on
  the GT one by one (`CRIMSON_GT_SHOTS=<dir>`) and inspected on contact sheets: each previews on the GT.
- [x] Garage car selection UI (2026-11-13, `src/GarageCarPicker.vue`, `src/car-catalog.ts`):
  - a car picker on Garage Home and Preview Studio, showing the car in use
  - the equipped car is shown on the Home showcase and in races, with no URL flag
  - keyboard (Enter on a native button), touch on phone portrait 390x844 and landscape 844x390, and car names in
    every supported language (`tests/i18n.test.js`)
  - each car remembers its own paint; the GT lists its factory colour first
  - 2026-11-13 fix: on a dev server started with `3d=1` (`?model=roadster&look=3d`) the Roadster GLB covered the
    equipped GT. The equipped car's own model now wins (`carModel() ?? forced` in `src/garage-model.ts`); the flag
    dresses only the Roadster. RED (`Expected "crimson-gt", Received "roadster2"`) → GREEN in
    `tests/crimson-gt-browser.spec.js`; rule 13 in `.claude/rules/3d-asset-pipeline.md`.
- [x] Car picker focus order (2026-11-13): `tests/crimson-gt-browser.spec.js` "keyboard: Tab walks the cars in
  catalog order, Enter equips the focused car, and the paints come after the picker".
- [x] Factory colour card (2026-11-13): `factory@3x.webp` (960x510, 3x the 320x170 card) is rendered from the car's
  own master by `assets-src/crimson-gt/card/render_card.py`; the plain swatch is gone
  (`tests/garage-paint-presentation.test.js`, RED before the change). Browser test "factory card" at 390x844,
  844x390 and 1440x900: native size, opaque, same frame as the other paint cards, name below. It is a render, so it
  is darker and less stylised than the six painted cards; the flake is rendered at a third of its strength for the
  card only.
- [ ] Car picker locked/trial/owned states: not built, both cars are open (waits for the unlock rule).
- [x] Local save for the equipped car (`skyline-rush-car`) and each car's paint (`skyline-rush-car-paints`), with a
  backward-compatible load: no entry means the Roadster, whose paint stays in `skyline-rush-paint`. No change to
  existing paint or skin entitlements.
- [x] Cloud Save field for the equipped car (2026-11-13): an optional `car` in the cloud document, validated in
  `firestore.rules` together with the client (`src/cloud-progress-merge.ts`, `src/cloud-progress.ts`). A save
  without it loads as the Roadster; a device that already picked a car keeps its own pick. RED → GREEN
  `tests/cloud-progress.test.js`, `tests/car-catalog.test.js`, `tests/firestore-rules.test.js`; emulator browser
  test in `tests/cloud-emulator-browser.spec.js` (`npm run test:cloud`: 16 passed, rules 3/3). Each car's paint
  stays a local save.
- [x] The Low tier requests only `crimson-gt-low.glb`; rival cars stay procedural (one GLB root in a race); a
  missing GLB falls back to the procedural car with no page error. The car never swaps during a race.
- [x] Preload and compile the equipped car before GO (2026-11-13): `tests/shader-warmup-browser.spec.js` runs with
  the GT equipped (boost, afterimages, top speed), with and without `?look=3d`: 2/2, no program compiles mid-race.
  A race started before the GLB arrives stays on the procedural car and compiles nothing; the GT dresses the car
  once the race is left (`tests/crimson-gt-browser.spec.js`).
- [x] `npm test`, `npm run typecheck`, `npm run build` and `node --test tests/module-size.test.js` (2026-11-13).
- [x] Regression with the new car (2026-11-13): `HERO_CAR=crimson-gt` equips the GT in the Phase 2b track matrix
  (`tests/hero-roadster-tracks-browser.spec.js`, which now asserts the dressed model is the equipped car's), the
  Phase 2c equipment spec and the equipment audit (`GARAGE_EQUIPMENT_AUDIT=1`). MATRIX_RESULT
  The equipment spec's showcase test assumed the Roadster's default paint; it now reads the equipped car's default
  (the GT's factory red). Under `HERO_CAR` the audit's "procedural" and "GLB" columns both show the GT, and its paint
  rows are the six `PAINTS` (the factory colour is covered by the GT spec).
- [ ] `make verify` and exact-HEAD full CI: VERIFY_RESULT
- [x] What's New entry (2026-11-13): the shipped entry is stamped 0.31.0 (2026-11-10) and a new `UPCOMING` entry
  announces the Crimson GT (en, zh-TW). Release-notes tests 30/30; `node scripts/check-release-notes.mjs 0.31.0`
  clean.
- [ ] What's New review at `/release`: fresh-eyes review, owner approval and the real-game media a new car needs.

## By device (repeat per machine; evidence in the ignored `../audits/`)
- [ ] Live Blender MCP scene query before the first Blender edit (Task 4's per-device setup).
  - 2026-11-13, one Mac: the transport answered a scene query, but the live session held another checkout's master
    with unsaved changes, so the rebuilt master was not loaded there. Builds ran headless.
- [x] Concept-board parity review (spec v2 §8.1) of the four studio panels on a real-GPU desktop: drafted
  2026-11-13 at `f0599b86` on one Mac desktop (Apple GPU through Metal, not SwiftShader). Composites and the scored
  sheet are in the ignored `../audits/crimson-gt/parity/`. Result: 0 match, 4 close (silhouette and proportions, light
  signatures, atmosphere, colour grade), 3 gap (paint depth and reflections, ground material, effects). Each gap
  names its cause and a proposal; none is accepted yet.
- [ ] Real-phone screenshots and frame-time p50/p95 for the new car versus the Roadster (`make phone-diag`): not
  captured; the checklist is in the ignored `../audits/crimson-gt/phone-checklist.md`.
- [ ] Owner visual sign-off on the scored parity sheet.
