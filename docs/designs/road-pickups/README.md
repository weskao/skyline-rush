# Road Supplies — shared 3D models, guide, and Makefile gate

## Build and run

`make 3d=1`, `make dev-unlocked 3d=1`, `make phone y=1 3d=1` and
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
  continuous distance-phased yaw/hover in scene; motion is frozen on reduced-motion.
- Four small live WebGL product previews are created only when the **Rings &
  Supplies** guide tab is selected. The preview uses the *same model and material*
  definitions as the race, with a dedicated three-point studio lighting rig.
  IntersectionObserver stops off-screen rendering, the DPR caps at 1.5, and
  component unmount disposes its WebGL and GPU resources.
- Guide keeps responsive sizing, existing text and native language keys.

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
