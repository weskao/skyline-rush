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
- [ ] The concept board's generator and terms of use, recorded in [../concept-art/README.md](../concept-art/README.md).
  This is a release gate.
  - **Decided 2026-11-09 (owner): the board is AI-generated; its generator and terms of use are recorded in the
    concept-art README, and the GT may be derived from the board's design.** Derivation is allowed only once that
    record shows the terms permit commercial use and redistribution.
  - **Still open:** the owner writes the generator name and terms into the README (not recorded yet).

## By project (committed once)
- [ ] RED tests first:
  - the manifest has the required nodes and pivots (`wheel_*`, `wing_*`, `thruster_01..04`, `lift_fan_01..04`)
  - the GLB thruster and wheel positions sit within 1e-4 m of the procedural ports
  - collision box, road contact and camera target are identical to the Roadster's
  - the equipped car persists across reload and Cloud Save
  - a save without a car migrates to the Roadster
  - a preview never grants the car
- [ ] Blockout from the four studio panels (image-to-3D allowed only as a blockout). Then author the car in Blender
  around the shared collision envelope and ports. Do **not** move the ports to match the image.
- [ ] Materials: a deep-red metallic flake clearcoat that responds to `PAINTS`, emissive light blade and rear bar,
  dark glass, multi-spoke dark wheels.
  - Use LOD0/low with KTX2 textures.
  - `check-glb` must PASS on both LODs and the manifest hashes must match.
- [ ] Rig via `bindGarageRig` unchanged (wheels spin, the wing tilts and raises, lift fans follow the jets). Every
  Phase 2c paint and skin must render on the new car.
- [ ] Garage car selection UI:
  - a car picker on Garage Home and Preview Studio, with locked/trial/owned/equipped states
  - the equipped car is shown on the Home showcase and in races
  - keyboard and focus order, touch, and every supported language
- [ ] Save and Cloud Save field for the equipped car, with a backward-compatible migration. No change to existing
  paint or skin entitlements.
- [ ] Preload and compile the equipped car before GO; the Low tier uses its low LOD. Rival cars stay procedural.
- [ ] Regression: rerun the Phase 2b all-track matrix and the Phase 2c equipment audit with the new car; `npm test`,
  `npm run typecheck`, `npm run build`, `make verify`, and exact-HEAD full CI.
- [ ] What's New entry and release notes; update the `UPCOMING` notes per the repo's release rules.

## By device (repeat per machine; evidence in the ignored `../audits/`)
- [ ] Live Blender MCP scene query before the first Blender edit (Task 4's per-device setup).
- [ ] Concept-board parity review (spec v2 §8.1) of the four studio panels on a real-GPU desktop.
- [ ] Real-phone screenshots and frame-time p50/p95 for the new car versus the Roadster (`make phone-diag`).
- [ ] Owner visual sign-off on the scored parity sheet.
