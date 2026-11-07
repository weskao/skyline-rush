# 3D visual-fidelity concept art

Owner-supplied **target-look concept board** for the 3D pipeline
(`docs/superpowers/specs/3d-visual-fidelity-pipeline-design-v2.md`). Since spec v2 it is the
**acceptance target** for every visual phase: each phase reproduces its panels in the running game and passes the
parity review in spec v2 §8.1.

It is still concept art:
- It is **not** an in-game screenshot.
- It is not a dimensional input, because proportions come from the shared simulation contract.
- It is not shipped in the bundle.
- It is never evidence for a WebGL, performance or CI gate.

Generator and redistribution licence are **not recorded yet**. The owner records both here before any public use
and before the Phase 6 car ships (spec v2 §5).

| File | Size | Use for |
| --- | --- | --- |
| `skyline-rush-3d-target-concept-board.jpeg` | 1672 × 941 | Look target: paint depth, light blade, quad thruster glow, wet-road reflections, per-map atmosphere |

## Panels → phases

| Panel | Spec v2 phase / task | What it judges |
| --- | --- | --- |
| Top-left 2 × 2 studio views (front 3/4, side, rear 3/4 with deployed wing, rear quad thrusters) | Phase 6 / [Task 7](../phases/task-7-concept-hero-car.md) concept hero car | The new car's silhouette, deep-red paint, light blade, rear light bar, wing and thruster glow in Preview Studio |
| Studio rear + Coast boost (glow colour only) | Phase 2c / [Task 4c](../phases/task-4c-garage-equipment-vfx.md) | Thruster glow and plume colour on the existing Roadster ports |
| Top-right three Coast shots (grounded, thruster boost, flight) | Phase 3 / [Task 5](../phases/task-5-coast-pbr-road.md) | Road PBR, wet reflections, thruster plume, flight glow, sea-cliff scenery |
| Middle row: Coast day, Coast rain at sunset | Phase 3 / [Task 5](../phases/task-5-coast-pbr-road.md) | Day versus rain/sunset lighting, wet asphalt, guard rails |
| Middle row: Dune, Monsoon · bottom row: Skyfall, Volcanic, Stormline, Frostbite | Phase 4 / [Task 6](../phases/task-6-new-tracks-showcase.md) | Per-map palette, weather, hero landmark, road surface and effects |

Panel rules:
- The Roadster (roadster2) keeps the shape the owner approved, from `docs/designs/roadster2-reference/`. The studio
  panels describe the Phase 6 car, not a Roadster restyle.
- Never move VFX ports or collision to match this image.
- Ignore badge and logo marks (spec v2 §1, §5).

Capture authentic WebGL frames for any launch/cover asset; label this board as concept art wherever it is shown.
