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

The finite records use layout 6 (Coast and Canyon), 7 (Neon) or 5 (Aurora).
Endless and Event Lab use road layout 2 for Coast, Canyon and Aurora and road
layout 3 for Neon (`roadRecordLayout` in `src/record-layout.ts`). Historical
bests, history and Ghost keys stay readable, and only records for the active
layout are compared. Update the Firestore best-id allowlist with any new finite
layout keys.

Neon Downtown is a closed clockwise lap (layout 7, 2026-11-14): `buildLoop` in
`src/classic-road-routes.ts` turns a list of `[metres, turn in degrees]` legs
into a 10 000 m loop (4000 m until 2026-11-15) whose finish line is its start line. `point` wraps by lap and
`heading` adds a full turn per lap, so Endless and Elimination stream the same
lap again. A lap's `x` is not a function of `z`: anything that asks "how far is
this spot from the road" (skyline plots, the rain splash guard) uses
`road.offset(x, z)`, never `|x - centre(z)|`, and scenery turns to
`road.heading`. Tests: `tests/neon-loop.test.js`, `tests/neon-parity.test.js`.
Changing the legs is a layout change: bump `layoutVersion`, and bump Neon's road
layout too if Endless distances stop being comparable.

Sky Spiral uses `skyPoint`/`skyFrame` for the helix, sweepers and jump approaches.
The 2D map uses the same lateral coordinates and highlights the elevated exit.
Its sprint records use layout 5 and its Endless, Event Lab and Daily road
records use layout 2. The streaming road uses solid decks through the three
sprint jump sectors.

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
