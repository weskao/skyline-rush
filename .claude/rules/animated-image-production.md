---
paths:
  - "public/feature-assets/**/*.{gif,png,webp,svg}"
  - "public/feature-assets/**/manifest.json"
  - "scripts/*gif*"
  - "tests/*gif*"
  - "tests/*animated*"
  - "src/Garage*.vue"
  - ".github/workflows/*garage*"
---

# Animated artwork production: reusable source-locked template

This is the reusable template for **future animated UI art**, not permission to replace original artwork with generic effects. Read `.claude/rules/raster-artwork.md` first, and preserve its 3x source, native-1x CSS layout, no clipping and accessibility requirements. For the current 25 Garage items, the item-by-item art directions in `docs/designs/garage-animated-gifs/gpt-gif-prompts.md` take priority over illustrative examples below.

## Source and creative acceptance (every new item)

1. Resolve the exact committed source PNG/WebP/SVG from the active feature branch, identify the element that should move, and record its source path and SHA. Never invent a replacement when source art exists.
2. Keep **the same recognizable identity**: silhouette, object, palette, materials, angle, camera, framing, scale and layout. Make independent moving parts and flowing material **inside the source item**, not a generic sparkle/light-sweep overlay.
3. Draw or inpaint a genuine sequence from the source: independent hinges, ribbons, cards, flames, air paths, energy, particles with spawn→motion→fade. Repaint newly exposed areas; no uncovered holes, seams, black lines or gray disks.
4. Motion must have natural anticipation, ease-in/out, secondary follow-through and a seamless repeat. For static props (car in airflow, nozzle in thrusters), lock prop/body pixels; only the specified flow moves.
5. **Reject** whole-image translation/scaling/shaking, global brightness pulses, moving stripe/band overlays, posterization, matte fringes, text, logos, watermarks and visually unrelated redraws. If no acceptable authentic source-linked frames exist, **do not replace** the current runtime GIF; report that item as pending.
6. Create a transparent sprite sheet on an equal-cell grid (e.g. 4 columns × 5 rows for 20 frames). **Each cell** has the final GIF's exact native pixel dimensions, and the same item's source is used for every cell. Do not stretch a smaller generated sheet to claim native 3x art. Review frames 1/middle/last at original size before slicing.

## GIF delivery contract (Garage default; override only by an explicit scoped spec)

| Contract | 288x288 items | Store 216x216 items |
| --- | --- | --- |
| Pixel canvas | 288 × 288 (96 × 96 CSS) | 216 × 216 (72 × 72 CSS) |
| Frame count | 20–24 | 20–24 |
| Frame duration / FPS | 50 ms / 20 FPS | 50 ms / 20 FPS |
| Loop | Infinite, first/last transition seamless | Same |
| Alpha safety inset (each frame, threshold alpha > 16) | ≥12 pixels on each edge | ≥20 pixels on each edge |
| Output | GIF89a, transparent, one global palette (≤255 colors + transparent slot) | Same |
| Size | <900,000 bytes | <900,000 bytes |

GIF supports 1-bit transparency. Compose partially transparent edge RGB against the intended card matte `#0f1c33` before the alpha cut (~40%); reserve one transparent index, turn off alpha-edge dithering and use **one shared palette** for all frames. Preserve straight transparency outside the artwork; no white/gray halo on the actual card background.

## Repeatable authoring steps

1. Write a per-item brief with `name`, `category`, committed `source`, output `file`, canvas, fixed parts, moving parts, timing and acceptance notes. Reuse original artwork instead of creating fresh unrelated concepts.
2. Generate 20–24 source-locked transparent frames as a uniform sprite sheet, slice to equal cells, use one shared GIF palette and export loop=0, disposal=2, duration=50.
3. Verify pixel bounds, identical canvas sizes, transparency, global palette, frame count, durations, loop and file size; compare 6 evenly spaced frames and first/last for smoothness, identity, physical part movement and no clipping. **Tests cannot substitute for human visual review.**
4. In `public/feature-assets/garage-animated/manifest.json`, preserve each existing `name`, `category`, `source`, `file`, `width`, `height`; update actual `size`, `frames`, `fps=20`, and set `profile` to `gpt-authored` **only after** its authentic frames have been generated and checked. No false `gpt-authored` entries.
5. When *all* 25 replacement GIFs pass, remove obsolete `scripts/generate-garage-gifs.py`, `tests/test_garage_gif_motion.py` and `.github/workflows/garage-animated-gifs.yml` together to prevent GitHub Actions rewriting manually authored assets. In `tests/garage-animated-artwork.test.js`, only retire the legacy test that reads the deleted script; preserve and strengthen all remaining behavior/artwork tests. Until then **keep old files and generator**. This is an explicit transition exception, not permission to weaken CI.
6. Run `npm test`, `npm run build`, `make verify`, image contract checks, real desktop/mobile Gallery screenshot reviews and exact-HEAD GitHub Actions. Record successes and blockers separately in `TODO.md` with source SHA, 6-frame contact sheets and per-GIF file size/frame counts.
7. Commit/push only to the designated working feature branch. Never merge, open a PR, deploy, force-push or alter source reference art without explicit authorization.

## Reusable item brief template

```yaml
name: <unique-id>
category: <thruster|airflow|nitro-trail|launch-flare|store-concept|other>
source: public/feature-assets/<existing-original>.webp
source_sha: <verified-git-blob-sha>
output: public/feature-assets/<category>/<unique-id>@3x.gif
canvas: [288, 288]
frames: 20
frame_duration_ms: 50
transparent_matte: "#0f1c33"
stationary_parts: "<exact object/components to lock>"
animated_parts: "<what genuinely changes physically>"
motion_timeline: "<anticipation / action / follow-through / return>"
reject_if: "<visual defects; identity changes; seams; missing alpha margin>"
```

For the Garage 25-item production brief, retain the original source mapping and item-specific descriptions. This rule is reusable across other game asset categories; do not silently force Garage categories onto unrelated future assets.
