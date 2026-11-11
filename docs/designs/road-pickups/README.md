# Road Supplies — shared 3D models, guide, and Makefile gate

## Build and run

`make 3d=1`, `make build 3d=1`, `make dev-unlocked 3d=1`, `make phone y=1 3d=1` and
`make dev-feature pickup-3d-artwork-ui 3d=1` export **both** `DEV_3D=1` (existing
3D Roadster/Coast preview) and **`VITE_PICKUP_3D=1`** (these four pickups).

The Vite feature switch is **build-time**: a page already published from a
different build does not update by appending a URL query string. With `3d=0`
or no `3d` argument, the original octahedron GPU-instanced pickups remain.
GitHub Pages is unchanged until an explicitly authorized release from main.

## One source of truth

All four models and their PBR materials originate in `src/pickup-art.js`.
`src/effects.js` reads the feature flag from `src/pickup-3d-config.js` and
calls the same `createPickupGeometries()` / `createPickupMaterials()` functions
as `src/Pickup3DPreview.vue`. No separately illustrated SVG is displayed when
the 3D browser preview succeeds. The SVG illustrations in
`public/feature-assets/road-pickups/` are graceful fallbacks for disabled
WebGL or the intentional non-3D presentation.

| Tier | In-game model | Shared full-color material | Scene scale | Reward logic |
| --- | --- | --- | --- | --- |
| cell | Shielded capsule, luminous blue core, cap connectors and bolts | Cyan steel / glass | 0.82 | +0.25 NITRO |
| can | Orange pressure canister, metal collars, side meter and nozzle | Orange alloy | 0.94 | +0.5 NITRO |
| tank | Twin cylindrical gold tanks, titanium frame and gauge | Gold reinforced alloy | 1.08 | +1.0 NITRO |
| overcharge | Multicolored reactor, gyroscopic rings and orbit nodes | Prismatic reactor | 1.24 | Top up 3 NITRO |

These scale factors multiply the tier-specific authored geometry: width, height
and depth are inherently different without changing **any** pickup collection
volumes, rewards, paths, terrain, respawn timers or race balancing.

## Rendering/performance

- `createEffects` is already the shared runtime path for classic, World Tour,
  CourseGraph and future playable race tracks using the same scene. This feature
  does not add per-track placement logic.
- One merged BufferGeometry and one `MeshPhysicalMaterial` per tier; still just
  four pickup `InstancedMesh` draw calls, capped at 128 instances each.
- PBR metal / coated surfaces, modeled colored emitters, chamfered metal shells,
  stable distance-phased yaw/hover and uniform-only animated glow. Ground-level models
  receive a render-only vertical offset so their complete silhouette stays visible
  above asphalt despite bobbing; collision/rewards/respawn remain unchanged.
  Reduced-motion freezes spin, bob and glow.
- Four small live WebGL product previews use the *exact same* shared geometry, PBR material, scale, hover, rotation and pulsating energy-emission functions as the in-race pickups. They are created only when the **Rings &
  Supplies** guide tab is selected. The preview uses the *same model and material*
  definitions as the race, with a dedicated three-point studio lighting rig.
  IntersectionObserver stops off-screen rendering, the DPR caps at 1.5, and
  component unmount disposes its WebGL and GPU resources.
- Guide keeps responsive sizing, existing text and native language keys.

## Art review and how to see the real effect

The separately authored SVGs are only fallbacks for non-WebGL clients and for the
default `3d=0` look. A published site cannot pick up an unmerged feature branch
from a browser refresh: review `make dev-unlocked 3d=1` on this branch, or the
CI screenshot artifact **pickup-3d-visual-evidence** from the exact-head run.

In the guide, choose Controls → How to play → Rings & Supplies; the four
animated WebGL product stages are the same real-time models used in the road.
The `make build 3d=1` command creates a deployable build artifact locally,
but **does not deploy** it. Publication still requires the repository's normal
main/release approval and exact-head all-green CI.

## Verification checklist

- [x] Same mesh/PBR geometry code in race and guide for all four tiers
- [x] `3d=1` Makefile gate + legacy fallback, including phone and unlocked targets
- [x] Tier-specific scale and animated 3D presentation
- [x] Unit/visual smoke tests for build flag, model parity, animation, memory release
- [ ] Exact-HEAD typecheck, unit, both build variants, Playwright 3D smoke,
  full browser tests and World Tour CI all green
- [ ] Visual art direction approval from desktop and actual mobile device
- [ ] Performance measurements (p50/p95, draw calls, GPU allocations) by quality tier
- [ ] Authorized merge/release; do not claim the public site is updated until deployed

Commands for direct checkout verification:
```sh
node --test tests/pickup-art.test.js tests/pickup-3d-flag.test.js tests/effects.test.js tests/module-size.test.js
npm run typecheck && npm test && npm run build
VITE_PICKUP_3D=1 npm run build
npx playwright test tests/pickup-3d-browser.spec.js
make verify 3d=1
```

## Tiered collection VFX — gameplay effect parity

The shared `src/pickup-collect-vfx.js` module is created only with `VITE_PICKUP_3D=1`,
on the shared `createEffects` path for every track. Existing default-mode
debris and the existing NITRO HUD refill/pulse are preserved.

| Tier | Shockwaves | Peak GPU-instanced shards | Burst details |
| --- | ---: | ---: | --- |
| `cell` | 1 | 18 | Cyan electrical flash, small fragments |
| `can` | 2 | 24 | Orange plasma pulse and warm-energy scatter |
| `tank` | 2 | 30 | Golden crown flash, vertical energy beam |
| `overcharge` | 3 | 42 | Prism-color facets, rainbow orbital waves and rare-item beam |

The sequence is roughly 0–0.84 seconds: immediate emissive flash, spreading
3D shockwaves and orbiting shards, then controlled decay. Every variant uses a
single radial glow texture, three reusable geometries and **at most two active
effect slots per tier** (eight concurrently across four tiers). Matrices are
updated in pooled `InstancedMesh` buffers. Pipeline warmup gets one parked
shard instance per tier; no new shaders, lights, materials or geometry are
constructed by collection events.

`effects.js` uses the pickup's current `downUntil` token as the take
generation so respawning and collecting the same object can trigger a new
effect without duplicate per-frame bursts. It uses the existing
`rivalCues` to draw a quieter event for AI pickups only. The origin follows
`worldPoint` with original item metadata on branching CourseGraph tracks,
or the normal track-relative distance projection otherwise.

Medium reduces shards to 65% and rings to two; Low uses 26% and one
ring; reduced motion uses a restrained static flash/ring, no energy beam or
shard spray. The default (`3d=0`) keeps the lightweight legacy effect.

### Actual visual and performance verification

Opt-in CI runs `tests/pickup-3d-collection-browser.spec.js` with
`VITE_PICKUP_3D=1` and uploads screenshots as
`pickup-3d-visual-evidence`, in addition to existing guide/race WebGL shots.
The smoke test sets collected items in the browser's **test-only** race state,
then verifies that the actual scene renders tier-specific effects, including
a reduced-motion test. It does not ship any test hooks into the site.

The exact-head full regression includes all regular browser shards and World
Tour shards, which may run substantially longer than the focused VFX gate.
Performance p50/p95 on High/Medium/Low and physical-device art direction
approval require separate recorded measurements; do not claim them without
the actual evidence.


### CI acceptance gate

The branch must remain unmerged until the exact-commit [full-regression] run
has successful 3D browser smoke, both build variants, all 13 browser shards,
all 5 World Tour shards, cloud checks and the aggregate quality gate. These
checks are required even if the branch's normal focused gate is green.

The regression tests respect repository-specific CI time scaling
(`ciTimeout()`), permit Vue/TypeScript's non-null `motion!.matches`
syntax, and exclude the Three.js Sprite engine-owned shared quad from
resource-disposal expectations. The collection module still disposes all
resources it allocates, and no individual pickup allocates new GPU buffers.

## AI-authored 16-frame guide sprites (2026-11-11)

The in-game **Rings & Supplies** cards now use `src/PickupAnimatedPreview.vue`.
The new art is authored as 4 × 4 sprite sheets and converted into **16 frames,
85 ms each, looping animated WebP** (192 × 192 per frame). A matching single
WebP poster provides a still image for `prefers-reduced-motion`. These images
are specifically for the guide: track pickup models, GPU instancing and the
collection VFX remain fully 3D.

Expected game assets, **relative to `public/feature-assets/road-pickups/`**:

| Tier | Animated 16-frame art | Reduced-motion / first-frame fallback |
| --- | --- | --- |
| cell | `animated/cell.webp` | `animated/cell-poster.webp` |
| can | `animated/can.webp` | `animated/can-poster.webp` |
| tank | `animated/tank.webp` | `animated/tank-poster.webp` |
| overcharge | `animated/overcharge.webp` | `animated/overcharge-poster.webp` |

Each source has a separate 1254 × 1254 AI-generated 4 × 4 PNG image; split
by its 4 × 4 grid, remove low-alpha background noise, resize each frame to
192 × 192, and encode as looping animated WebP with 85 ms frame duration.

Asset integrity: each `*.webp` must contain exactly 16 frames; each
`*-poster.webp` must contain exactly one frame, with alpha transparency.
Do not replace these with CSS scaling of a single image or regenerate them
from the lower-detail SVGs. No additional JavaScript dependency is needed.

**If the WebP files have not yet been committed to this branch**, the guide
automatically falls back to the prior real-time WebGL model in `3d=1`,
and to the existing SVG in the lightweight build. Do not call the
new animated artwork fully shipped until all eight WebP files are actually
present on GitHub and their browser tests load them successfully.

WebP source archive:
`skyline-pickup-sprite-assets.zip` from the corresponding ChatGPT delivery.
Extract it at the repository root, preserving
`public/feature-assets/road-pickups/animated/`. After installing images,
run `npm run typecheck`, `npm test`, `VITE_PICKUP_3D=1 npx playwright
test tests/pickup-3d-browser.spec.js`, and the full exact-head CI.
