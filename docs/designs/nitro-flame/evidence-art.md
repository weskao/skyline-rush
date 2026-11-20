# NITRO flame: art session evidence

Branch `feature/nitro-flame-art`, 2026-11-20. Scope: the flame noise texture of `DESIGN.md`
("Shared contract > Flame noise texture"). The contract was followed as written; nothing in it looked wrong.

## Result

| Item | Value |
| --- | --- |
| File | `public/feature-assets/garage-vfx-skins/nitro-flame/flame-noise.png` |
| Format | 512 x 512, 8-bit RGB (PNG colour type 2), chunks `IHDR IDAT IEND` only |
| Size | 293,450 bytes (limit read as 300,000 bytes, the stricter reading of 300 KB) |
| sha256 | `a71ed8b3011873e2588891a50b5f18b519e317a0d55d2a49560d84a4ef114af6` |
| Rebuild | deterministic on this machine: three bakes in a row gave the same sha256 |

## Rebuild command

From the repo root, Blender 5.2.3 LTS, about 15 s:

```sh
"$BLENDER_BIN" --background --factory-startup --python assets-src/nitro-flame/bake.py [-- <sheet-dir>]
```

`BLENDER_BIN` was unset on this machine; the runs used `blender` from `PATH`. Details: `assets-src/nitro-flame/README.md`.

## Test output

`node --test tests/nitro-flame-asset.test.js` on the committed file:

```text
✔ flame noise is a 512 x 512 8-bit RGB PNG of plain data, at most 300 KB
ℹ bytes 293450, chunks IHDR IDAT IEND
✔ R holds flame tongues: full range, large shapes stretched along V
ℹ {"min":0,"max":1,"mean":0.518,"stretch":2.374,"coarse":0.699}
✔ G holds fine turbulence with a mean near 0.5
ℹ {"min":0,"max":1,"mean":0.5,"deviation":0.143,"coarse":0.287}
✔ B holds sparse hot filaments running along V on a dark field
ℹ {"max":1,"mean":0.031,"dark":0.917,"lit":0.017,"hot":0.0063,"stretch":2.467}
✔ every channel tiles on both axes: the wrap-around seam is no rougher than the interior
ℹ R u order 1: seam 0.0159, interior max 0.0496, interior mean 0.0206
ℹ R u order 2: seam 0.0048, interior max 0.0213, interior mean 0.0066
ℹ R v order 1: seam 0.0112, interior max 0.0213, interior mean 0.0087
ℹ R v order 2: seam 0.0037, interior max 0.011, interior mean 0.0027
ℹ G u order 1: seam 0.0236, interior max 0.026, interior mean 0.0213
ℹ G u order 2: seam 0.0075, interior max 0.0086, interior mean 0.0067
ℹ G v order 1: seam 0.0237, interior max 0.0316, interior mean 0.0221
ℹ G v order 2: seam 0.0086, interior max 0.0091, interior mean 0.0064
ℹ B u order 1: seam 0.004, interior max 0.0758, interior mean 0.0093
ℹ B u order 2: seam 0.0035, interior max 0.0677, interior mean 0.007
ℹ B v order 1: seam 0.0044, interior max 0.0195, interior mean 0.0038
ℹ B v order 2: seam 0.0013, interior max 0.0139, interior mean 0.0015
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

"u" is the seam between the last and first column, "v" between the last and first row; order 1 is the step across
it, order 2 the kink at it. "stretch" is how much longer shapes run along V than along U; "coarse" is the share of a
channel's variance left after averaging 16 px blocks.

| Other run | Result |
| --- | --- |
| `npm test` | 3646 tests: 3642 pass, 0 fail, 4 skipped |
| `node --test tests/module-size.test.js` | 3 pass, 0 fail |

The first `npm test` in this worktree failed 5 tests (`typescript-primary`, `three-version-contract` and three
type-contract tests) because the worktree had no installed `node_modules`; after `npm ci` the same run is green.

## RED before GREEN

- Test written before `bake.py`: 5 of 5 failed with `ENOENT` (no texture).
- While tuning, the test rejected real bakes: over 300,000 bytes (313,711; 357,154), G too coarse (coarse share
  0.608 against a limit of 0.3), B never white-hot (hot share 0.0021 against 0.003), and a first bake whose tongues
  ran along U (stretch 0.5).
- Seam check proven on a broken file: the texture was replaced by a stretched crop of itself (no longer periodic)
  and the tiling test failed with `R across u (order 1): seam 0.2246 is rougher than the interior's 0.0610`. The
  real file was then rebuilt to the sha256 above.

No threshold in the test was changed after seeing a bake; the bake was tuned to the test.

## Choices worth knowing

- **Simulated, not drawn.** Two runs of a 2D buoyant flow (Boussinesq, vorticity and temperature) on a torus, in
  numpy inside headless Blender. Periodic by construction, so nothing is blended at a seam.
- **Not Mantaflow.** Blender's fluid domain has walls and does not tile; the contract puts tileability first.
  Blender is the Python host and the independent decoder: `bake.py` reloads the PNG through Blender and requires
  the exact baked values back.
- **Own PNG writer.** Blender's writer added `sRGB`, `gAMA` and `cHRM` chunks (a colour profile on data) and
  produced 420,950 bytes for the same pixels. `bake.py` writes `IHDR`, `IDAT`, `IEND` with per-row filters.
- **The 300 KB limit set the detail.** G is the costly channel (about 145 KB of the 293 KB). Its grain is about 20 px
  and its contrast is a deviation of 0.14; finer or stronger G does not fit beside R and B.
- **No `.blend` master, no `preview.py`.** The other `assets-src/` folders keep them for hand-edited scenes; here
  the script and its seeds are the whole source.

## Not run, not done

- No browser or WebGL check: nothing loads the texture until the shader session's `src/nitro-flame-texture.ts`
  lands. How it reads on the tube, end-on from the chase camera, is unverified.
- No `npm run build`, `npm run test:browser` or `make verify`: no file under `src/` changed. The locked build's
  removal of `garage-vfx-skins/` was not re-checked with this file present.
- No rebuild on a second machine or Blender version. The simulation is chaotic, so its bytes may differ there;
  the test checks properties, not a hash.
- No hash registered in a `src/` manifest (outside this session's files).
- Not pushed, not merged, no CI run.
- Crucible MCP failed to connect in this session; it was not needed. Blender MCP was not used, as instructed.
