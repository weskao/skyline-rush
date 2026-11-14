# Neon Downtown look brief (Task 5b, recorded before any look change)

Target: the owner-supplied set in `concept-art/neon-downtown/` (2026-11-14; concept art, never in-game evidence).
Each row says how the running game reproduces a view for the spec v2 §8.1 side-by-side, and which of the seven
§8.1 items the view actually scores. Composites and scores live in the git-ignored `audits/`; this file only fixes
the capture recipe.

§8.1 items: **S** silhouette/proportions · **P** paint depth/reflections · **L** light signatures (front blade, rear
bar, thruster glow) · **R** road/ground material · **A** atmosphere (fog, haze, rain, sky) · **G** colour grade ·
**E** effects (plume, spray, sparks).

All eight scene frames are rain night. The sector frames are driving views; the two overviews set the layout only.

| # | View (file) | Camera | In-game recipe | Scores |
|---|---|---|---|---|
| 1 | Aerial overview (`01-aerial-overview.jpg`) | High oblique over the district | Not a race camera: checked against the route map and the placed landmarks | layout only |
| 2 | Overhead route (`02-overhead-route.jpg`) | Straight down | As 1; `09` completes the bridge exit and plaza return it crops | layout only |
| 3 | Start/finish boulevard (`03-start-finish-boulevard.jpg`) | Chase camera on the grid, looking up the straight | Neon, normal race (preset `track`), grounded on the start straight, before the first footbridge | R A G E |
| 4 | Rail underpass (`04-rail-underpass.jpg`) | Chase camera entering the right-hander | Same race, at the underpass mouth | R A G |
| 5 | Night market (`05-night-market-chicane.jpg`) | Chase camera in the first S-bend | Same race, first night-market bend | R A G |
| 6 | Elevated expressway (`06-elevated-expressway.jpg`) | Chase camera on the long right-hander | Same race, mid-curve | R A G E |
| 7 | Canal arch bridge (`07-canal-arch-bridge.jpg`) | Chase camera on the bridge approach | Same race, 150 m before the arch | R A G |
| 8 | Violet Plaza (`08-violet-plaza-return.jpg`) | Chase camera before the last corner | Same race, plaza sculpture on the left | R A G |

No frame shows the player car, so none sets a car target: the car is judged on Neon by the Coast brief's items
(**S P L E**) in frames 3 and 6. **E** on this track means rain and wheel spray.

## Which look each race preset shows

| Race preset | Neon look | Why |
|---|---|---|
| `track` (every mode but Free/Custom) | rain night | Neon is a rainy track today (`RAINY_TRACKS`, `src/board-effects.ts`) and every frame in the set is wet |
| `rain` | rain night | The player asked for rain |
| `night` | night | The same sky and grade without rain and with a dry road. No frame in the set shows it: judged for consistency with rain night, not against a view |
| `day`, `dusk`, `fog` | none: today's lighting | N2 gives Neon no day, dusk or fog look; an unlisted preset keeps RoomEnvironment (`src/track-look.ts`) |

Wetness follows the rain, never the look alone: rain night is wet, night is dry.

## Sectors, in driving order (clockwise, from `09`)

| Sector | Landmark and palette | Road |
|---|---|---|
| Neon Boulevard (start/finish) | Glass towers both sides, the pink-crowned spire ahead, two footbridges, cherry trees, pink and violet signs | Four-lane straight, start line, white dashed lanes |
| Rail underpass | Steel rail bridge and its concrete abutments, amber lamps, a train overhead | Right-hander under the bridge |
| Night market | Low tile-roofed shops with warm shopfronts and stacked signs | S-bends with red-white kerbs |
| Elevated expressway | Cyan guard rails on piers above the canal, a descending ramp | Fast long right-hander |
| Canal arch bridge | Cyan-lit steel arch, reflections on the canal and its banks | Straight approach and crossing |
| Violet Plaza | Crystal sculpture on a violet-lit plaza | Long straight, then the last right-hander back to the boulevard |

Shared across sectors: dark wet asphalt mirroring the signs, metal railings with cyan marker posts, pink-violet
first with cyan and amber accents, no lightning. Stormline Megacity keeps cyan rails, magenta glow and lightning.

Ignore in every view: sign lettering (never copied), the distant cars in 03 and 06 and the train's exact livery.

Capture: 1440×900 desktop on a real GPU and 390×844 phone, the Roadster (`?model=roadster`) and the procedural car,
each sector view on High and Ultra, Low recorded for fallback parity only. CI/SwiftShader frames are not look
evidence.
