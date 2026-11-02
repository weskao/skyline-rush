# Skyline Rush — Five Point-to-Point Expansion Tracks: Concept Art & Routes

**Planning branch:** `feature/epic-multiroute-longform-tracks-planning`  
**Decision (2026-11-02):** **All five NEW tracks are POINT-TO-POINT, with one START and one separate FINISH.** No lap counting or loop-race variant on these five; existing ten sprint tracks retain the same single-finish mental model. Harbor Circuit remains a distinct mode.

## GitHub-saved image references

Each of the five **two-view storyboard SVGs** below is physically committed in this branch; each illustrates a ground driving camera and a separate aerial/branch camera plus explicit green START and red FINISH. The companion SVG is a deliberately simplified technical route sketch, not a copy of a looping minimap.

| Track | Two-view concept image | Ground/air route diagram |
| --- | --- | --- |
| **沙暴裂谷 / Dune Tempest** | [Scene design board](concept-art/dune-tempest-point-to-point-storyboard.svg) | [Single-finish route](route-schematics/dune-tempest.svg) |
| **雨林失落神殿 / Monsoon Ruins** | [Scene design board](concept-art/monsoon-ruins-point-to-point-storyboard.svg) | [Single-finish route](route-schematics/monsoon-ruins.svg) |
| **浮空群島 / Skyfall Archipelago** | [Scene design board](concept-art/skyfall-archipelago-point-to-point-storyboard.svg) | [Single-finish route](route-schematics/skyfall-archipelago.svg) |
| **熔火天脊 / Volcanic Crown** | [Scene design board](concept-art/volcanic-crown-point-to-point-storyboard.svg) | [Single-finish route](route-schematics/volcanic-crown.svg) |
| **霓虹暴雨都市 / Stormline Megacity** | [Scene design board](concept-art/stormline-megacity-point-to-point-storyboard.svg) | [Single-finish route](route-schematics/stormline-megacity.svg) |

- [Per-track composition, landmarks, weather, camera and acceptance criteria](visual-fidelity.md)
- [Machine-readable art and topology reference manifest](concept-manifest.json)
- [Original 12 PNG reference file names, sizes and SHA-256 checksums (pending GitHub import)](png-source-import-manifest.md)

## Original high-detail AI PNG artwork — provenance / status

Two AI-generated collage originals and **ten cropped scene views (two per track)** are included in the chat-delivered `skyline-rush-five-tracks-concept-reference-pack.zip`. **Those original PNG bytes have NOT been uploaded to GitHub by this session.** The five boards above **are genuine GitHub files**, but they are separate newly authored vector references, **not copies of those previous AI PNGs**.

When the PNGs can be uploaded, use these target paths and verify actual GitHub file existence before changing any status:
- `source-concept-png/overview-01.png` and `source-concept-png/overview-02.png`.
- `source-concept-png/<track-id>/concept-view-01.png` (ground) and `concept-view-02.png` (flight), for each of the five track IDs.
- Commit a SHA-256 manifest and link actual files here. Until then, do not pretend those paths exist.

## Binding design rules for next stage

1. These five are **one-way long-form sprints**: a car reaches ordered checkpoint volumes, then distinct FINISH once; never simply repeat an entire course or show a lap indicator. Start and finish must not coincide physically.
2. The route may make U-turns, cross itself at different heights, allow broad offroad driving, fork into air and ground alternatives, and converge; that does **not** make it a closed circuit.
3. Show START / FINISH clearly on map thumbnails and track selection. Show a ground/flight split in 3D without obscuring the road; leave undiscovered secret shortcuts hidden on the in-game minimap.
4. **Reference fidelity:** visual goal is biome identity, scene scale, skyline silhouette, time-of-day/lighting, roadside detail, weather, car visual prominence and branch readability; never treat an image-generated loop-looking map as exact geometry.
5. Before claiming any scene finished, record actual WebGL screenshots for both reference views at desktop/mobile, Low/Medium/High and reduced-motion, compare to this design board and original PNGs if available, and record pass/fail/deviations. Benchmarks and manual device testing are separate gates.
6. Any new AI-generated **in-game raster asset** needs a genuine 3× source file. Reference SVGs are scalable vectors and not gameplay textures.
7. The future implementation uses SDD→BDD→TDD and must pass the existing full verification gate without changing legacy tracks. **This planning branch has no game implementation and no merge.**

## UI terminology

- Standard race: `單程競速 / Point-to-Point`, display `起點 → 終點`, progress and finish-distance (NOT `Lap 1/3`).
- Separate optional existing circuit mode: `環道競速 / Circuit`, only here show a 1/3/5-lap selector and lap counter.
- Do not place these two gameplay concepts in an unlabeled mixed track-selection list.
