# Classic road / minimap and visual compatibility (Phase 4)

Read before touching track centrelines, route previews/markers, Coast scenery, render pacing or anything that changes track length, checkpoints or saved best-time/Ghost data.

## Phase 4 — Classic road/minimap and visual compatibility

For Coast, Neon Downtown, Canyon Skyway and Aurora Pass, the single unbounded
centreline is `classicRoadCenter` in `src/track-paths.ts`. Three.js geometry
must call that exact function, and route previews/markers must come from
`trackOverview` / `routeMarker`. Sky Spiral uses `skyPoint`/`skyFrame`
for 3D road positions, with only cached, decorative altitude annotations
allowed on its 2D route map. Never duplicate route equations or rebuild SVG
nodes per game frame.

Keep Phase 2 Coast scenery/palette unchanged unless a separately measured
regression justifies changes. All other track detail must be pooled/instanced,
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
