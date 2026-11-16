# Neon Downtown night sky (Task 5b step 3, asset half)

Two environments for the Neon `?look=3d` look (owner decisions N1, N2): `night` (dry) and `rain` (rain night, same
city, wetter and hazier). Day, dusk and fog keep today's lighting; nothing is built for them.

## Source and licence

One CC0 Poly Haven HDRI, `shanghai_bund` ("Shanghai Bund", Greg Zaal, https://polyhaven.com/a/shanghai_bund):
a dark, partly cloudy night sky over a lit skyline with pink, violet and cyan LED towers, the city glow along the
horizon, no sun and no lightning. The licence record (title, authors, page and file URLs, CC0-1.0, bytes and sha256
of each download) is `sources.json`, written by `fetch.py`.

No Poly Haven rain-night city HDRI fits (the wet ones are lit plazas, not a skyline), so `rain` is a scripted grade
of the same source (`RAIN_GRADE` in `build.py`), never a hand edit.

## Rebuild

```sh
python3 -I assets-src/neon-sky/fetch.py      # 1k/4k/8k into $HOME/.cache/skyline-rush/polyhaven/shanghai_bund/
"$BLENDER_BIN" --background --factory-startup --python assets-src/neon-sky/build.py [-- <png-dir>] [--no-encode]
```

`build.py` checks every download against `sources.json`, writes the shipped files and `manifest.json`, reads and
writes Radiance HDR through `hdr_io.py`, and reuses Coast's dome encoder (`assets-src/coast-sky/build.py`) bit for bit. Needs `toktx` on `PATH`. About 18 minutes, mostly
the 8K UASTC encodes; peak memory about 2 GB.

Processing, all in direction space so 1k, 4K and 8K agree:

- **Sign soften (both domes).** The far LED towers carry vertical text and the near embankment buildings carry facade
  and rooftop signs that read at 4K and 8K. `SOFTEN` blurs (Gaussian, sigma 0.25 degrees) only the LED facades from
  the horizon to 22 degrees (fading out by 26): texels with chroma (max - min) / max above 0.6 and a channel above
  3.0, grown by a 1.5-degree box; plus one box at lon -166..-156, el 35..41 (the rooftop sign). Ordinary towers,
  windows and the sky keep the download's edges. Blurring the whole band (the first version) halved the skyline's
  log-luminance gradient, 0.565/0.688 to 0.265/0.253 per degree (x/y): the far skyline read soft at High. Now
  `sky.sharpness` is 0.447/0.545 against `sky.sourceSharpness` 0.574/0.698 (night). The 1k maps are not softened.
- **Wedge fill (domes and 1k maps).** The near floodlit embankment buildings and trees fill lon -180..-68 and
  +114..180 up to about 43 degrees at about 8x the rest of the sky (`sky.sourceBandByLon`), and the harbour drives
  straight at them. `FILL` replaces lon 114..292 (wrapping) below 50 degrees, fading out by 62, with a far shore:
  below 3..8 degrees whole columns of the generic far skyline shifted (never resampled) from lon -18..17 and 71..108,
  alternating in five pieces; then the city's horizon haze (per row of lon -65..114: the median on the domes, the sky
  between the towers; the mean on the 1k maps, which carries the towers' light, so the dry harbour road is lit by a
  city: its wedge at el 3..8 went from 0.40 to 1.21 against 1.48 on the real skyline) up to 15..25 degrees; then the
  pieces' clouds. The source holds about 72 degrees of generic skyline for 178 of wedge: the first version's
  full-height copy put the pink LED tower, the pink sign and the gold crown twice in one view, with glow halos at the
  seams. The low shore repeats only lamps. Feathers are 1 degree at the shore and 8 in the sky. `sky.bandByLon` (mean
  luminance per 30-degree bin, el 0..45) is measured on the shipped dome and every bin stays within 3x the median.
- **Piece levelling.** The two source spans' clouds differ 30 to 40% in luminance, so every piece boundary showed a
  brightness step (1.11 to 1.31 on the 4K night dome, el 27..50). `FILL.level` scales each piece's clouds to the sky
  beside the wedge: a ramp between the mean luminance of the 16 degrees either side, over the piece's own luminance
  low-passed 5 x 2 degrees, within 2x. `sky.fillSteps` records the jump across each boundary of the shipped 4K dome
  (now at most 1.03; the natural sky's median for the same measure is 1.09 to 1.19).
- **Violet storm tint (concept frame 07).** `TINT` moves texels toward linear RGB (0.8, 0.47, 1.0) at their own
  luminance, so the irradiance, bands, sharpness, horizon and `gain` stay the download's. On the domes the night sky
  at or below radiance 1.0 takes a 0.5 share (none above 3.0: lamps, LED facades and the lit skyline keep their
  colour) and the rain veil's colour takes the full share (`domeHazeColor`). The rain veil covers most of the rain sky
  below 25 degrees, so rain reads violet; the dry night has no veil and stays a navy night with a violet lean. The 1k
  maps carry 0.15 of both shares (`TINT.env`, `hazeColor`): the wet road mirrors them, and at the full share the rain
  harbour road read violet (RGB 95/71/115). The key light's colour is measured before the tint.
- **1k maps carry the fill, keep the light.** The wet road mirrors the 1k map: with the wall in it, the rain harbour's
  road read tan (RGB 128/105/82; 107 luma ahead, 17 with the environment off). The 1k maps now carry the same fill,
  and the light it removed comes back as an overhead glow (el 40..60 up) in the wall's colour, so the horizontal
  irradiance stays the download's (`irradiance.source` / `irradiance.shipped`, asserted within 0.1%).
- **Rain grade (1k and domes).** `x' = exposure * mix(sat(x), haze, veil * exp(-|el| / falloff))` with exposure 0.7,
  saturation 0.8, veil 0.65, falloff 14 degrees; `haze` is the 1k source's own mean radiance 0..1 degree above the
  horizon, tinted (`hazeColor` for the 1k map, `domeHazeColor` for the domes). The rain 1k HDR is written by the
  RGBE + RLE writer in `hdr_io.py` (Blender's `image.save()` altered the float data) and read back to prove the
  round trip.

## Integration contract

Everything the runtime needs is in `assets-src/neon-sky/manifest.json` (`environments.night`, `environments.rain`),
in the shapes of `CoastEnvVariant` (`src/coast-lighting.ts`) and `COAST_SKY_MANIFEST` (`src/coast-sky-manifest.ts`).
Pinned by `tests/neon-sky-manifest.test.js`.

| | `night` | `rain` |
| --- | --- | --- |
| Environment map (PMREM 256) | `environments/shanghai_bund_1k.hdr` (1,246,382 B) | `environments/shanghai_bund_rain_1k.hdr` (1,101,889 B) |
| Sky dome 4K | `environments/sky/shanghai_bund_sky_4k.ktx2` | `environments/sky/shanghai_bund_rain_sky_4k.ktx2` |
| Sky dome 8K (Ultra) | `environments/sky/shanghai_bund_sky_8k.ktx2` | `environments/sky/shanghai_bund_rain_sky_8k.ktx2` |
| `credit` | CC0-1.0, Greg Zaal, polyhaven.com/a/shanghai_bund | same |
| Dome decode `sky.range` | 4.0 | 3.0 |
| `sky.disc` | 0 (no sun) | 0 |
| Key light direction (HDRI frame) | [-0.2897, 0.8151, 0.5017], el 54.6 deg, lon 120 (a street axis) | [-0.1487, 0.9855, 0.0812], el 80.3 deg |
| `key.filled`: measured on the filled sky | [-0.5402, 0.8151, 0.2094], lon 158.8 | same as the key |
| Key light colour | `#ffdec0` | `#ffe4cf` |
| Key light intensity (same road irradiance) | 2.5577 | 1.455 |
| `key.source`: measured on the download (rain: its raw grade) | [-0.7865, 0.4607, -0.4112], el 27.4 deg, 4.5252 | [-0.7504, 0.5086, -0.4222], el 30.6 deg, 2.8193 |
| Ambient (mean hemisphere radiance) | 1.3838 | 0.8754 |
| Horizon glow (linear RGB, same luminance as before the tint) | [2.397, 2.165, 2.269] | [1.731, 1.225, 1.984] |
| `p90Band0to40` (Coast's gain rule, not used) | 1.5064 | 1.1377 |

Paths are relative to `public/`. URLs, bytes and sha256 of every file are in the manifest.

What the runtime must know:

- **Names.** Environment names are `night` and `rain`; the look brief maps presets `track` and `rain` to `rain`,
  `night` to `night`, and leaves `day` / `dusk` / `fog` on today's lighting.
- **Dome format** is Coast's: 4:1 upper hemisphere, first row = zenith (`flipY = false`), sRGB UASTC + zstd, full
  mips; scene-linear radiance = sample x `range`. Same equirect convention: `u = atan2(z, x) / 2pi + 0.5`.
- **Key light** is measured on the downloaded 1k map (`key.source`): direction = vector irradiance of the upper hemisphere
  (where the light comes from on balance); intensity = its length, so a three.js `DirectionalLight` of that intensity
  adds the HDRI's directional part once more (Coast adds its sun the same way, then scales by hand); colour = radiance
  weighted toward that direction. On this map about 90% of that vector is the floodlit embankment wall at el 27-31
  degrees, straight down the harbour heading: its specular glinted white off the wet road and the car paint (road-ahead
  mean 210/255 with 1.3% clipped; 112 with the key off). So the shipped `key.direction` is the vector irradiance of
  the *filled* 1k sky (the sky the player sees), high overhead, and `key.intensity` is scaled by
  sin(source elevation) / sin(elevation) so the road gets the same irradiance; colour and ambient stay the
  download's, whose light the shipped 1k keeps as overhead glow. Treat intensity as a starting value
  scaled by the environment's `intensity`/`exposure`, as Coast's hand-tuned `sun.intensity` is.
- **Key azimuth.** Night's key is then turned about the vertical onto the nearest street axis (`AHEAD_DEG` + k x 90 in
  the HDRI frame, the axes the runtime yaw gives the grid); `key.filled` keeps the measured direction. Where the
  filled sky put it, it stood 119 degrees off the harbour heading and the player car's sloped rear deck mirrored it
  into the chase camera as a white bar. The band is a key 105 to 150 degrees off a straight, on either side, under
  about 76 degrees of elevation, and the lap drives all four street directions, so a diagonal key only moves the bar
  to other straights. Rain's key (el 76.7 when it measured clean, 80.3 now) stands above the band and is not turned. No texture depends on the key.
- **`sky.sunDirection`** keeps Coast's field (centroid of the brightest 0.02 % of the 4K hemisphere) but at night it
  is a lamp or LED facade near el 17-19 degrees; do not use it to place a sun disc (`disc` is 0).
- **`sky.gain`**: `gain = 0.4 x threshold / luminance(sky.horizon)`, so the whole dome, its brightest texels included,
  stays under the bloom; Neon's own kit lights are what blooms. Coast's rule (`threshold / p90Band0to40`) put this glow at 1.15x (rain) and 1.35x
  (night) the threshold: over the canal, where no building hides the dome, the horizon bloomed into a white haze.
  `p90Band0to40` is kept in the manifest for comparison only.
- **Yaw.** The far skyline (the reason for this HDRI) is centred near lon +30 degrees in the HDRI frame; the near
  embankment buildings filled roughly lon -180..-68 and +114..180 up to about 43 degrees (the domes and 1k maps carry
  the wedge fill instead). Pick the dome/environment yaw (as `coastSkyYaw` does for Coast) so the skyline sits
  ahead and the near buildings hide behind Neon's own city.
- **Budgets.** Each dome file is under Coast's `downloadBytes`; each environment's total (1k + 4K + 8K) is under
  Coast's largest environment. The 1k HDRs (1.25 and 1.10 MB) are under Coast's largest 1k (1.44 MB).
- **Rain look** in the sky is haze only; wet road, droplets and the pink-violet grade stay in the runtime (`wetness`,
  `grade.tint`).
