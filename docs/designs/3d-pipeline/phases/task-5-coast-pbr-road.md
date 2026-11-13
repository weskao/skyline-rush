# Task 5 — Coast look development: PBR road, lighting and effects

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec v2 Phase 3 · Scope tags: [README.md](README.md).

**Look target:** the Coast panels of [../concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg): top-right grounded, thruster boost and flight; middle-row Coast day and Coast rain at sunset.
**Files:** src/geometry.ts (roadRibbon UV), src/world-tour-scene.js, src/track-palettes.ts, src/coast-visuals.ts, src/world-tour-scenery.js, src/world.js (environment/tone mapping/bloom), src/aero-vfx.js and src/effects.js (glow, plume, spray), tests/phase4-road-materials.test.js and new UV seam test.
**Produces:** PBR asphalt, shoulder and track objects at Coast with unaffected track frame, lanes and collisions. Also a shared lighting/post pass and board-level effects that every map and both cars reuse.

**Owner decisions (2026-11-08):** realistic, high-quality material feel is the production priority. Road textures are
Blender-baked KTX2 from CC0 photoscanned sources; close scenery comes from Poly Haven (CC0) scans; a new **Ultra**
quality tier is added. Each source's licence, creator and source URL goes in the model/material manifest before
commit. Procedural substitutes are a fallback (Low tier, load failure), never the shipped Medium+ look.

**Gate on develop (owner, 2026-11-09):** develop keeps its current appearance. The whole Phase 3 pass (Coast HDRI look
with its bloom/sun retune, KTX2 road, close-scenery GLB, wet-road mirror, magenta plume tail, thruster glow, rain wheel
spray, contact shadow, Ultra quality option and Ultra lens blur) is opt-in behind `?look=3d` (`src/look-gate.ts`), the
same way the car is gated by `?model=roadster`; the two gates are independent and combine (`?model=roadster&look=3d`).
Without `?look=3d` every map and the Settings panel render as develop did: no Ultra option, and a saved Ultra choice
renders and shows as High but stays saved. Default-on is deferred by the owner, as for the car. Guards:
`tests/look-gate.test.js`, `coast-scenery-browser.spec.js` (develop-look Coast), `device-quality-browser.spec.js` (no
Ultra without the gate); the shader-warmup and black-frame specs run both looks. The checkboxes below describe the
`?look=3d` look.

## By project (committed once)
- [x] Look brief: for each Coast panel, record its camera, time of day, weather and the spec v2 §8.1 checklist items it scores, before any change. *Evidence: `coast-look-brief.md` (b6a39ad6).*
- [x] Shared lighting and post: per-time-of-day environment map from CC0 HDRIs (day, sunset, overcast rain), tone mapping and colour grade, bloom tuned for light blades, contact shadow under the car, and sun/haze. Measure the cost per tier, and keep Low on the current path (RoomEnvironment, current tone mapping).
  - [x] CC0 HDRI per time of day, exposure and colour grade (`coast-lighting.test.js`, 985f6984); Low keeps RoomEnvironment; tight contact shadow (`contact-shadow.test.js`, 0b442e75).
  - [x] The `?model=roadster` GLB keeps the softened car reflection map under every Coast HDRI: it had mirrored the full rain HDRI and washed out white on High/Ultra (`garage-model.test.js` RED→GREEN, 75295f87; Roadster, Garage, warmup and black-frame specs 71/71).
  - [x] Bloom tuned for light blades and the sun matched to each HDRI (`coast-look.test.js`, `coast-lighting.test.js`, f4e25c4f); haze stays the existing per-preset fog. Per-tier cost resolved below vsync with GPU-synced frame timing (`tier-cost-benchmark-browser.spec.js`, 080bbd4a): Low ≈ 4.9 ms, Medium ≈ 8.6 ms, High 8.7 ms day / 9.1 ms rain, Ultra within 0.2 ms of High (one Mac; table in ignored audits).
- [x] Wet road: puddle and roughness masks with reflections of lights and sky on wet asphalt (environment-map or planar approximation, chosen by benchmark), in rain and at sunset.
  - [x] One wet variant driven by a `wetness` uniform: puddle albedo, roughness and flat normal from packed.b in rain, dusk and fog, with no recompile (905322ea; browser: rain flip compiles no program).
  - [x] Env-map vs planar Reflector benchmark: env map plus a lights-only half-res mirror on High/Ultra (+0.3 ms) chosen over a full planar Reflector (+2.2 ms); panel 5 now shows wet asphalt with sky and lamp reflections (`wet-reflection.test.js`, `wet-road-benchmark-browser.spec.js`, 5e6bb634).
- [x] Road material: Blender-baked KTX2 set (base colour sRGB; normal and roughness/AO linear) from a CC0 photoscanned asphalt, with lane paint and a dry/wet roughness + puddle mask; per-tier resolution (Medium 1K, High 2K, Ultra 2K plus detail normal), within a recorded texture-memory budget; KTX2Loader transcoder served from the built bundle and tested offline. *Evidence: 4a44116a, 905322ea, 447a5e3b; `coast-road-material.test.js`, `material-manifest.test.js`, browser offline KTX2 + Ultra no-compile-after-GO.*
- [x] Ultra tier: new quality option after High (settings UI, en + zh-TW copy, saved preference, migration of existing saves). It is never auto-selected by device detection; every map renders on Ultra at least as High does.
  - [x] Settings option, en/zh-TW copy, saved preference (older saves stay valid without migration), never auto-selected (6777d8c9).
  - [x] Ultra screenshots on every map: all ten selectable maps raced on High and Ultra, same programs and draw calls, no page errors, Ultra at least as High in side-by-side review (`ultra-maps-capture-browser.spec.js`; desktop frames in ignored audits).
- [x] Effects toward the board, on the existing ports: thruster glow and boost-plume colour and length, wheel spray in rain, and a speed-line or motion-blur approximation only as Ultra after benchmarking. Each one needs a Low-tier fallback and must not compile after GO.
  - [x] Magenta plume tail and length (Low keeps the old plume), rain wheel spray (none on Low), stronger Ultra-only lens blur; warmup and black-frame specs extended (0f918d92).
  - [x] Thruster glow discs in flight and under boost, faint idle glow, none on Low, one warmed program (`thruster-glow.test.js`, 54c19833); its cost is within benchmark noise (< 0.1 ms, 080bbd4a).
- [x] Close scenery: sea arch, cliffs, palms and guard rails as GLB with deterministic chunk placement. Cliffs and rocks are Poly Haven CC0 scans decimated to budget with baked normals; the sea arch is kitbashed in Blender from those scans; palms and W-beam guard rails (absent from Poly Haven) are modelled in Blender with CC0 photoscanned PBR textures. Distant objects stay procedural. *Evidence: 5693439d, 54da98ae, f518da7e, 0396bc51.*
- [x] RED tests for UV continuity across moving road ribbon/chunks, correct tangent-space orientation, road widths, world-frame transforms, track switch and collision/vehicle-road clearance parity. *Evidence: `road-ribbon-uv.test.js` (8c6652c5), `coast-scenery-glb.test.js`, `coast-lighting.test.js` (track switch).*
- [x] Add UV0 and safe road PBR texture assignment with per-quality resources; static terrain props may use an authored GLB with existing deterministic 120 m chunk placement/InstancedMesh. *Evidence: 8c6652c5, 905322ea, f518da7e.*
- [x] Validate asset stream eviction and no duplicate draw calls; preserve Low visuals and proper renderer ownership. *Evidence: `coast-scenery-glb.test.js` "driving evicts chunks without leaks, duplicate draws…"; Low specs in `coast-scenery-browser.spec.js`.*
- [ ] **Full-scene upgrade (owner, 2026-11-09).** The owner judged Coast **not yet at their standard**: every element of
  the map needs the realistic treatment, not only the road and close scenery. "Distant objects stay procedural" above
  no longer holds for the shipped Medium+ look. Each item below follows the owner decisions at the top (realistic
  first, licensed sources in the manifest, procedural only as Low/load-failure fallback) and the shared rules (no
  change to the track frame, lanes, collisions or ports; deterministic chunks; budgets; no compile after GO).
  Gap list, constraints and the owner decisions D1–D3: [coast-full-scene-gap.md](coast-full-scene-gap.md).
  - [x] Owner decisions (2026-11-13): D1 remove the skyline buildings from Coast (the board has none; Neon keeps
    its city), D2 remove the bridge towers from Coast (other classic tracks keep theirs), D3 the visible sky is
    the existing Poly Haven HDRIs at a higher resolution.
  - [ ] Skyline buildings and bridge towers: removed from Coast in the `?look=3d` look (D1, D2); no realistic
    towers are built.
  - [x] Sea: a water surface (baked FFT-ocean normal and foam map, Fresnel reflection of the sky dome on screen, sun
    glitter under that sky's sun, foam where the placed rocks, cliffs and arch stand in the water, haze into the dome
    horizon) in day, rain, sunset and fog, behind `?look=3d` on Medium+. `c3dbb1dc` (wave map, build script,
    manifest), `1e528477` (runtime). Tests: `tests/coast-sea.test.js`, `tests/coast-assets.test.js` ("water"),
    `tests/shader-safety.test.js` (now lints the sea shaders). Gates: `npm test` 2796 pass / 0 fail / 3 skipped,
    typecheck, build, module-size. Real WebGL (`COAST_CAPTURE=1 COAST_PANELS=1`, desktop High / Ultra / Low and a
    phone-size viewport on Medium): `data-coast-sea` = `water`, `procedural` on Low; one more program (76, was 75),
    constant across the day to rain swap; draw calls unchanged or lower (the sea lines are not drawn); 60 fps.
    Captures in ignored `../audits/task5/`. Limits: the wave map is generated (a water surface cannot be scanned);
    the foam footprint is each piece's bounding ellipse; a floating-origin rebase shifts the wave pattern for one
    frame. Not verified: a real phone GPU.
  - [x] Sky (D3): each Coast preset's Poly Haven lighting HDRI (day, rain, sunset, fog) shown at a higher resolution
    on a sky dome (4K; 8K on Ultra), with the sun disc and directional light aligned to the HDRI sun, behind
    `?look=3d`. `d7137534` (KTX2 textures, manifest), `ddf48900` (runtime). Tests: `tests/coast-sky.test.js`,
    `tests/coast-sky-manifest.test.js`, `tests/coast-environment.test.js`, `tests/coast-look.test.js` ("the key
    light and the environment turn with the dome"). Gates: `npm test` 2788 pass / 0 fail / 3 skipped, typecheck,
    build, module-size. Real WebGL (`COAST_CAPTURE=1 COAST_PANELS=1`, desktop High / Ultra / Low and a phone-size
    viewport on Medium): `data-coast-sky` = `day:4096`, `day:8192` on Ultra, `procedural` on Low; a mid-race day
    to rain swap keeps `renderer.info.programs` constant; 60 fps. Captures in ignored `../audits/task5/`.
    Not verified: a real phone GPU. Free Drive with a non-day preset shows the procedural sky until its texture
    lands (no countdown to hide the download).
  - [x] Distant terrain and the mid band: far headlands and sea stacks are the close scenery's Poly Haven cliff and
    rock scans (same licence entry, no new asset) at headland size, in 480 m slots keyed by absolute distance and
    the endless seed, drawn as extra instances of the existing pools; the scene fog gives the haze layers. The
    procedural cones are not drawn on Coast Medium+ while the scan coast is attached; Low and a failed GLB load keep
    them. `875758bc`. Tests: `tests/coast-scenery-glb.test.js` ("far plan", "far window", "far pieces are more
    instances"), `tests/coast-assets.test.js` ("procedural cones"), `tests/coast-scenery-browser.spec.js` ("draw-call
    cap": High home 700, race 560, set before the far content). Gates: `npm test` 2800 pass / 0 fail / 3 skipped,
    typecheck, build, module-size. Real WebGL (desktop High / Ultra / Low, phone-size Medium): draw calls and
    programs unchanged (High race 469, was 482; 76 programs), triangles High race 406k to 495k and phone-size Medium
    346k to 415k, 60 fps on the capture machine. Limits: the far pieces draw the full-detail scans (no decimated far
    LOD yet); no shore foam at their base; rock tops are bare (the board shows green tops); a new slot enters at
    about 70% fog on Medium. Not verified: a real phone GPU.
  - [ ] Remaining procedural props on Coast (rail lights, lamp posts): not assessed.
  - [ ] The concept-board parity review and owner sign-off below wait for these items.
- [ ] Full verification and exact-HEAD CI, no silent map topology changes.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Real WebGL screenshots/draw and p50/p95 tables across Coast rain/day and other ten tracks on a Mac and a phone (`make phone-diag`); verify drift, flight/landing and ramps on each.
  - [x] Desktop Apple silicon (one Mac, 2026-11-09): every selectable map raced on High and Ultra at 1440×900 and an 844×390 viewport with GPU-synced p50/p95, draw calls and triangles, no page errors (`ultra-maps-capture-browser.spec.js`); Coast day/rain per tier (`tier-cost-benchmark-browser.spec.js`); flight/landing on every track (`hero-roadster-tracks-browser.spec.js`). Tables in ignored audits.
  - [ ] Phone (`make phone-diag`): NOT VERIFIED, needs owner hardware. The 844×390 viewport above is a desktop GPU, not a phone.
- [ ] Thermal / sustained-FPS note per device class; commit only the device-class summary table.
  - [x] Sustained run tool: `tests/sustained-fps-browser.spec.js` (gated, `SUSTAINED=1`), 10 min of Coast rain with the car held on the course, delivered fps and GPU-synced cost per minute, macOS thermal state before and after.

    | Device class | Scene | Minutes | Delivered fps | GPU-synced p50 / p95 | Thermal warning |
    |---|---|---|---|---|---|
    | Desktop Apple silicon, active cooling | Coast rain, High, 1440×900 | 10 | 59.8–60 | 9.4–10.6 / ≤ 12.8 ms | none |
    | Phone | — | — | NOT VERIFIED | — | — |
  - [ ] Phone class run: NOT VERIFIED (passive cooling is the class that throttles).
- [ ] Concept-board parity review (spec v2 §8.1) of the five Coast panels on a real-GPU desktop, with the Roadster and, once Task 7 lands, the concept car. Owner sign-off on the scored sheet.
