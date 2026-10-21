# World Tour — Destination-Specific Scenery Redesign

This pass keeps all track IDs, saved progress, timing, AI, shortcuts, live minimap markers and Hyperdrive rewards unchanged while rebuilding the five World Tour art directions.

## What is implemented

| Track | Road identity | Deterministic roadside dressing | Tunnel architecture and comfort lighting | Map palette |
| --- | --- | --- | --- | --- |
| Taipei Heritage | Nonreflective urban asphalt, city dividing marks, civic sidewalks | Arcade storefronts, Taiwanese-style street shop façades, scooters, banyan trees, bus shelter, traffic lights, original Presidential Office / North Gate / temple landmarks | Low-contrast civic concrete galleries and warm side details; no ubiquitous rings | Warm stone / slate |
| Tokyo Afterdark | Grey metropolitan expressway with dense road signs | Narrow multi-storey shops, vending machines, rail viaducts, trains, signs and street lamps | Rectangular rail underpass, dim side strips, subdued occasional neon details | Slate lavender |
| Alpine Rail Pass | Mountain road, center / edge guide lines, stone shoulders, continuous cut-rock cliff ribbons | Spruce forest, jagged rock cuts, retaining walls, maintenance huts, railway ties / rails, rail signals | **Real dark rail-bore shell** over the roadway across tunnel and boost sections, with concrete / stone variants, sparse amber maintenance lamps and gradual ambient dimming | Forest stone / amber |
| Coastal Horizon | Rough coastal asphalt, parapet shoulders, open-curve lane guides | Palm trees, harbourside shelters, boardwalk piers, marine buoys, seawalls, scrub / plants, sculpted sea cliffs | Open breezy sea pergolas and railings instead of repetitive neon hoops | Ocean / sea glass |
| Cosmic Orbit | Deep navy orbital pavement, faint side markings | Habitat modules, satellites, solar panels, maintenance antennae, rocks and orbital debris | Angular station/airlock gateways with only **sparse** low-bloom blue edging | Steel / deep-space blue |

### Rendering/architecture

- **No scenery teleporting/replay:** `src/world-tour-scenery.js` creates one deterministic placement plan per absolute 120 m chunk. `src/world-tour-scene.js` owns bounded active chunks; existing chunk objects remain alive when crossing 12 m road-mesh sectors. New chunks spawn sufficiently far forward, older chunks leave behind the camera, and geometry is disposed when evicted. Roads still sample `trackPoint`/`trackFrame`.
- **Scenery beyond placeholder blocks:** 30 destination-specific procedural multipart props with windows, roofs, street utilities, vehicles, vegetation, rail structures and space hardware, each with size/angle placement variants. Repetition is at the authored asset level rather than an identical row of city cubes. Alpine and coastal natural terrain ribbons interpolate to the same 120 m endpoints (no visible terrain seams).
- **Tunnel variants:** `src/world-tour-tunnels.js` models five independent tunnel languages. Alpine creates real arch roof/wall surfaces over the active road in both normal rail bores and its Hyperdrive tunnel. Other courses use their own structures; the reused high-bloom rings are suppressed except selectively in Tokyo/Cosmic.
- **Comfort lighting:** in `src/world.js`, World Tour tone-mapping exposure is lowered, physical sunlight moved off the driving axis, global bloom sharply reduced, terrain/asphalt roughness raised; Alpine enters a smooth 38m side-lit dark-bore transition. Base game & Sky Spiral keep their existing lighting.
- **Five minimap skins:** route path and racer positions still share the one canonical main-road centreline and never expose secret shortcuts. Each World Tour ID gets a readable map palette and frame color through `src/style.css` and `data-theme`.

### Verification

- `npm test`: test road materials / light-exposure configs, authored per-track structures, rock tunnel, deterministic chunk plans, mountain/coastal terrain boundaries, same-object crossing of chunk boundaries and scene traversals.
- `npm run build`: production bundling safety and unlock guard.
- `npm run test:browser`: existing responsive, controls, minimap, start/finish scenarios.
- `npx playwright test --config=playwright.world-tour.config.js`: genuine Chrome/WebGL checks on five World Tour tracks before, within, and after their Hyperdrive tunnel, with screenshot artifacts.
- `make dev-unlocked`: localhost visual QA at real pixel density on both desktop and phone; confirm the player can see the distinct street, mountain, shoreline and orbital landmarks without center-road bloom.

### Limits

Landmarks and roadside objects remain original procedural low-poly assets, not highly detailed photogrammetric reproductions. Real architectural fidelity can improve further with rights-cleared, optimized GLB assets. Quality settings deliberately lower roadside prop counts; comfortable/reduced-motion settings take precedence over animation.

## Branch workflow

This project owner requested branch-only development. Work directly on `feature/world-tour-landmark-boost-polish`, Commit & Push, let the branch CI run, and **do not create a PR, merge to main or deploy** unless explicitly requested.
