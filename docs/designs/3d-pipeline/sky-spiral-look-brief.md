# Sky Spiral look brief (Task 8c, recorded before any look change)

Target: the five frames in `track-profiles/spiral/` (concept art, mood only; never a geometry source or in-game
evidence). No concept-board panel exists for this track. Each row says how the running game reproduces a view for
the spec v2 §8.1 side-by-side, and which of the seven §8.1 items the view actually scores. Composites and scores
live in the git-ignored `audits/`; this file only fixes the capture recipe.

§8.1 items: **S** silhouette/proportions · **P** paint depth/reflections · **L** light signatures (front blade, rear
bar, thruster glow) · **R** road/ground material · **A** atmosphere (fog, haze, rain, sky) · **G** colour grade ·
**E** effects (plume, spray, sparks).

All five frames are a clear day above the clouds.

| # | View (file) | Camera | In-game recipe | Scores |
|---|---|---|---|---|
| 1 | Aerial overview (`01-aerial-overview.webp`) | High oblique over the tower | Not a race camera: checked against `06-route-plan.svg` and the placed tower, platforms and clouds | layout only |
| 2 | Tower approach (`02-tower-approach.webp`) | Chase camera, tower ahead, road bending left | Sky Spiral, normal race (preset `track`), grounded at about 1,650 m (200 m before the helix entry at 1,850 m) | R A G |
| 3 | Banked helix (`03-banked-tower-helix.webp`) | Chase camera on the bank, tower on the inside | Same race, mid-helix at about 2,550 m | R A G |
| 4 | Launch gap (`04-launch-gap.webp`) | Chase camera on the launch deck, car on the ground | Same race, on the first ramp at about 4,700 m (gap 4,720–4,785 m) | S P L R A G |
| 5 | Cloud slalom (`05-cloud-slalom.webp`) | Chase camera in an S-bend | Same race, the sweepers after the sprint at about 7,000 m | R A G |

Only frame 4 shows the player car; it is judged there and by the Coast brief's items (**S P L E**). **E** on this
track is the boost plume and the launch: no rain, no spray.

## Which look each race preset shows

| Race preset | Sky Spiral look | Why |
|---|---|---|
| `track` (every mode but Free/Custom) | day | Owner decision, 2026-11-19: day sky, as every frame in the set |
| `day` | day | The player asked for day |
| `dusk`, `night`, `rain`, `fog`, `aurora` | today's sky and lighting | No frame shows them; an unlisted preset keeps RoomEnvironment and the procedural backdrop (`src/track-look.ts`) |

On Medium and above the landmark kit and the KTX2 road set are drawn on every preset, as Coast's and Neon's are:
only the sky, the haze and the lighting follow the table. Low keeps the dark procedural scene on every preset.
The road is dry on every preset.

## Owner decisions (2026-11-19)

- Time of day: day sky.
- Cloud sea: cloud GLB models, not an engine plane and not a band painted on the dome.
- Route: frozen at the shipped 10 km (inside the 8–12 km art target).
- Draw-call cap: the shared home 540 / race 380.

## Shared content, in driving order

| Stretch | Landmark and palette | Road |
|---|---|---|
| Approach (0–1,850 m) | White panelled tower ahead with one vertical blue light strip; low station blocks with antennas | Sweepers, grey barriers with blue light bars |
| Helix (1,850–3,250 m) | The tower on the inside of the bank, support struts under the deck, cloud sea below | Banked full turn, rising 104 m |
| Launches (4,650–6,500 m) | Floating spire platforms, snow peaks above the clouds | Straight decks, white chevrons, yellow-black edge strips at each gap |
| Slalom (6,800–9,000 m) | Platforms and clouds on both sides, blue chevron signs | S-bends |

Shared across stretches: dark asphalt with a light sheen and white dashed lanes, white and grey structure, blue
as the only accent light, a cloud sea under the road. The magenta lights and the violet night sky belong to the
procedural scene Low keeps.

Ignore in every view: sign lettering, the exact count and shape of the peaks and platforms, the road's width and
bank angle (the shipped frame is the truth: `tests/sky-spiral-parity.test.js`), and the height of the tower against
the helix.

Capture: 1440×900 desktop on a real GPU and 390×844 phone, each view on High and Ultra, Low recorded for fallback
parity only. CI/SwiftShader frames are not look evidence.
