---
paths:
  - "src/**/*.js"
  - "src/**/*.ts"
  - "src/**/*.vue"
  - "src/**/*.css"
---

# Performance review is part of every feature change

Not an optional later pass. Preserve fidelity first; optimize how it is rendered, not what.

Do:
- Share geometry/materials, GPU-instance, camera-cull, stream scenery deterministically with
  bounds, cache static matrices/geometry, scale pixel ratio to the validated quality tier
  (High keeps full fidelity).
- Batch instanced uploads; update only what visibly changed.
- Dispose unique geometry/buffers/textures/render targets when done. Never dispose shared
  geometry or materials on a single chunk eviction.

Don't:
- Rebuild unchanged scene graphs, road geometry, buffer attributes, shaders or instance matrices
  per frame.
- Allocate large transient arrays/objects in hot loops; force SVG/DOM layout needlessly.
- Allocate GPU resources repeatedly while driving.
- Add overdraw, high pixel ratios, heavy bloom or centre-screen glare.
- Add a PointLight to each streamed Volcanic Crown chunk: the 1,500 m view used to expose many at once and change the shader light count as chunks became visible. Keep exactly two pooled lava lights and the fixed crater light attached to the race root; move only their positions/intensities, never their visibility.

Measure CPU and GPU: frame time median/p95, draw calls, triangles, GPU memory, stalls,
allocations, across 5–8 km continuous driving on High/Medium/Low. Report before/after numbers;
no unmeasured FPS claims.

Tests: unit + browser regression for performance-sensitive code and scene correctness after
batching/culling; real WebGL screenshots on all affected courses incl. pause/restart, track
switch, WebGL recovery, low-power devices, narrow phone/landscape. Final report names untested
devices and remaining uncertainty.

## Traffic is one instanced fleet

Each traffic car used to be its own `makeCar()` group: 15 draw calls per car in view, 1,549 with 108 cars.
`src/traffic-fleet.ts` bakes each traffic style into one geometry per material and draws every car as an
instance of a `marker-pool.js` pool: 21 calls at any car count, 6 more in the wet-road mirror pass. `world.js`
poses plain `Object3D`s through `updateCar` and calls `trafficFleet.sync()` once per frame. Culling stays on:
the pool rebuilds each mesh's bound from that frame's cars. A traffic car that needs a moving part (brake
light, indicator, spinning wheel) gets an instanced attribute or its own pooled mesh, never a group per car.
Guards: `tests/traffic-fleet.test.js`, `tests/traffic-instancing-browser.spec.js`.

## Home map switching: preserve the last two Coming Soon stages

The 3D swipe snapshots temporarily select the neighbor and then return to the selected track.
Never destroy/rebuild an environment, four cars or their effects on every transition. Keep a bounded
two-stage LRU in `upcoming-showcase.ts`, reuse the same scene and model host on a return swipe,
evict inactive scenes with proper GPU/GLB disposal, and release all stages when the world exits.
Selection must execute once per completed swipe (not again after the page animation).
Guard the LRU/paint/disposal in `tests/upcoming-showcase.test.js` and selection count in
`tests/track-swipe-browser.spec.js`. Do not substitute static screenshots for live 3D previews.

## Shaders compile at first draw — never mid-race

WebKit (iPhone Safari/Chrome) builds shaders and Metal pipelines the first time a material is
drawn; a first draw mid-race stalls the frame and flashes black patches. `warmupShaders`
(`src/shader-warmup.ts`) draws the whole scene graph once, hidden objects included, on the first
frame and on every track change, so no per-module warmup flag is needed. Keep it complete:

- Every material a race can show is attached to some object in the scene before racing starts;
  hidden is fine. Pooled meshes carry every variant (`effects.js` rings/pickups cycle through all
  tiers), and streamed content has a hidden sample (`shaderRack` in `world-tour-scene.js`: every
  prop kind batched and plain, the terrain ribbon, all tunnel shells and entrances per track). A
  material only used after a swap (`mesh.material = …`) must still sit on a pooled mesh at load.
- Detailed looks can hide fallback skies and terrain with `material.visible` while keeping their
  children visible. Warmup draws those materials too, then restores visibility before the real frame.
- The visible-light count is part of every lit shader's cache key. Never toggle `light.visible`
  while a track runs; keep the light visible and drive `intensity` (alpine tunnel lights).
  Changing the count recompiled 8 programs at the bore.
- Instanced vs plain, `DoubleSide`, `flatShading`, `vertexColors` and `transparent` each make a
  separate program: a new combination needs a placeholder too. Never mutate a shared material
  (`material.side = …`) to get one; ask the kit for a dedicated material.
- Guards: `tests/shader-warmup-browser.spec.js` (no program compiles after the first racing frame
  through boost, afterimages, shockwave and top speed) and `tests/world-tour-mid-race-browser.spec.js`
  (program count constant across each tunnel, `playwright.world-tour.config.js`). A new effect,
  prop, light or track keeps both green; extend them when adding an event that first shows
  something. Diagnose with `renderer.info.programs` and `renderer.properties.get(material)
  .currentProgram.cacheKey` to name the offending material.
- Production builds skip three.js's `renderer.debug.checkShaderErrors` (a synchronous info-log read
  per program that defeats parallel compile): third frame 7% sooner on desktop, 15% at 6x CPU
  throttle (2026-11-14). Make every race renderer through `createRenderer` (`src/webgl-renderer.ts`);
  dev and VITE_DIAG builds keep the check. Guard: `tests/webgl-renderer.test.js`.

## Fit airflow when the displayed model changes

Sample the neutral-pose shell in vehicle-local coordinates before animating the wheels and wing. Refit when a GLB or LOD attaches and restore the procedural fit on removal. Reuse the warmed airflow material and dispose replaced geometry. The same fit serves Home, Garage Studio, Coming Soon and races. The model swap and fallback regression lives in `tests/garage-model-rig.test.js`. Skin animation must use the fitted paths’ outward directions and reuse the same mesh when the skin changes. Refresh cached Coming Soon stages when the selected airflow skin changes. Every size-dependent airflow number (pressure footprint, wake range, skin motion scale, dash-ribbon/roll-wake anchor) comes from `airflowFrame(profile)` in `src/airflow-geometry.ts`; skin amplitudes live once in `SKIN_MOTION` and the shader interpolates them. Never add a Roadster-sized constant, clamp or per-car value: a new car or a new display size (src/car-display-size.ts) must need no airflow edits. Guard: `tests/airflow-adaptive-fit.test.js` (Roadster + scaled GLB stand-in, every airflow skin).

## The pre-pool triangle budget measures scenery, not the cars

`WORLD_TOUR_SOFTWARE_BASELINE` (`src/performance-evidence.ts`) was measured with the procedural Roadster.
Since ba867d53 the race car is the roadster2 GLB (6,688 triangles in the camera pass, more with its shadow),
and Tokyo, Coastal and Cosmic tipped over the +65% budget with no scenery change (quality-gate,
CI 44046135203). The car's shadow pass still counts as scenery, which errs on the strict side. The perf
overlay reports the cars' share (`drawnTriangles` in `src/perf.ts` over the player and every rival: visible
meshes on the camera's layers that survive frustum culling, draw range, visible material groups, instances), and
`scripts/verify-performance-evidence.mjs` gates `triangles − carTriangles`. The 2f904b5f motorsport rivals
(6,474 → 15,208 triangles on Alpine at Medium) tipped Alpine the same way. A heavier car model is judged on its
own (`docs/designs/3d-pipeline/`; rival bodies by the per-tier budgets in `tests/rival-motorsport-bodies.test.js`),
never by raising the scenery budget; scenery growth still fails at the old number. Guards:
`tests/performance-evidence-gate.test.js` (*excludes the drawn cars but still catches scenery growth*),
`tests/perf.test.js` (*drawn triangles*, *frustum-culls*), `tests/performance-evidence.test.js`.

## One NaN pixel is a black frame

The bloom blur spreads a single NaN/Inf texel in the HDR scene buffer into a screen-sized black
rectangle around the car (nitro and the airflow showcase shipped this way). The high pass in
`world.js` now zeroes non-finite texels so such a bug stays a one-pixel speck; never remove that guard,
and never let the NaN happen:

- Interpolated varyings leave their range: where MSAA covers a sliver triangle whose pixel centre lies
  outside it, `vUv` is extrapolated far past [0, 1]. A nozzle rim near the camera gave `t = 1 - vUv.y`
  of −13 and more, `exp(-t*7.)` overflowed to Inf and the zero `smoothstep` fade made 0 × Inf = NaN.
  Clamp every uv-derived scalar before `exp()` or `pow()` (`clamp(1.-vUv.y,0.,1.)`); `pow()` bases
  stay `max(0., …)`; a GLSL `max`/`clamp` does not sanitise a NaN that already exists.
- Lit meshes need unit normals and non-degenerate instance matrices (zero scale → NaN lighting); park
  unused instances below the scene instead of scaling them to 0.
- Guards: `tests/shader-safety.test.js` lints every scene `ShaderMaterial` (`pow()` bases guarded, each
  `exp()` argument a negated abs/dot/length/square or a `clamp()`ed scalar) and
  `tests/black-frame-browser.spec.js` scans the composed scene buffer and the bloom high-pass output for
  non-finite half-floats after every frame through airflow toggles, countdown, nitro and its fade-out.
  A new shader or effect keeps both green. Diagnose by wrapping `composer.render`, reading the targets
  back with `readRenderTargetPixels` (half-float NaN/Inf: `(h & 0x7c00) === 0x7c00`) and, on a bad
  frame, re-rendering the frozen scene into an MSAA clone one leaf object at a time to name the source.

## Perf-thermal checklist (render, scene, VFX, HUD, audio, frame loop)

Evidence and the reason for each rejection live in `docs/performance/<topic>.md`; read the named doc
before reopening a REJECTED item.

Render pipeline (`gpu-pipeline.md`):
- The lens pass (`src/lens-pass.ts`) stays the last composer pass: it tone-maps, encodes and draws to
  the screen with `needsSwap = false`. A pass after it restores `needsSwap` and an output step, and
  `PASS_NAMES` in `src/deep-perf.ts` follows the composer order. Guards: `tests/lens-pass.test.js`,
  `tests/gpu-pipeline-browser.spec.js`.
- Only the scene target is multisampled; post targets stay single-sample and the lens never writes
  `renderTarget1`. Shader warmup renders into `composer.readBuffer` (`tests/garage-skin-warmup.test.js`).
- An effect that is usually off is a prebuilt `#define` variant (as `LENS_FX 0`), never a uniform
  branch in a full-screen shader (slower with effects on). Build every variant up front and again on
  `webglcontextrestored`; drive values through `lens.uniforms`, which both variants share.
- Merge or fold passes only when the in-page old-vs-new comparison in
  `tests/gpu-pipeline-browser.spec.js` stays within its delta. The lens adds the bloom's half-resolution
  composite at each tap (`tBloom`), so the bloom never blends back into the 4x MSAA scene target and that
  target resolves once, colour only (`resolveDepthBuffer: false`; nothing samples scene depth). Folding
  the 5-mip composite itself into the lens stays rejected: 25 taps in the effects variant.
- Keep `powerPreference: 'high-performance'` (`src/webgl-renderer.ts`) unless a dual-GPU device
  shows a measured win with no visual change.

Scene and streaming (`scene-streaming.md`):
- Bake static same-material landmark meshes with `mergeStaticMeshes` (`src/world-tour-batching.ts`);
  its `canBatch` exclusions and `preserveRenderState` are the contract. Guard:
  `tests/world-tour-landmark-merge.test.js`.
- Never pool, merge or re-material meshes (colour-only variants under one base material included) or
  change `renderOrder` to save draw calls unless nothing it draws lies within ~9 m of another draw's
  surface. Three sorts opaque draws by `material.id`; moving a draw flips which surface wins a 24-bit
  depth tie, and the depth step grows with distance² (~1.2 m at 1.3 km, ~5.4 m at the 3,000 m far
  plane). A 0.25 m contact check still changed m-photo-tokyo by 11 (Wave 3 item 31 tint pool, reverted).
  Draw-call work must pass `scripts/final-report/visual-fidelity.mjs` (all 20 scenes, max delta ≤ 1).
- Repeated small props in a streamed chunk are one `InstancedMesh` whose bounding sphere covers the
  animated extent (Monsoon ferns, `tests/monsoon-ruins-scene.test.js`).
- Wrap every parked or streamed scene host in `skipHiddenMatrixWork` (`src/scene-matrix-culling.ts`)
  inside its own factory (`src/circuit-scene.ts`, `src/coast-visuals.ts`). Never freeze
  `matrixAutoUpdate` in visible chunks: animated children go stale for no measurable gain. Guards:
  `tests/scene-matrix-culling.test.js`, `tests/parked-host-matrix.test.js`.
- Course streaming keeps predecessor tails and releases chunks with hysteresis
  (`src/course-race-scene.ts`): no road vanishes behind the car, boundary jitter rebuilds nothing.
  Guard: `tests/course-race-scene.test.js`; probe `scripts/course-streaming-probe.mjs`.
- Objects that follow the car (weather, glows) copy the rendered player mesh after `updateCar`,
  recovery and the finish run-on, as `centerWeatherOn` (`src/weather-points.ts`) does; never
  re-derive the pose from lane and distance. Guard: `tests/weather-points.test.js`.
- Track switch, restart and return leave no scene resources behind
  (`tests/scene-resource-cycles.test.js`).

VFX buffers (`vfx-buffers.md`):
- Pooled particles, wakes and ribbons iterate and upload only their live span through
  `createLiveSpan` (`span.next`, `span.live`, `span.commit`) and `markRange`
  (`src/effects-particle-upload.js`); never call `addUpdateRange` directly, since three keeps
  appending ranges until the next upload. Guard: `tests/effects-particle-upload.test.js`.
- Three computes a transparent mesh's sort sphere once, at its first draw. A live-span buffer leaves
  dead slots at zero, so that sphere freezes near the origin and the mesh mis-sorts against the
  car's transparent parts. Give such a pooled mesh an explicit `renderOrder` (dash ribbon,
  `src/aero-wake-meshes.js`, fabd77dd) or a bounding sphere covering its full extent. Guard:
  `tests/aero-vfx.test.js`.
- Emit in place into fixed slots (`src/effects-particle-pool.js`), no spread or `Object.assign` per
  spark; reset clears spans and uploads zero alpha.
- Transparent pooled VFX shaders cull alpha ≤ 0 in the vertex stage (`src/effects-particle-shaders.js`,
  `src/aero-wake-meshes.js`).
- A hidden instanced mesh whose slots are all rewritten each frame skips its upload; a partly used one
  uploads only used instances (`src/pickup-aura.js`). Guard: `tests/vfx-instanced-uploads.test.js`.
- `worldPoint(s, x, y, origin, item, out)` writes into the caller's scratch array, and per-frame
  effects options stay hoisted in `src/world.js` and refreshed in place, never rebuilt with spread or
  new closures. Guard: `tests/world-point-out.test.js`.
- Keep particle motion and road/vehicle interaction on the CPU (a GPU port is not provably identical)
  and per-jet transparent materials separate (instancing them changes transparent depth sorting).
- Garage equipment shares one AeroVFX per scene and `setSkins` only rewrites existing materials
  (`tests/garage-skin-renderer.test.js`).
- Prove upload equivalence with `tests/helpers/gpu-upload-shadow.js` (three's own `WebGLAttributes`
  against a recording GL), not a re-implementation of three's rule.

HUD and DOM (`hud-compositing.md`):
- Per-tick HUD writes use `src/hud-dom.ts` (`setTextIfChanged`, `setHiddenIfChanged`,
  `setAttributeIfChanged`, `createAnimationGate`); add a sibling there, never a raw same-value setter.
  Keep the tick rate and current ARIA values. Guards: `tests/hud-compositing-browser.spec.js`,
  `tests/hud-dom-browser.spec.js`.
- Game state stays out of Vue `ref`/`reactive`; the race HUD is imperative.
- Write high-frequency CSS custom properties on the element that uses them, never on `<body>`.
- Pause infinite CSS loops while their element is at opacity 0 (`src/flight-fx-hud.ts`,
  `tests/flight-fx-hud.test.js`); off-screen animated art goes through `src/GarageArtworkImage.vue`.
  `will-change` only on transform animations that reduced motion / low VFX already disable.
- Don't quantize minimap or needle coordinates or merge glass layers for speed: equivalence cannot be
  shown, so both were rejected.

Audio and CPU simulation (`audio-cpu.md`):
- Continuous AudioParams go through `createParamMixer` (`src/audio-engine-mix.ts`); one-shots stay on
  `cue()`/`impulse()`, unthrottled; with SFX and music off nothing is written; a param set outside the
  mixer calls `mixer.forget`. Guard: `tests/cpu-audio-mix.test.js`.
- Call `sound.update` on every frame a race event can occur (cues are detected inside it), tied to
  simulation steps, not to draws.
- Look up course edges with `edgeOf` (`src/course-route-frame.ts`), never `graph.edges.find` per frame;
  never mutate a graph's `edges` after its first lookup. Guard: `tests/cpu-edge-lookup.test.js`.
- No spatial index, route cache or closure removal without a profile showing the cost matters.
- Simulation changes keep `tests/cpu-race-replay.test.js` and `tests/cpu-route-curvature.test.js`
  identical; re-record with `RECORD_REPLAY=1` only for an intended behaviour change.

Frame loop, screens and dialogs (`frame-lifecycle.md`):
- `src/main.js` keeps one rAF loop and gates only the draw: `drainSteps` (capped steps per callback),
  `sound.update`, the HUD tick and deep-perf run every callback. No second rAF, interval or
  per-component loop.
- Render on demand (`createRenderDemand`, `src/render-lifecycle.ts`) settles only the `paused` phase;
  every animating screen (Home, Garage, Coming Soon, countdown, flare, racing, results) draws every
  paced frame. Guards: `tests/render-lifecycle.test.js`, `tests/render-on-demand-browser.spec.js`.
- A dialog or screen stops scene drawing only when `coversViewport` finds it opaque and full-viewport;
  gradients and images count as see-through. Input only invalidates the budget and never reads styles;
  cover is recomputed on structural events only.
- Listeners and observers register once and are removed on dispose and on a real `pagehide`; bfcache
  `pageshow`, visibility, orientation and `webglcontextrestored` request a redraw.
- Auto FPS is `min(60, refresh)`; 30/60/90/120 stay manual and saved choices load unchanged. Adaptive
  resolution is opt-in, off by default, and never lowers a manual FPS or Quality. The pacer reads missed
  vsyncs and the GPU timer, never CPU submission time (`src/frame-pacing.ts`). Guards:
  `tests/frame-pacing.test.js`, `tests/phase3-high-refresh.test.js`, `tests/fps-browser.spec.js`.

→ Read `docs/rendering-performance.md` before touching renderer, scene, effect or shader code, or
adding a cache, instancing or any per-frame / per-row work.
