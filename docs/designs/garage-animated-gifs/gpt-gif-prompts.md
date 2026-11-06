# Garage animated GIFs: GPT production brief (25 files)

This brief is self-contained. An AI agent with image generation, a Python sandbox and git access can follow it
from top to bottom: make the 25 Garage GIFs, apply them to the repo and push.

- Repo: https://github.com/weskao/skyline-rush
- Branch: `feature/garage-preview-animated-gifs` (work and push here; never merge, open a PR to `develop`/`main`, or deploy)
- Output folder: `public/feature-assets/garage-animated/`
- Raw file URL pattern: `https://raw.githubusercontent.com/weskao/skyline-rush/feature/garage-preview-animated-gifs/<path>`

**Out of scope:** the 14 sweep-only icons (`badge-*`, `rarity-*`, `store-cart`, `store-star`, `store-tag`). They show
their original art with a shared CSS light sweep (`src/GarageArtworkTile.vue`). Do not make GIFs for them.

## 1. Art direction (applies to every file)

You are a senior VFX / UI motion artist for a AAA mobile racing game. Each GIF is a looping animated
icon made from a reference still of the same game item. Keep its identity: the same object, silhouette,
palette, materials, camera angle, scale and position. You may repaint details so the motion reads naturally, but it must
clearly stay the same item.

- Motion language: natural game feel. Use ease-in/out, anticipation, follow-through, overlapping secondary motion,
  and additive light and particles with a life cycle (spawn, travel, fade).
- FORBIDDEN: moving or scaling the whole image, camera shake, global brightness pulsing, stripes or bands
  sliding across the art, cut-out parts that leave holes or seams or black lines, grey smears or grey disks in glows,
  posterized banding, and any text, logo or watermark.

## 2. Technical contract (every GIF must pass)

1. Exact canvas: 288×288 px (thruster, nitro, launch flare, airflow) or 216×216 px (store). GIF89a, transparent background.
2. 20 to 24 frames at 50 ms each, infinite loop (`loop=0`). The loop is seamless: the last frame flows into the first with no pop.
3. Transparent margin (alpha > 16) in EVERY frame: at least 12 px on each edge for 288×288 and at least 20 px for 216×216.
4. GIF alpha is 1-bit. Before quantizing, composite each semi-transparent pixel over the card color `#0f1c33`
   (matte), then cut alpha at about 40%. No white or grey fringe, and no dithering on the alpha edge.
5. One global palette for all frames (≤ 255 colors + 1 transparent index), so colors never flicker between frames.
6. File size < 900,000 bytes.
7. Production method (an image model cannot output a GIF directly): generate the frames as ONE sprite
   sheet (an equal grid, each cell = the canvas size, transparent PNG), all cells drawn from the same reference so the
   identity stays locked. Then slice, matte, palettize and save the GIF in Python:
   `frames[0].save(path, save_all=True, append_images=frames[1:], loop=0, duration=50, disposal=2, transparency=0)`.

## 3. The 25 items

Reference = the file to load from the branch (render `.svg` at the canvas size first). Output = the exact path to overwrite.

### Thrusters (288×288): the nozzle and metal body stay perfectly still; only the exhaust (toward the lower left) animates

| # | Output | Reference | Motion |
|---|---|---|---|
| 1 | `public/feature-assets/garage-animated/thruster-basic@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/thruster-basic@3x.webp` | Cold blue jet exhaust: a white-hot core flickers at the nozzle mouth, the turbulent blue plume billows toward the lower left with organic fluid noise, cyan sparks streak out and fade, the inner nozzle ring breathes slowly, and heat shimmer sits at the tip. |
| 2 | `public/feature-assets/garage-animated/thruster-ion@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp` | Violet ion drive: every ~0.4 s a bright ion ring leaves the nozzle and travels down the plume, expanding and fading. Electric filaments crackle on the plume edge, a white-violet core shimmers, and charged particles drift off. |
| 3 | `public/feature-assets/garage-animated/thruster-plasma@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/thruster-plasma@3x.webp` | Magenta plasma: two twisted plasma strands spiral around each other along the plume (a helix flowing away from the nozzle), the pink-white core pulses softly, and wisps peel off the edges and fade. |
| 4 | `public/feature-assets/garage-animated/thruster-void@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/thruster-void@3x.webp` | Void drive: the deep-blue flame has a darker dense core and a bright electric-blue rim, rim ripples travel outward, faint particles are pulled back INTO the nozzle at the edges, and the flicker is slow and heavy. |

### Nitro trails (288×288): the trail shape stays put; energy flows from the lower-left tail to the upper-right head

| # | Output | Reference | Motion |
|---|---|---|---|
| 5 | `public/feature-assets/garage-animated/nitro-trail-basic@3x.gif` | `public/feature-assets/garage-vfx-skins/nitro-trail.svg` | Keep the FLAT VECTOR style. A soft gradient highlight glides along the purple chevrons, short speed ticks slide forward on the cyan bar and fade, and the two dots pop with an offset squash-and-stretch bounce. |
| 6 | `public/feature-assets/garage-animated/nitro-trail-cyan@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/trail-cyan@3x.webp` | Electric cyan stream: bright energy packets race from tail to head, lightning filaments flicker and re-branch, the feathered edges flutter like flame, and sparks shed off. |
| 7 | `public/feature-assets/garage-animated/nitro-trail-gold@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/trail-gold@3x.webp` | Golden afterburner: twin intertwined fire streams surge forward, embers ride the flow and cool from white-gold to orange, and flame tongues lick the edges. |
| 8 | `public/feature-assets/garage-animated/nitro-trail-purple@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/trail-purple@3x.webp` | Cosmic nebula: violet and magenta gas curls slowly forward, star sparkles twinkle and drift inside, and the white core streak breathes. The motion is calm and dreamy. |
| 9 | `public/feature-assets/garage-animated/nitro-trail-red@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/trail-red@3x.webp` | Aggressive red boost: motion-blurred hot-white dash pulses fire along the trail in rapid succession (NOT stripes painted across the shape), the flame edges whip, and sparks spray backward. |

### Launch flares (288×288): centered burst; charge, release, settle, seamless loop

| # | Output | Reference | Motion |
|---|---|---|---|
| 10 | `public/feature-assets/garage-animated/launch-flare-basic@3x.gif` | `public/feature-assets/garage-vfx-skins/launch-flare.svg` | Keep the FLAT VECTOR style. The star does a small anticipation squash, then a punchy scale-pop with overshoot, and settles. The ray dashes shoot out and retract in a stagger, and the core brightens on the pop. |
| 11 | `public/feature-assets/garage-animated/launch-flare-blue@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-blue@3x.webp` | Blue energy burst: the core charges, a crisp shockwave ring expands from the center and fades, the rays stretch out and relax, and sparks fly. No hole or grey disk at the center. |
| 12 | `public/feature-assets/garage-animated/launch-flare-cyan@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-cyan@3x.webp` | Frost burst fanning up from the base: icy rays extend, crystal shards fly out and glint, a cold mist ring spreads along the bottom, and the base flashes on release. |
| 13 | `public/feature-assets/garage-animated/launch-flare-gold@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-gold@3x.webp` | Solar flare: the corona rays rotate slowly, prominences arc and flicker at the rim, the core blooms white on a heartbeat, and embers drift outward. |
| 14 | `public/feature-assets/garage-animated/launch-flare-magenta@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-magenta@3x.webp` | Spiral magenta burst from the base: the rays sweep in a spiral twist, pink particles corkscrew upward and fade, and the base flashes on release. |
| 15 | `public/feature-assets/garage-animated/launch-flare-pulse@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-purple@3x.webp` | Purple heartbeat: a double pulse (beat, beat, rest), and each beat sends a soft violet ring outward and makes the rays flare briefly. The ease is organic. |
| 16 | `public/feature-assets/garage-animated/launch-flare-red@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-red@3x.webp` | Red shock blast: a violent flash, then a sharp radial shock ring and debris sparks thrown diagonally outward. The flame edges whip and settle. No grey wedge at the core. |
| 17 | `public/feature-assets/garage-animated/launch-flare-ring@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-ring@3x.webp` | Portal arch: energy flows continuously around the pink outer arc, the inner blue band swirls the opposite way, and sparks orbit along the arc. The arch shape stays fixed. |
| 18 | `public/feature-assets/garage-animated/launch-flare-white@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/flare-white@3x.webp` | White nova from the base: a bright bloom flash, the rays extend like crystal spikes, a pale-blue afterglow decays, and fine glitter drifts upward. |

### Airflow (288×288): the car stays 100% still; the air flows from the nose (right) past the body to the tail (left); keep the clean vector style

| # | Output | Reference | Motion |
|---|---|---|---|
| 19 | `public/feature-assets/garage-animated/airflow-basic@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/airflow-basic@3x.svg` | Laminar flow: bright dash segments travel along each wavy stream line at slightly different speeds, the lines gently undulate, and dust specks drift with the flow. |
| 20 | `public/feature-assets/garage-animated/airflow-slipstream@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/airflow-slipstream@3x.svg` | Fast slipstream: the streams curve over the roof and converge behind the car, streaks accelerate as they pass the body (speed-ramped), and a faint draft wake trails behind the tail. |
| 21 | `public/feature-assets/garage-animated/airflow-vortex@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/airflow-vortex@3x.svg` | The spiral vortex behind the car rotates continuously, light pulses travel inward along the arms, and the dashed target ring in the eye slowly counter-rotates. |
| 22 | `public/feature-assets/garage-animated/airflow-prism@3x.gif` | `public/feature-assets/garage-vfx-skins/raster/airflow-prism@3x.svg` | Prismatic beams: light pulses run along the zigzag lines, the hue shifts pink → violet → cyan as each pulse passes, and the diamond prisms glint when a pulse reaches them. |

### Store (216×216): real part motion; repaint any surface that becomes visible, so no hole, seam or black cut line appears

| # | Output | Reference | Motion |
|---|---|---|---|
| 23 | `public/feature-assets/garage-animated/store-box@3x.gif` | `public/feature-assets/garage-store-readiness/raster/store-box@3x.webp` | Loot crate tease: an anticipation squash, the lid cracks open on its rear hinge (about 15°) with an overshoot, golden light beams and sparkles spill from the gap, and the lid settles closed with a soft bounce. The neon lines pulse on the open and the base stays planted. |
| 24 | `public/feature-assets/garage-animated/store-bundle@3x.gif` | `public/feature-assets/garage-store-readiness/raster/store-bundle@3x.webp` | Gift box: a tiny hop with squash-and-stretch and a soft landing, the ribbon bow loops flutter with follow-through after the landing, glitter pops around the box, and the neon edges glow on the landing. |
| 25 | `public/feature-assets/garage-animated/store-collection@3x.gif` | `public/feature-assets/garage-store-readiness/raster/store-collection@3x.webp` | Card fan: the three cards fan out in a staggered cascade (back card first) and fan back in, a holographic foil sheen slides across each face in turn, and the front card tilts a few degrees. The cards stay whole. |

## 4. Apply to the repo

1. `git clone https://github.com/weskao/skyline-rush.git && cd skyline-rush && git checkout feature/garage-preview-animated-gifs && git pull`.
   Then run `npm ci` (Node >= 22.12) and `pip install numpy Pillow`.
2. Write each GIF to its Output path, overwriting the old procedural file. Change nothing in `src/`, any reference
   image or any other asset.
3. In `public/feature-assets/garage-animated/manifest.json`, keep all 25 entries and their `name`, `category`,
   `source`, `file`, `width` and `height`. Update `size` (exact byte size), `frames` (frame count) and `fps` (`1000 / duration`),
   and set `profile` to `"gpt-authored"` only for a GIF whose real frames you have generated and checked. Never mark an unfinished item.
4. Keep the procedural generator, its test and its workflow until ALL 25 GIFs are `gpt-authored` and verified.
   The workflow only re-renders when those three files change, so committing GIFs alone is safe.
   Remove them only in the commit that completes the 25th GIF:
   - delete `scripts/generate-garage-gifs.py`, `tests/test_garage_gif_motion.py` and `.github/workflows/garage-animated-gifs.yml`;
   - in `tests/garage-animated-artwork.test.js`, delete only the test whose title starts with
     `'every item has its own source-driven motion recipe'` (it reads the deleted script). Leave every other test untouched.
5. Verify. All of the following must pass, so fix the GIFs, never the tests:
   ```bash
   npm test
   npm run build
   python3 - <<'PY'
   import json
   from pathlib import Path
   import numpy as np
   from PIL import Image, ImageSequence
   items = json.loads(Path('public/feature-assets/garage-animated/manifest.json').read_text())
   assert len(items) == 25
   done = [it for it in items if it.get('profile') == 'gpt-authored']
   for it in done:
       path = Path(it['file']); gif = Image.open(path); n = it['name']; w = it['width']
       margin = 20 if w == 216 else 12
       assert gif.format == 'GIF' and gif.size == (w, w), n
       assert gif.n_frames >= 20 and gif.info.get('loop') == 0 and 'transparency' in gif.info, n
       assert path.stat().st_size == it['size'] < 900_000, n
       for frame in ImageSequence.Iterator(gif):
           a = np.asarray(frame.convert('RGBA'))[:, :, 3]
           ys, xs = np.nonzero(a > 16)
           assert min(xs.min(), ys.min(), w - 1 - xs.max(), w - 1 - ys.max()) >= margin, f'{n}: margin'
   print(f'OK: {len(done)}/25 gpt-authored GIFs pass the contract')
   PY
   ```
6. Commit and push to the same branch, for example:
   `git add -A && git commit -m "assets(garage): GPT-authored <batch> GIFs [full-regression]" && git push origin feature/garage-preview-animated-gifs`.
   If you work in batches, each batch commit holds only its GIFs and their manifest entries, and the generator stays in place.
   Do step 4 (remove the generator) only in the final commit, once all 25 are done and the check prints `25/25`.
7. Report: each file with its byte size and frame count, a 6-frame contact sheet per GIF on `#0f1c33`, and the
   verification output. List any item you could not finish, with the reason.
