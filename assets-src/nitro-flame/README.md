# NITRO trail flame noise

The tileable noise texture the NITRO trail and sprint exhaust shaders scroll along the jet. Contract:
`docs/designs/nitro-flame/DESIGN.md`, "Shared contract > Flame noise texture".

| File | What |
| --- | --- |
| `bake.py` | Simulates the flow, writes `public/feature-assets/nitro-flame/flame-noise.png` and a contact sheet outside the repo, prints a `SUMMARY` (bytes, sha256, channel means) |

There is no `.blend` master and no downloaded source: the texture is computed, so `bake.py` with its fixed seeds is
the editable master.

## Rebuild

From the repo root (`BLENDER_BIN` as in `scripts/assets/common.mjs`; Blender 5.2 LTS, about 15 s):

```sh
"$BLENDER_BIN" --background --factory-startup --python assets-src/nitro-flame/bake.py [-- <sheet-dir>]
node --test tests/nitro-flame-asset.test.js
```

The contact sheet (`contact-sheet.png`: R and G on top, B and RGB below, each tiled 2 x 2) goes to `<sheet-dir>`,
by default a folder in the OS temp dir. It is a review aid and is never committed. `bake.py` stops if the PNG is over
300,000 bytes or if Blender does not decode it back to the baked values.

## How the shapes are made

Hot gas rising through cold gas, solved as a 2D Boussinesq flow (vorticity and temperature) on a torus, with buoyancy
along +V. Two runs: large eddies for the tongues and filaments, small eddies for the turbulence. Because the domain
is periodic on both axes, every channel tiles exactly; no seam is blended, mirrored or cross-faded. The domain is
shorter along V than along U and is stretched back to a square, which is what makes the shapes run along the flow.

Blender's fluid solver (Mantaflow) was not used: its domain has walls, so its output does not tile, and the
contract puts tileability first.

## Reading it (shader session)

| Channel | Holds | Measured |
| --- | --- | --- |
| R | Flame tongues, about 100 px across, 2.4 times longer along V | 0 to 1, mean 0.52 |
| G | Fine turbulence, about 20 px grain, no preferred direction | mean 0.500, deviation 0.14, clipped to 0 to 1 |
| B | Shear sheets of the same flow as R: thin filaments along V | 92% below 0.1, 0.6% above 0.8, mean 0.03 |

- 512 x 512, 8-bit RGB, linear data: keep `NoColorSpace`, `RepeatWrapping` on both axes.
- U = image x, V = image y. The file's bottom row is v = 0 with `flipY = true` (the `TextureLoader` default); since
  the tile is periodic, a flipped load only reverses the direction of travel.
- B comes from the same run as R, so a filament always lies on the flank of a tongue. Scrolling B at a different speed
  from R breaks that link, which is fine for streaks that race along the core.
- G is centred for use as a signed offset: `(g - 0.5) * 2` spans about -1 to 1, with most values within 0.3 of zero.
- The PNG holds only `IHDR`, `IDAT` and `IEND`: no gamma, sRGB or ICC chunk for a browser to apply.

A rebuild on another machine or Blender version may differ in the last bits of the simulation and so in the file's
bytes; the test checks the properties the contract names, not a hash.
