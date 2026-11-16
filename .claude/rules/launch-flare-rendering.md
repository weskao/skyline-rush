---
paths:
  - "src/garage-launch-flare.js"
  - "src/garage-launch-flare-shaders.js"
  - "tests/garage-launch-flare.test.js"
---

# Launch-flare layering: car depth, road plane, pool reach

- Every flare layer stays depth-tested (`depthTest: true`, `depthWrite: false`) so car bodies occlude it. Never disable the depth test or cut a footprint mask to lift the pool over the road: 277c5964 did, and the ripple drew over the car.
- A ground pool that looks covered by the next lane is not a draw-order problem. The two real causes, each with a guard in `tests/garage-launch-flare.test.js`:
  - **Lean.** The car banks and pitches about its wheels. The pool takes its orientation from the `ground` plane (the contact shadow `world.js` hands to `createAeroVFX`), never from the car body, or the side the car leans towards sinks under the road.
  - **Reach.** The quad must outreach the ripple (`POOL_SPREAD` >= 1.5) with the glow under one 8-bit step at its edge, and the shader rescales by the same constant. A smaller quad ends in a straight line beside the lane marking.
- `pool.renderOrder > 0` only orders the pool after shadows and transparent road markings; `renderOrder` cannot repair a failed depth test.
- Material flags prove nothing here. Check real WebGL frames: countdown, then GO while steering, on a flat start (Coast) and a sloped one (Alpine).
- Preserve the VFX Off / Reduced Motion / Low modes. Re-run `node --test tests/garage-launch-flare.test.js`, module-size, full unit and build after renderer changes.
