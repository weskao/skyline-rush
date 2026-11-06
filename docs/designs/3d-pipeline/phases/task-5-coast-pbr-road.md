# Task 5 — Coast road UV, PBR and streaming pilot

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 3 · Scope tags: [README.md](README.md).

**Files:** src/geometry.ts (roadRibbon UV), src/world-tour-scene.js, src/track-palettes.ts, src/coast-visuals.ts, src/world-tour-scenery.js, tests/phase4-road-materials.test.js and new UV seam test.
**Produces:** PBR asphalt/shoulder/track objects at Coast with unaffected track frame, lanes and collisions.

## By project (committed once)
- [ ] RED tests for UV continuity across moving road ribbon/chunks, correct tangent-space orientation, road widths, world-frame transforms, track switch and collision/vehicle-road clearance parity.
- [ ] Add UV0 and safe road PBR texture assignment with per-quality resources; static terrain props may use an authored GLB with existing deterministic 120 m chunk placement/InstancedMesh.
- [ ] Validate asset stream eviction and no duplicate draw calls; preserve Low visuals and proper renderer ownership.
- [ ] Full verification and exact-HEAD CI, no silent map topology changes.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Real WebGL screenshots/draw and p50/p95 tables across Coast rain/day and other ten tracks on a Mac and a phone (`make phone-diag`); verify drift, flight/landing and ramps on each.
- [ ] Thermal / sustained-FPS note per device class; commit only the device-class summary table.
