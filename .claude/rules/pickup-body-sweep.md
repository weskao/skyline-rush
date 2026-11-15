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

## Energy can contact spark

The can uses the marker's fitted absorption point. Keep the flash and instanced spark
cluster at that point, and keep the old road burst, `afterburn`, contact decal and rear
streaks out of the can path. Road-anchored particles outlive the car passing the pickup at
speed. The can's old rear streaks now live on as the mini-boost start cue
(`mini-boost-streaks.md`), never as a pickup effect.

- **Embers fly in vehicle space.** During the absorb delay the embers start at the can's spot,
  captured once in the car group's local space (`canFrom`, after `updateWorldMatrix`), and
  reach `vehicleFit.absorbTarget` by about 0.15 s (`canEmbers` in
  `src/pickup-collect-motion.js`). A world-space path falls behind the car at speed.
- **Can colour is not crash colour.** The can is a warm white-yellow core with an orange rim only
  (`PICKUP_COLLECTION_STYLES.can`, `SECONDARY[1]`, the `glowTexture(CAN_RIM)` flash). The impact
  burst keeps the `effects-palette` orange; do not recolour it or the other tiers.
- **Other channels, player only, tier order cell < can < tank < overcharge** (`src/pickup-feedback.ts`):
  haptic pulse (`PICKUP_HAPTIC_MS`, touch + `visual.haptics` + not calm + racing), a camera kick share
  of the NITRO ignition (`PICKUP_KICK_SHARE`, see `race-camera.md`), and a fuel-bar flash with "+N"
  (`src/pickup-fuel-cue.ts`, no movement under Reduced Motion, "+N" right of the reading so it clears
  the phone label). Cells get no pulse or kick: reward lines put one every 12–25 m. `car.pickup` stays
  out of the legacy replay hash.

Guards: `tests/pickup-collect-vfx.test.js` (absorption timing, contracting cluster, independent
flashes when pickups overlap, ember flight at 90 m/s, can colour apart from the crash orange),
`tests/pickup-feedback-browser.spec.js` (pulse per tier, "+N" in view and clear of the label in
both phone orientations), `tests/race-camera.test.js` (pickup kick share and `KICK_LIMIT`).
