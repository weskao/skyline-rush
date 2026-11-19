---
paths:
  - "src/car-model.js"
  - "src/car-reflections.ts"
  - "src/coast-lighting.ts"
  - "src/coast-look.ts"
  - "src/garage-model-rig.ts"
  - "src/garage-model.ts"
  - "src/upcoming-lighting.ts"
  - "src/world.js"
---

# Vehicle and track lighting

- Compare the same WebGL camera and vehicle pose while isolating the direct light, environment map and bloom. Check the roof and glass on the road, during climb and while banked. Sharp GGX highlights can bloom even with a blurred environment map.
- Apply the shared outdoor roughness response in `src/car-reflections.ts` to player, rival and traffic materials. Include procedural fallbacks and GLB instances. Give each GLB instance its own materials before adjusting the finish. Use the same outdoor response when the player changes paint.
- Keep the track's light direction, scenery exposure and luminous cues readable. At Coast dusk, keep the broad wet-road and horizon highlights below the bloom threshold where they cross the driving sightline.
- Compare day, dusk, rain and night as applicable. Check both selectable car models and the graphics fallback. The guards are `tests/car-reflections.test.js`, `tests/garage-model.test.js` and `tests/coast-look.test.js`.
