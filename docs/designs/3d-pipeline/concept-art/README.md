# 3D visual-fidelity concept art

Owner-supplied **target-look concept board** for the 3D pipeline
(`docs/superpowers/specs/3d-visual-fidelity-pipeline-design-v2.md`). Since spec v2 it is the
**acceptance target** for every visual phase: each phase reproduces its panels in the running game and passes the
parity review in spec v2 §8.1.

It is still concept art:
- It is **not** an in-game screenshot.
- It is not a dimensional input, because proportions come from the shared simulation contract. The Neon Downtown
  schematic is the one exception in kind: it fixes the order and direction of that route's sectors, never metres.
- It is not shipped in the bundle.
- It is never evidence for a WebGL, performance or CI gate.

Generator and redistribution licence are **not recorded yet**. The owner records both here before any public use
and before the Phase 6 car ships (spec v2 §5).

| File | Size | Use for |
| --- | --- | --- |
| `skyline-rush-3d-target-concept-board.jpeg` | 1672 × 941 | Look target: paint depth, light blade, quad thruster glow, wet-road reflections, per-map atmosphere |
| `neon-downtown/` (nine files, below) | 1672 × 941, schematic 1950 × 1095 | Neon Downtown look and route target (Task 5b, N1) |

### Neon Downtown set (`neon-downtown/`)

Owner-supplied on 2026-11-14; it replaces the two generated views used earlier that day. Eight rain-night scene
frames, numbered overview first and then in driving order, and one route schematic. The scene frames are JPEG
(quality 90) copies of the owner's PNG originals, which stay out of the repository. Generator and redistribution
licence are **not recorded yet**, as for the board.

| File | Shows |
| --- | --- |
| `01-aerial-overview.jpg` | The whole district from the air: where the boulevard, railway, night market, elevated road, canal and plaza sit |
| `02-overhead-route.jpg` | Straight-down view of the same district; it crops the arch-bridge exit and the plaza return |
| `03-start-finish-boulevard.jpg` | Neon Boulevard: four-lane straight, start line, two footbridges, the pink tower crown |
| `04-rail-underpass.jpg` | Right-hander under the railway, amber lighting, sightline out of the underpass |
| `05-night-market-chicane.jpg` | Night-market S-bends, warm shopfronts, red-white kerbs |
| `06-elevated-expressway.jpg` | Fast long curve on the elevated expressway, cyan guard rails, piers, a descending ramp |
| `07-canal-arch-bridge.jpg` | Bridge approach, steel arch, reflections on the canal banks |
| `08-violet-plaza-return.jpg` | Violet Plaza and its sculpture, the last corner, sightline back to the boulevard |
| `09-closed-loop-schematic.png` | The closed clockwise route and its six sectors, not to scale; completes what `02` crops |

## Panels → phases

| Panel | Spec v2 phase / task | What it judges |
| --- | --- | --- |
| Top-left 2 × 2 studio views (front 3/4, side, rear 3/4 with deployed wing, rear quad thrusters) | Phase 6 / [Task 7](../phases/task-7-concept-hero-car.md) concept hero car | The new car's silhouette, deep-red paint, light blade, rear light bar, wing and thruster glow in Preview Studio |
| Studio rear + Coast boost (glow colour only) | Phase 2c / [Task 4c](../phases/task-4c-garage-equipment-vfx.md) | Thruster glow and plume colour on the existing Roadster ports |
| Top-right three Coast shots (grounded, thruster boost, flight) | Phase 3 / [Task 5](../phases/task-5-coast-pbr-road.md) | Road PBR, wet reflections, thruster plume, flight glow, sea-cliff scenery |
| Middle row: Coast day, Coast rain at sunset | Phase 3 / [Task 5](../phases/task-5-coast-pbr-road.md) | Day versus rain/sunset lighting, wet asphalt, guard rails |
| Middle row: Dune, Monsoon · bottom row: Skyfall, Volcanic, Stormline, Frostbite | Phase 4 / [Task 6](../phases/task-6-new-tracks-showcase.md) | Per-map palette, weather, hero landmark, road surface and effects |
| Neon Downtown set (`neon-downtown/`, not on the board) | [Task 5b](../phases/task-5b-neon-downtown.md), capture recipe in `../neon-look-brief.md` | Rain-night sky and grade, wet road, and one landmark per sector: boulevard, rail underpass, night market, expressway, arch bridge, plaza. `09` also sets the route's order and direction |

Panel rules:
- The Roadster (roadster2) keeps the shape the owner approved, from `docs/designs/roadster2-reference/`. The studio
  panels describe the Phase 6 car, not a Roadster restyle.
- Never move VFX ports or collision to match this image.
- Ignore badge and logo marks (spec v2 §1, §5).

Capture authentic WebGL frames for any launch/cover asset; label this board as concept art wherever it is shown.
