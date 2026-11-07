# Task 4 — Reference-led high-fidelity Roadster in Garage

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2 (Roadster) · TODO Phase 3 · Scope tags: [README.md](README.md).

**Files:** assets-src/roadster2/ (planned), public/models/cars/ (planned), src/car-model.js, src/garage-stage.ts, src/roadster-fidelity.js for procedural fallback only, tests/roadster-fidelity.test.js, tests/garage-*-browser.spec.js.
**Produces:** real GLB-based hero car demonstrably matching approved front/side/rear reference while maintaining game controls and vehicle attachments.

Owner decisions (2026-11-07): script-built `build.py` + Blender MCP iteration; Garage only behind `?model=roadster`; baked normal/AO textures as KTX2. Delivered as `assets-src/roadster2/`, `public/models/roadster2/roadster2.glb` (1,485,584 B, 3,344 tris, check-glb PASS), manifest entry `roadster2`, rig `src/garage-model-rig.ts`. No shared car file (`car-model.js`, `roadster-fidelity.js`, physics, VFX ports) was edited.

## By project (committed once)
- [x] Use [concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg) (top-left studio views) as the look target only; proportions, anchors and ports come from the photographs below and the existing simulation.
- [x] Read all docs/designs/roadster2-reference/ photographs, Garage visual contract and active roadster feature branch; reconcile its completed diff before editing any shared car file. Do not overwrite branch work. (No shared car file edited; pivots/ports taken from the current procedural car.)
- [x] RED tests for named four independent wheels, active wing, exact original VFX ports/collision frame/paint targets, fallback and camera visibility: `tests/garage-model-rig.test.js` (wheels, `_spin`, wing/blade/tips/rams, paint/light, jets drawn, dispose, probe wheels untouched), `tests/garage-model-roadster-browser.spec.js` (Home ground/wing/flight/paint, Studio front/side/rear/3⁄4 in frame, 404 fallback, phone). VFX ports and collisions stay owned by the procedural car, which the GLB only dresses.
- [ ] Sculpt the car in visually gated iterations. **Done:** five forms iterations plus an art pass (it6: smooth no-overshoot body/canopy resample, door cuts/sill line/hood seams baked into the normal map, lamp pockets, finned diffuser, low sill strip); `.blend` master, Python source and validated GLB committed. **Acceptance changed by the owner (2026-11-07):** IoU 0.90 conflicts with the fixed contract (wheelbase, tyre radius, ±3 % bounds, wing pivot), so IoU is a recorded deviation and fidelity is accepted by detail + owner visual sign-off. it6 IoU: side 0.791, front 0.860, rear 0.925, rear-quarter 0.828. **Open:** owner visual sign-off.
- [x] Rig/animate only visual pivots, use PBR and HDRI with explicit environment license, run GLB validation/LOD optimization. Test paint selection without affecting ownership. **Done:** visual-pivot rig, PBR + KTX2 normal/AO, existing Garage environment (no new HDRI), check-glb validation, paint follow test, low LOD (`roadster2-low.glb`, 4,150 tris / 485,732 B; `optimize-glb.mjs --lod low` = simplify + 512 px textures; low quality tier loads only it, `tests/garage-model-roadster-browser.spec.js`).
- [ ] Deploy only after all RED→GREEN and Garage/race/flight/BOOST/NITRO screenshots, performance and exact-HEAD CI evidence; obtain owner visual sign-off for fidelity.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] The machine doing the sculpting has Blender UI open with the MCP server running (N panel) and Task 3's per-device approvals in place; re-verify with a live scene query before the first edit.
- [ ] Any image-to-3D / generator credentials (e.g. Hyper3D keys, Poly Haven / Sketchfab tokens) live only in that machine's Blender addon preferences; never in repo, `.mcp.json` or logs.
- [ ] Owner sign-off screenshots are taken on a real desktop and a real phone; per-device frame numbers stay in `../audits/`.
