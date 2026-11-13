# Classic road / minimap and visual compatibility (Phase 4)

Read before touching track centrelines, route previews/markers, Coast scenery, render pacing or anything that changes track length, checkpoints or saved best-time/Ghost data.

## Phase 4 — Classic road/minimap and visual compatibility

Coast, Neon Downtown, Canyon Skyway and Aurora Pass author separate corner
sequences in `src/classic-road-routes.ts`. The sequences share a metre-based
centreline and lateral frame with the road mesh, cars, traffic, rings,
shortcuts and both Coast scenery tiers. The home and finite-race maps use
`trackOverview` / `routeMarker`. The live Endless and Elimination maps sample a
rolling window of the same route. Keep the road ribbon, props and map
streaming bounded and reuse the SVG elements.

The finite records use layout 5 (Coast, Neon and Canyon) or 4 (Aurora).
Endless and Event Lab use layout 2 for these four roads. Historical bests,
history and Ghost keys stay readable, and only records for the active layout
are compared. Update the Firestore best-id allowlist with any new finite
layout keys.

Sky Spiral uses `skyPoint`/`skyFrame` for 3D road positions, with cached,
decorative altitude annotations on its 2D route map.

Preserve the Coast scenery kit and palette when adjusting its placement. All other track detail must be pooled/instanced,
bounded by Low/Medium/High quality, outside the road clearance, and hidden
when its track is not active. Never add Vue reactivity to the render loop.
Keep Phase 3 Auto/30/60/90/120 FPS render pacing separate from fixed 60 Hz physics,
measured browser rAF capability and saved visual Quality; high-refresh manual choices
remain selected even when browser refresh limits their effective draw rate. Auto
promotes only on sustained measured low render cost and must step down under pressure.
track/Ghost samples and deterministic replay state.

Any change to track length, centreline, shortcuts, gaps or checkpoint
topology needs a documented version key and saved best-times/Ghost migration
strategy **before** implementation. Otherwise preserve historical race data
bit-for-bit. Test all five tracks and road/camera boundaries across desktop,
phone portrait/landscape and both locales; check `?perf` p50/p95,
draw calls and triangles using the same conditions. Software WebGL and
simulators are not physical GPU or thermal benchmarks.
