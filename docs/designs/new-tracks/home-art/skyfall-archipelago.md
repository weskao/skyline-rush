# Skyfall Archipelago — animated Three.js home-scene handoff

**Track ID:** `skyfall-archipelago` (COMING SOON; not registered as a playable race)  
**Owning feature branch:** `feature/epic-home-art-skyfall-archipelago`  
**Scope:** Stage 1 animated *showroom environment*, not the full point-to-point track. The shared camera, vehicle, hovering jets, renderer and home-selection integration belong to GPT 6 on `feature/epic-multiroute-longform-tracks`.

## Real committed visual references

- Ground composition: `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-01.jpg` — bright blue sky, white rolling cloud horizon, left-side waterfalls and island clusters, stone ring, sweeping bridge, rear three-quarter flying vehicle.
- Elevated/alternate composition: `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-02.jpg` — ring in the mid-distance, distinct upper cyan flight line and lower main route among layered islands.
- Topology-only reference: `docs/designs/new-tracks/route-schematics/skyfall-archipelago.svg` — single START and FINISH, split/merge, ground fallback; not a pixel-accurate map.
- Source storyboard: `docs/designs/new-tracks/concept-art/skyfall-archipelago-point-to-point-storyboard.svg`.

These JPEGs were **not** used as full-screen meshes, sky textures, or rendered screenshots.

## Scene interface and deterministic coordinates

`src/upcoming-scenes/skyfall-archipelago.ts` exports
`createUpcomingEnvironment(scene: THREE.Scene): { group, update(timeSeconds, quality, reducedMotion), dispose() }`.
Its group is parented to the caller-supplied scene. No renderer, camera, player/rival car, gameplay physics, RAF loop, DOM, storage or separate scene is created.

- **Shared car anchor:** origin `(0, 0, 0)`, forward `-Z`, `+Y` up. Main *real* ribbon geometry spans Z `+45 … -180`, with road surface at approximately Y `0`.
- **Three foreground islands:** near `(0,-1.4,13)`, middle `(2,-1.3,-92)`, far `(5,-1.1,-170)` with irregular tapering undersides.
- **Four additional higher/deeper islands:** offset at `(-79,20,-72)`, `(86,18,-145)`, `(-128,32,-226)`, `(142,12,-275)` to build aerial depth and distinct silhouettes.
- **Main path:** continuous wide pale-stone road crossing two gaps. Underslung curved *physical stone arch* supports and short parapet blocks mark bridge spans; this is not race-ready collision geometry.
- **Flight shortcut:** separate narrow, elevated stone ribbon, rising roughly 25 m from the lower route before descending to reconnect in the rear; thin cyan guide line differentiates this visually from the lower stone bridge. There is no gameplay checkpoint/physics handoff yet.
- **Stone portals:** large rock torus at `(-39,33,-111)`, smaller distant ring at `(87,48,-216)`. Floating boulders add silhouette depth, spaced away from the central vehicle anchor.
- **Waterfalls:** three semitransparent vertical curtains with genuinely time-updated point sprites beneath the island edges. Water geometry remains anchored to its source island.
- **Cloud ocean:** 112 near + 76 distant, differently sized low-poly volumetric-looking spheroids, **instanced**, below road elevation. Sky is a large enclosing 3D gradient-colored mesh, not a photograph.
- **Vegetation:** two shared 80-instance pools (tree trunks and canopies); deterministic placement leaves a clear corridor around the local road.

## Motion, GPU budget and cleanup

- Cloud layers slowly drift as entire static-instanced batches (no per-frame instance-matrix updates). Waterfall point-buffer updates and a sparse 72-point ambient mote layer are time-derived and deterministic, with no resource recreation on a frame.
- `low`: keep near cloud ocean and waterfall, hide distant cloud batch and light motes. `medium`/`high`: show far cloud layer and motes. The visual difference is intentionally conservative to preserve distant island, bridge and road visibility.
- `reducedMotion=true`: cloud drift and waterfall flow freeze at their zero-time pose; motes are hidden. No camera shake, flashing, large postprocessing pass, texture atlas, dynamic lights or shader compile changes are introduced.
- All meshes/geometries/materials are allocated once per scene creation and cleaned up on `dispose()`, including shared per-scene geometry/material instances and instancing attributes. Calling `dispose()` twice is safe; `update()` afterward is ignored.
- **Approximate authored budget (not GPU measurements):** 7 islands, 2 main route ribbons, 2 bridge arch tubes, 2 landmark rings, 188 instanced cloud spheres, up to 80 tree pairs, 32 floating rocks, 108 waterfall points and 72 motes. No performance, draw-call, FPS or memory acceptance claim without actual WebGL measurement.

## TDD and verification scope

Focused regression file: `tests/upcoming-skyfall-archipelago-scene.test.js` covers ownership, actual geometry, landmark count, ground/flight height separation, time-based cloud/water motion, waterfall spatial anchoring, quality budgets, Reduced Motion determinism and complete idempotent disposal.

**Gate evidence status:**
- Test-first RED intent recorded in `test(skyfall): define real-time archipelago scene contracts (RED)`; additional waterfall-position regression written before the corrective code.
- Local `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify`: **not claimed passing** unless individually observed against this exact commit.
- Exact-HEAD remote CI quality-gate: **PENDING** until run is inspected.
- Desktop 1440×900, mobile 390×844, ground/aerial camera captures, two motion-separated WebGL frames, p50/p95 FPS and draw calls: **PENDING**. An art JPEG is not screenshot evidence.
- The restricted three-file art-worker ownership prevents updating `TODO.md` or the shared UI/renderer. GPT 6 should record integration evidence and remaining acceptance in the shared branch.

## Known concept-art differences and approval gaps

1. **Stylization:** reference images have highly detailed painterly cliffs, lush plants, fog shafts and elaborate glowing sky rings; this scene uses deliberately low-polygon rock shells, instanced conical trees and simple torus masonry. Silhouette/lighting matching needs real screenshot review.
2. **Camera / shared car:** no vehicle, jet exhaust or 50° camera is added here by design. The reference's apparent flying car and cinematic framing cannot be matched until GPT 6 attaches the existing shared assets.
3. **Bridge / air line:** a coherent raised stone shortcut and continuous lower bridge exist, but the reference shows more winding, multi-layer dramatic viaducts, bright airborne rails and more distant ring structures.
4. **Clouds / waterfall detail:** true 3D instanced clouds and animated water point sprites replace still imagery; detailed mist scattering, natural foam and volumetric sunlight are not simulated.
5. **Race functionality:** no actual landing collision, checkpoints, multi-route pathfinding or full 13–16 km course. The entry remains **COMING SOON** and must not enter any playable `RACE_TRACKS` or `RaceFactory` registry.

**Visual result: PENDING comparison and approval.** No mock screenshot or undocumented similarity score is presented as a running WebGL capture.
