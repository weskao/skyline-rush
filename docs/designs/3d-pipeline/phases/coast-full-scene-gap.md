# Coast full-scene gap list (planning, 2026-11-09)

Part of [task-5-coast-pbr-road.md](task-5-coast-pbr-road.md) → "Full-scene upgrade". Planning only: no code yet.
The owner judged Coast **not yet at their standard**: every element of the map needs the realistic treatment.

Sources:
- Board: the five Coast panels of
  [../concept-art/skyline-rush-3d-target-concept-board.jpeg](../concept-art/skyline-rush-3d-target-concept-board.jpeg)
  (mood and look target, not geometry).
- Current game: the Ultra desktop captures in the ignored `../audits/task5/roadster-panels-fixed-desktop-ultra/`.
- Code inventory (read-only, at `ff4058fd`). Coast is the classic track `coast`, not the World Tour `coastal` route.

## What the board shows (Coast panels)

- No city. Green vegetated limestone cliffs on the land side, a natural sea arch and sea stacks offshore.
- A turquoise to deep-blue sea with visible waves, sun glitter, and white surf and foam where it meets the rocks.
- A real sky: cumulus clouds by day, an orange-violet sunset with the sun on the horizon, an overcast rain sky.
- Atmospheric depth: haze layers between the near cliffs and the far headlands.
- Grassy verge and shrubs between the guard rail and the cliffs.

## Gap per element

| Element | Today (file) | Board | Gap |
|---|---|---|---|
| Skyline buildings | 160 instanced unit boxes with no textures, plus 2,880 unlit window boxes, in a 2,200 m ring (`src/world.js` `city`, `src/skyline-scenery.ts`). Coast and Neon only. The same look in every preset and tier; Coast windows are LDR `#ffd394`, so they barely bloom. | **None**: no city in any Coast panel. | **D1 (decided 2026-11-13): remove the city from Coast.** Neon keeps its city. |
| Bridge towers | 3 suspension-bridge towers every 1,100 m, about 58 non-instanced meshes each (≈ 170 draw calls), flat steel colour plus cyan trim (`src/world.js` bridge tower block). Shown on every non-framed classic track. | Not in the board's Coast panels. | **D2 (decided 2026-11-13): remove the bridge towers from Coast.** The other classic tracks keep theirs. They were the largest draw-call item among the procedural props; the sea arch is Coast's landmark. |
| Sea | One 7,000 m plane with a custom shader: two sine products, two dark blues, an orange column at the sun's x (`src/classic-backdrop.ts`). The fog colour is fixed per track, not per preset. No sky or HDRI reflection. Foam is 110 flat translucent boxes. There is no shoreline; rocks just cut through the plane. | Turquoise near shore to deep blue; waves; sun glitter; white surf and foam at the rocks. | A full water material: normal-mapped waves, Fresnel reflection of the sky/HDRI, sun specular, depth colour, shoreline foam where rocks and cliffs meet the water. Its fog must follow each preset. |
| Sky | A procedural 2,500 m dome: gradient, a hard-coded sun-glow direction, value-noise cloud band, aurora (`src/classic-backdrop.ts`). Sun disc at a fixed position. The Poly Haven HDRIs (day/dusk/rain/fog, 1K) are used **only for lighting**: the visible sky never matches them, and the dome sun, sun disc and directional light are not aligned to the HDRI sun. | Cumulus by day, sunset with sun on the horizon, overcast rain. | Show a sky that matches each preset's lighting HDRI, at a higher resolution than the 1K lighting maps. Align the sun disc and the directional light with the HDRI sun. |
| Distant terrain | 30 instanced 7-sided cones at about 1,100–1,700 m with flat colour and no texture (`src/classic-backdrop.ts`); fog hides most of them. Nothing between the close GLB chunks (≤ ~840 m ahead on High) and the cones. | Green cliff headlands receding into haze; sea stacks. | Realistic far headlands and coastline (scan-based, matching the close cliffs), plus a mid band between the GLB chunks and the horizon. |
| Mid props | Road pillars (40), poles and lamps (48 + 24), all instanced primitives. | Plain grey highway lamps and rails. | Lower priority: check them in the parity review after the four elements above. |

## Constraints a replacement must keep (from the inventory)

1. Content stays inside the camera's 3,000 m far plane, or the far plane changes together with the showcase probe
   and the wet mirror, which copies it.
2. The far layer moves with the camera (camera-relative world; endless mode has a 500 m floating origin). Anything
   chunked is keyed by absolute distance or seed, like the close-scenery chunks and skyline slots.
3. Fog: a custom shader does its own fog or includes the fog chunks, and follows each preset's density
   (0.001 to 0.004).
4. Lighting HDRIs stay at PMREM 256, so no program changes mid-race. Assets load before GO. Low tier and load
   failure fall back to today's procedural objects.
5. `src/world.js` owns the renderer. New code goes in new modules: `world.js` is at its legacy line ceiling.
6. `scene.background` is assumed to be a Color in three places (`race-visuals.ts`, `world.js`, `wet-reflection.ts`).
   A dome mesh avoids changing that.
7. Opaque MeshBasic meshes join the wet-road mirror layer. Changing the window or sun materials must keep their
   reflections.
8. `tests/classic-backdrop.test.js` pins the current sky/sea/mountain structure and must change with the
   replacement. `tests/shader-safety.test.js` lints every new shader.
9. Budgets are recorded per asset in the model and material manifests, each with licence, provenance and
   fallback. There is no Coast draw-call cap yet: set one before adding far content.
10. Everything new is gated like the car, so `develop` keeps its current look until default-on is approved.

## Owner decisions (decided 2026-11-13)

- **D1 Skyline buildings on Coast: removed**, to match the board. Not rebuilt as realistic towers. Neon keeps its
  city.
- **D2 Bridge towers on Coast: removed.** Not rebuilt as a GLB. The other classic tracks keep theirs.
- **D3 Sky source: the existing Poly Haven HDRIs, shown at a higher resolution as the visible sky** on a dome mesh
  (constraint 6), with the sun disc and directional light aligned to the HDRI sun. No procedural or volumetric
  cloud sky. The lighting maps stay 1K / PMREM 256 (constraint 4).

D1 and D2 apply to the `?look=3d` look; without the gate Coast keeps the city and towers, as on `develop`
(constraint 10).

## Suggested order

1. Sky (D3), with the sun aligned. Everything else is judged against it.
2. Sea, with reflection of the new sky and shoreline foam.
3. Distant terrain and the mid band.
4. Remove the city and the bridge towers from Coast (D1, D2).
5. Concept-board parity review (spec v2 §8.1), phone p50/p95 (`make phone-diag` beats now carry them), owner sign-off.

Code inventory notes, read from code only and not verified at runtime:
- Coast tone exposure is written by both the HDRI look and the preset pass, so the last write wins.
- The sea's fog colour does not follow the presets.
