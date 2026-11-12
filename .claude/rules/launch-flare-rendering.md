---
paths:
  - "src/garage-launch-flare.js"
  - "src/garage-launch-flare-shaders.js"
  - "tests/garage-launch-flare.test.js"
---

# Launch-flare depth and road occlusion

- The car-mounted additive pool, rays, rings and sparks are a cosmetic overlay: keep `depthTest: false`, `depthWrite: false` and a positive `renderOrder` so opaque/banked road surfaces cannot clip the burst.
- `depthWrite: false` alone does **not** disable depth rejection; changing `renderOrder` alone cannot repair a failed depth test.
- Keep the car-body glow depth-tested (`depthTest: true`): it follows the actual car geometry and must not shine through it.
- Preserve the VFX Off/Reduced Motion/Low modes. Re-run `node --test tests/garage-launch-flare.test.js`, module-size, full unit/build and real WebGL views after renderer changes.
