---
paths:
  - "src/pickup-vehicle-fit.js"
  - "src/pickup-collect-shaders.js"
  - "src/pickup-collect-vfx.js"
  - "tests/pickup-collect-vfx.test.js"
---

# Pickup body sweep: same read on every car and every paint

Trap (2026-11-14): the Stratosway R2 showed almost no body animation when it took a pickup, while
the Crimson GT turned gold or pink. Shapes, ranges and inflate were the same for both cars. Three
things only worked on a dark paint:

- **Additive blending on a light paint clips to white.** R2's default paint (`#e6e9e7`) plus gold
  stays white. The sweep is an alpha-blended tint (`NormalBlending`), never additive light.
- **The same tint has much less contrast on a light body.** A dark paint lets about 0.2 alpha change
  the colour a lot; on white the same alpha is a faint cream. `paintLight`
  (`src/pickup-vehicle-fit.js`) is the luminance of the carrying body's paint, read every frame, so
  Garage paints count too. On light paint the shader deepens the tint (cube) and lays it on thicker.
  Never key this to a car id or a paint name.
- **`body` is not the whole car.** R2's chase view is mostly its painted wing and merged rear trim.
  Every procedural mesh that shares the body's paint material gets its own `Pickup paint sweep`
  shell (one shared material and program). These shells are not `followsBody` riders: a dressed GLB
  hides them with their procedural part, and the rider moves to the GLB `body` (garage-model-rig.ts).
- Vehicle-frame mapping uses `vehicleInverse * modelMatrix` in the shader, so a single shared uniform
  serves every shell, whatever its parent's transform.

Guards: `tests/pickup-collect-vfx.test.js` (*tints every paint*, *covers every painted part*). A new
car or paint needs no edit here. Check one light and one dark paint in a real WebGL capture.
