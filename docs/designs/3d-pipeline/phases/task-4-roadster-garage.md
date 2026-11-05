# Task 4 — Reference-led high-fidelity Roadster in Garage

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2 (Roadster) · TODO Phase 3 · Scope tags: [README.md](README.md).

**Files:** assets-src/roadster2/ (planned), public/models/cars/ (planned), src/car-model.js, src/garage-stage.ts, src/roadster-fidelity.js for procedural fallback only, tests/roadster-fidelity.test.js, tests/garage-*-browser.spec.js.
**Produces:** real GLB-based hero car demonstrably matching approved front/side/rear reference while maintaining game controls and vehicle attachments.

## By project (committed once)
- [ ] Read all docs/designs/roadster2-reference/ photographs, Garage visual contract and active roadster feature branch; reconcile its completed diff before editing any shared car file. Do not overwrite branch work.
- [ ] RED tests for named four independent wheels, active wing, exact original VFX ports/collision frame/paint targets, fallback and camera visibility.
- [ ] Sculpt the car in visually gated iterations (Blender MCP + `blender-image-to-3d`, both proven in Task 0). Export front, side, rear and rear-quarter same-camera comparisons; inspect body panel smoothness, lamp shapes, five-blade wheels and quad dark recessed thrusters. Commit the `.blend` master, Python source and validated GLB.
- [ ] Rig/animate only visual pivots, use PBR and HDRI with explicit environment license, run GLB validation/LOD optimization. Test paint selection without affecting ownership.
- [ ] Deploy only after all RED→GREEN and Garage/race/flight/BOOST/NITRO screenshots, performance and exact-HEAD CI evidence; obtain owner visual sign-off for fidelity.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] The machine doing the sculpting has Blender UI open with the MCP server running (N panel) and Task 3's per-device approvals in place; re-verify with a live scene query before the first edit.
- [ ] Any image-to-3D / generator credentials (e.g. Hyper3D keys, Poly Haven / Sketchfab tokens) live only in that machine's Blender addon preferences; never in repo, `.mcp.json` or logs.
- [ ] Owner sign-off screenshots are taken on a real desktop and a real phone; per-device frame numbers stay in `../audits/`.
