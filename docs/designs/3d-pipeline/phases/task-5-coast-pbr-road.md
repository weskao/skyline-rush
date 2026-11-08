# Task 5 — Coast look development: PBR road, lighting and effects

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec v2 Phase 3 · Scope tags: [README.md](README.md).

**Look target:** the Coast panels of [../concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg): top-right grounded, thruster boost and flight; middle-row Coast day and Coast rain at sunset.
**Files:** src/geometry.ts (roadRibbon UV), src/world-tour-scene.js, src/track-palettes.ts, src/coast-visuals.ts, src/world-tour-scenery.js, src/world.js (environment/tone mapping/bloom), src/aero-vfx.js and src/effects.js (glow, plume, spray), tests/phase4-road-materials.test.js and new UV seam test.
**Produces:** PBR asphalt, shoulder and track objects at Coast with unaffected track frame, lanes and collisions. Also a shared lighting/post pass and board-level effects that every map and both cars reuse.

**Owner decisions (2026-11-08):** realistic, high-quality material feel is the production priority. Road textures are
Blender-baked KTX2 from CC0 photoscanned sources; close scenery comes from Poly Haven (CC0) scans; a new **Ultra**
quality tier is added. Each source's licence, creator and source URL goes in the model/material manifest before
commit. Procedural substitutes are a fallback (Low tier, load failure), never the shipped Medium+ look.

## By project (committed once)
- [ ] Look brief: for each Coast panel, record its camera, time of day, weather and the spec v2 §8.1 checklist items it scores, before any change.
- [ ] Shared lighting and post: per-time-of-day environment map from CC0 HDRIs (day, sunset, overcast rain), tone mapping and colour grade, bloom tuned for light blades, contact shadow under the car, and sun/haze. Measure the cost per tier, and keep Low on the current path (RoomEnvironment, current tone mapping).
- [ ] Wet road: puddle and roughness masks with reflections of lights and sky on wet asphalt (environment-map or planar approximation, chosen by benchmark), in rain and at sunset.
- [ ] Road material: Blender-baked KTX2 set (base colour sRGB; normal and roughness/AO linear) from a CC0 photoscanned asphalt, with lane paint and a dry/wet roughness + puddle mask; per-tier resolution (Medium 1K, High 2K, Ultra 2K plus detail normal), within a recorded texture-memory budget; KTX2Loader transcoder served from the built bundle and tested offline.
- [ ] Ultra tier: new quality option after High (settings UI, en + zh-TW copy, saved preference, migration of existing saves). It is never auto-selected by device detection; every map renders on Ultra at least as High does.
- [ ] Effects toward the board, on the existing ports: thruster glow and boost-plume colour and length, wheel spray in rain, and a speed-line or motion-blur approximation only as Ultra after benchmarking. Each one needs a Low-tier fallback and must not compile after GO.
- [ ] Close scenery: sea arch, cliffs, palms and guard rails as GLB with deterministic chunk placement. Cliffs and rocks are Poly Haven CC0 scans decimated to budget with baked normals; the sea arch is kitbashed in Blender from those scans; palms and W-beam guard rails (absent from Poly Haven) are modelled in Blender with CC0 photoscanned PBR textures. Distant objects stay procedural.
- [ ] RED tests for UV continuity across moving road ribbon/chunks, correct tangent-space orientation, road widths, world-frame transforms, track switch and collision/vehicle-road clearance parity.
- [ ] Add UV0 and safe road PBR texture assignment with per-quality resources; static terrain props may use an authored GLB with existing deterministic 120 m chunk placement/InstancedMesh.
- [ ] Validate asset stream eviction and no duplicate draw calls; preserve Low visuals and proper renderer ownership.
- [ ] Full verification and exact-HEAD CI, no silent map topology changes.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Real WebGL screenshots/draw and p50/p95 tables across Coast rain/day and other ten tracks on a Mac and a phone (`make phone-diag`); verify drift, flight/landing and ramps on each.
- [ ] Thermal / sustained-FPS note per device class; commit only the device-class summary table.
- [ ] Concept-board parity review (spec v2 §8.1) of the five Coast panels on a real-GPU desktop, with the Roadster and, once Task 7 lands, the concept car. Owner sign-off on the scored sheet.
