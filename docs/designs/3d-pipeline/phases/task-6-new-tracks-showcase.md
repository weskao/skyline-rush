# Task 6 — Five new tracks adopt shared pipeline and optional showcase/cover

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 4–5 · Scope tags: [README.md](README.md).

**Files:** shared loader/manifests established in Task 3; branch-specific scene modules only with owner approval, per-track visual assets, existing showcase modules and tests.
**Produces:** reusable, measured visual assets for Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown and Stormline Megacity.

## By project (committed once)
- [ ] Wait until shared pipeline is validated and integrated according to repository branch policy. Don't change sibling map branches from this working branch.
- [ ] Define each map's unique foreground landmarks, reference images, licensed texture sets, world-space scale and deterministic chunk/LOD budgets with its owner.
- [ ] Use reference-led Blender models only for major nearby features and hero landmarks; farther scenery retains low-cost procedural geometry and correct occlusion.
- [ ] Add per-map parity tests for course frames, checkpoints, collisions, flying shortcuts and no missing GLB or pipeline stall. Test weather/fog and game speed separately.
- [ ] Build actual running-game captures for launch/cover assets, only after Task 4b, so they show the hero GLB car players actually drive. Generated concept images (e.g. [concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg), also the per-map mood source) remain mood-board only; label separate from WebGL proof.
- [ ] Review source asset licensing and owner art approval; exact-HEAD CI.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Landmark sculpting uses the same per-device Blender/MCP setup as Task 4; re-verify live scene query on that machine first.
- [ ] Measure tier-by-tier across a Mac and a phone; cover captures come from a real running game on a device that passed Phase 0.
