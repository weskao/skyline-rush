# Coast look brief (Task 5, recorded before any look change)

Target: the five Coast panels of `concept-art/skyline-rush-3d-target-concept-board.jpeg` (concept art, mood only;
never a geometry source or in-game evidence). Each row says how the running game reproduces the panel for the
spec v2 §8.1 side-by-side, and which of the seven §8.1 items the panel actually scores. Composites and scores live in
the git-ignored `audits/`; this file only fixes the capture recipe.

§8.1 items: **S** silhouette/proportions · **P** paint depth/reflections · **L** light signatures (front blade, rear
bar, thruster glow) · **R** road/ground material · **A** atmosphere (fog, haze, rain, sky) · **G** colour grade ·
**E** effects (plume, spray, sparks).

| # | Panel (board position) | Camera | Time / weather | In-game recipe | Scores |
|---|---|---|---|---|---|
| 1 | Grounded (top-right, 1st) | Race chase camera, low, directly behind; horizon at ~⅓ height | Golden hour, sun low on the left over the sea; scattered cumulus | Coast, Free/Custom race, preset `dusk`, grounded at cruise speed, no NITRO | S P L R A G (E: none) |
| 2 | Thruster boost (top-right, 2nd) | Same chase camera, slight motion blur | Sunset, sun on the horizon behind the sea arch; road with a faint sheen | Coast, preset `dusk`, NITRO held on a straight | L R A G E (plume length/colour) |
| 3 | Flight (top-right, 3rd) | Chase camera raised; car above the road | Clear day, blue sky with cumulus | Coast, preset `day`, FLY held after a launch | S L A G E (thruster discs) |
| 4 | Coast day (middle row, 1st) | Race chase camera | Midday, clear | Coast, preset `day`, grounded | S P L R A G |
| 5 | Coast rain at sunset (middle row, 2nd) | Race chase camera | Sunset under rain; wet asphalt reflecting sun and lamps | Coast, preset `rain` (wet road + dusk HDRI), grounded | P L R A G E (spray, rain) |

Scene content the panels share (judged under R/A, never by moving road frames, lanes or collisions):
- Sea and shoreline on the left; a natural sea arch in the middle distance; vegetated cliffs on the right.
- Grey asphalt with white dashed lanes and yellow edge lines; metal W-beam guard rails on both sides.
- Palms in the foreground of panels 3 and 4; street lamps along the right in panel 5.

Capture: 1440×900 desktop on a real GPU and 390×844 phone, the Roadster (`?model=roadster`) and the procedural car,
each panel on High and Ultra, Low recorded for fallback parity only. CI/SwiftShader frames are not look evidence.
