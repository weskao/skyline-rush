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

`build.py` checks every download against `sources.json`, writes the shipped files and `manifest.json`, and reuses
Coast's dome encoder (`assets-src/coast-sky/build.py`) bit for bit. Needs `toktx` on `PATH`. About 18 minutes, mostly
the 8K UASTC encodes; peak memory about 2 GB.

Processing, all in direction space so 1k, 4K and 8K agree:

- **Sign soften (both domes).** The far LED towers carry vertical text and the near embankment buildings carry facade
  and rooftop signs that read at 4K and 8K. `SOFTEN` blurs (Gaussian, sigma 0.25 degrees) the band from the horizon to
  22 degrees (fading out by 26) and one box at lon -166..-156, el 35..41 (the rooftop sign). Glow and silhouettes
  stay. The 1k environment maps are below legibility and are not softened.
- **Rain grade (1k and domes).** `x' = exposure * mix(sat(x), haze, veil * exp(-|el| / falloff))` with exposure 0.7,
  saturation 0.8, veil 0.65, falloff 14 degrees; `haze` is the 1k source's own mean radiance 0..1 degree above the
  horizon (`hazeColor` in the manifest). The rain 1k HDR is written by the script's own RGBE + RLE writer (Blender's
  `image.save()` altered the float data) and read back to prove the round trip.

## Integration contract

Everything the runtime needs is in `assets-src/neon-sky/manifest.json` (`environments.night`, `environments.rain`),
in the shapes of `CoastEnvVariant` (`src/coast-lighting.ts`) and `COAST_SKY_MANIFEST` (`src/coast-sky-manifest.ts`).
Pinned by `tests/neon-sky-manifest.test.js`.

| | `night` | `rain` |
| --- | --- | --- |
| Environment map (PMREM 256) | `environments/shanghai_bund_1k.hdr` (1,640,377 B) | `environments/shanghai_bund_rain_1k.hdr` (1,477,669 B) |
| Sky dome 4K | `environments/sky/shanghai_bund_sky_4k.ktx2` | `environments/sky/shanghai_bund_rain_sky_4k.ktx2` |
| Sky dome 8K (Ultra) | `environments/sky/shanghai_bund_sky_8k.ktx2` | `environments/sky/shanghai_bund_rain_sky_8k.ktx2` |
| `credit` | CC0-1.0, Greg Zaal, polyhaven.com/a/shanghai_bund | same |
| Dome decode `sky.range` | 4.0 | 3.0 |
| `sky.disc` | 0 (no sun) | 0 |
| Key light direction (HDRI frame) | [-0.7865, 0.4607, -0.4112], el 27.4 deg | [-0.7504, 0.5086, -0.4222], el 30.6 deg |
| Key light colour | `#ffdec0` | `#ffe4cf` |
| Key light intensity (measured) | 4.5252 | 2.8193 |
| Ambient (mean hemisphere radiance) | 1.3838 | 0.8754 |
| Horizon glow (linear RGB) | [2.379, 2.219, 2.131] | [1.524, 1.368, 1.272] |
| `p90Band0to40` (Coast's gain rule, not used) | 1.6703 | 1.2121 |

Paths are relative to `public/`. URLs, bytes and sha256 of every file are in the manifest.

What the runtime must know:

- **Names.** Environment names are `night` and `rain`; the look brief maps presets `track` and `rain` to `rain`,
  `night` to `night`, and leaves `day` / `dusk` / `fog` on today's lighting.
- **Dome format** is Coast's: 4:1 upper hemisphere, first row = zenith (`flipY = false`), sRGB UASTC + zstd, full
  mips; scene-linear radiance = sample x `range`. Same equirect convention: `u = atan2(z, x) / 2pi + 0.5`.
- **Key light** is measured on the shipped 1k map: direction = vector irradiance of the upper hemisphere (where the
  light comes from on balance, here the lit embankment buildings, not a sun); intensity = its length, so a three.js
  `DirectionalLight` of that intensity adds the HDRI's directional part once more (Coast adds its sun the same way,
  then scales by hand); colour = radiance weighted toward that direction. Treat intensity as a starting value
  scaled by the environment's `intensity`/`exposure`, as Coast's hand-tuned `sun.intensity` is.
- **`sky.sunDirection`** keeps Coast's field (centroid of the brightest 0.02 % of the 4K hemisphere) but at night it
  is a lamp or LED facade near el 17-19 degrees; do not use it to place a sun disc (`disc` is 0).
- **`sky.gain`**: `gain = 0.4 x threshold / luminance(sky.horizon)`, so the whole dome, its brightest texels included,
  stays under the bloom; Neon's own kit lights are what blooms. Coast's rule (`threshold / p90Band0to40`) put this glow at 1.15x (rain) and 1.35x
  (night) the threshold: over the canal, where no building hides the dome, the horizon bloomed into a white haze.
  `p90Band0to40` is kept in the manifest for comparison only.
- **Yaw.** The far skyline (the reason for this HDRI) is centred near lon +30 degrees in the HDRI frame; the near
  embankment buildings fill roughly lon -180..-110 and +150..180 up to about 43 degrees. Pick the dome/environment
  yaw (as `coastSkyYaw` does for Coast) so the skyline sits ahead and the near buildings hide behind Neon's own city.
- **Budgets.** Each dome file is under Coast's `downloadBytes`; each environment's total (1k + 4K + 8K) is under
  Coast's largest environment. The night 1k HDR alone (1.64 MB) is larger than any Coast 1k (max 1.44 MB).
- **Rain look** in the sky is haze only; wet road, droplets and the pink-violet grade stay in the runtime (`wetness`,
  `grade.tint`).
