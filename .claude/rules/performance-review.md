---
paths:
  - "src/**/*.js"
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

Measure CPU and GPU: frame time median/p95, draw calls, triangles, GPU memory, stalls,
allocations, across 5–8 km continuous driving on High/Medium/Low. Report before/after numbers;
no unmeasured FPS claims.

Tests: unit + browser regression for performance-sensitive code and scene correctness after
batching/culling; real WebGL screenshots on all affected courses incl. pause/restart, track
switch, WebGL recovery, low-power devices, narrow phone/landscape. Final report names untested
devices and remaining uncertainty.

## Shaders compile at first draw — never mid-race

WebKit (iPhone Safari/Chrome) builds shaders and Metal pipelines the first time a material is
drawn; a first draw mid-race stalls the frame and flashes black patches. `warmupShaders`
(`src/shader-warmup.js`) draws the whole scene graph once, hidden objects included, on the first
frame and on every track change, so no per-module warmup flag is needed. Keep it complete:

- Every material a race can show is attached to some object in the scene before racing starts;
  hidden is fine. Pooled meshes carry every variant (`effects.js` rings/pickups cycle through all
  tiers), and streamed content has a hidden sample (`shaderRack` in `world-tour-scene.js`: every
  prop kind batched and plain, the terrain ribbon, all tunnel shells and entrances per track). A
  material only used after a swap (`mesh.material = …`) must still sit on a pooled mesh at load.
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
