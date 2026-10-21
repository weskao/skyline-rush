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
