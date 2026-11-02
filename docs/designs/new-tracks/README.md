# New Track Expansion — Visual Direction Reference Index (2026-11-02)

## Status and rights
This directory contains **five ORIGINAL, hand-authored SVG route schematics**, committed on the `feature/epic-multiroute-longform-tracks-planning` branch and linked below. They are not photorealistic gameplay screenshots, and cannot establish an exact 3D road layout. The earlier two AI-generated scene collages in the ChatGPT conversation **were not uploaded into GitHub** by this operation; a separate ZIP of the original artwork and ten per-track crops is provided to the user in that chat. Do not point to nonexistent GitHub PNGs or claim the ZIP is in this branch.

## Curated route schematics

| Course | Route diagram |
| --- | --- |
| 沙暴裂谷 / Dune Tempest | [dune-tempest.svg](route-schematics/dune-tempest.svg) |
| 雨林失落神殿 / Monsoon Ruins | [monsoon-ruins.svg](route-schematics/monsoon-ruins.svg) |
| 浮空群島 / Skyfall Archipelago | [skyfall-archipelago.svg](route-schematics/skyfall-archipelago.svg) |
| 熔火天脊 / Volcanic Crown | [volcanic-crown.svg](route-schematics/volcanic-crown.svg) |
| 霓虹暴雨都市 / Stormline Megacity | [stormline-megacity.svg](route-schematics/stormline-megacity.svg) |

## Topology decision pending

- **CURRENT SPEC:** All five are **point-to-point / single finish** with visibly separate START and FINISH; all five complete on their first valid finish crossing. A path may zigzag, turn through multiple hairpins, cross above itself, or offer a branch without being a closed circuit.
- **OPTION UNDER CONSIDERATION ONLY:** preserve Dune, Monsoon and Skyfall as scenic point-to-point; optionally design true circuit variants of Volcanic Crown and Stormline Megacity (new loop layouts, not the current 14–15 km point-to-point route repeated).
- Existing `harbor-circuit` already supports lap modes. If adopted, size the new circuit lap around 4–5 km with 3 laps as the **initial** 3–5 min race-length hypothesis (subject to measured pace). Offer 1/3/5 lap selections as appropriate to existing modes, with different record/ghost and reward keys per lap count.
- **Not authorized:** converting the five maps into loops, modifying runtime code, merging to develop or deploying. Ask for a topology decision before implementation.

## Visual parity / acceptance gates

1. Original AI-generated scene art informs palette, biome, weather mood, identifiable landmarks, sense of elevation and ground/flight reveal. Do not interpret the illustrative loop-looking minimaps in those images as route authority.
2. Our SVG schematic is a **non-scale graph direction reference**: white main course, cyan alternative aerial/branch path, green START, red FINISH. The implementation graph and actual recorded gameplay are the route authority.
3. For each new map capture 2 true WebGL perspectives (normal ground driving + one elevated flight/branch) at 1440×900 desktop and 390×844 mobile. Compare to inspiration art side by side for contrast, scene depth, vehicle scale, weather visibility, landform identity and safe waypoint readability; document PASS/FAIL/APPROVED DEVIATION.
4. Required geometry outcomes: ≥2 nontrivial hairpins, ≥3 viable forks/choices, one substantial aerial-ground split, natural nonpainted surfaces where relevant, broad offroad travel, recoverable boundaries, fair checkpoint-gated finish and 8-car AI route choice. One screenshot cannot prove motion, collisions or route validity.
5. Test/record Low/Medium/High, Reduced Motion, rain/dust/ash, lighting, route signs and performance p50/p95. Real racing screenshot/video + source 3× art assets (only when later deployed) are distinct evidence from concept art.
6. Once the two original collage PNGs and ten cropped per-track PNGs are added to this branch, commit to `docs/designs/new-tracks/concept-art/` with a hash/manifest and add their real paths to this index. **Until then these are planned paths, NOT linked asset references.**
