# Road Supplies — authored 3D pickups, shared by the race and the guide

The four pickups (`cell`, `can`, `tank`, `overcharge`) are always the enhanced 3D version. There is
no build flag: `make 3d=1` only keeps its Roadster/Coast preview redirect (`DEV_3D`).

## One renderer, two places

| Piece | File | Used by |
| --- | --- | --- |
| Models (Blender → GLB, baked PBR) | `assets-src/pickup-<tier>/`, `public/models/pickup-<tier>/`, manifest entries in `src/model-manifest.ts` | both |
| Model loading, one fetch per page | `src/pickup-models.ts` | both |
| Instanced models + halo + glow pulse + hover/spin | `src/pickup-markers.js`, `src/pickup-aura.js`, `src/pickup-art.js` | both |
| Race placement and collection triggers | `src/effects.js` | race |
| Card previews, one WebGL context for all cards | `src/pickup-preview-stage.ts`, `src/Pickup3DPreview.vue` | guide |
| Collection effects | `src/pickup-collect-vfx.js` | race |

The guide and the race call the same `createPickupMarkers()` and the same `place()` per pickup, so
model, material, reflection map, scale, hover, spin, glow pulse and halo cannot drift apart. What
still differs is the light around them: the guide uses a fixed three-light studio rig, a track uses
its own sun and sky.

| Tier | Model | Triangles | GLB | Scene scale | Reward |
| --- | --- | ---: | ---: | --- | --- |
| cell | Armoured energy cell, glowing blue core | 1,626 | 296 KB | 0.82 | +0.25 NITRO |
| can | Orange pressure canister | 1,870 | 283 KB | 0.94 | +0.5 NITRO |
| tank | Twin gold high-capacity tank | 1,822 | 287 KB | 1.08 | +1.0 NITRO |
| overcharge | Four-hue prism core, gold caps, two gyro rings | 2,508 | 283 KB | 1.24 | Top up 3 NITRO |

Each GLB has a 300 KB budget (`src/model-manifest.ts`); the cell is 3.9 KB under it, so a rebuild that
grows its textures fails `check-glb` rather than shipping.

Collision volumes, rewards, placement, respawn timers and balance are unchanged.

## Loading and fallbacks

- `src/pickup-art.js` builds procedural stand-in models at scene construction. They are drawn until
  the four GLBs are parsed, and for good if any of them fails to load (all four or none, so one
  track never mixes two art styles).
- The swap to the loaded models happens only while no race is running, and `effects.update()`
  returns `true` on that frame so `world.js` warms the new shaders. Nothing compiles mid-race.
- Guide cards: the live model is always mounted. The animated WebP (its poster under reduced
  motion) is shown only until the first live frame, and stays where WebGL is unavailable; the SVG
  replaces a WebP that fails to load.

## Rendering and performance

- One `InstancedMesh` per tier (128 instances) and one instanced halo pool: at most five draw calls
  for every pickup in view. Geometry and textures are shared by the race and the guide; each
  renderer owns only its material clones (a reflection map belongs to one renderer).
- The halo is a camera-facing additive quad per pickup, tinted with the tier accent and breathing
  with the model's emissive pulse (`pickupPulse`).
- Reduced motion freezes spin, hover, glow and halo.
- Measured on Coast (desktop Chromium, 2026-11-12, scene total 543 draw calls): 30 pickups in view add
  4 draw calls and 60,000 triangles, the halo 1 draw call, a playing Overcharge effect 16 draw calls and
  4,500 triangles. With 40 pickups plus that effect shown or hidden the frame time is the same within
  noise (p50 16.7 ms both; p95 18.4 ms shown, 18.9 ms hidden). Phones are not measured yet.
- The guide draws only the cards on screen, at a pixel ratio of at most 2, and releases its WebGL
  context when the last card unmounts.

## Collection effects

Each tier plays its own choreography on the same pooled meshes. A player pickup sends a short
contact pulse out from the authored item in the local road frame, then the rings, shards and
car-body sweep follow the rendered car. The body sweep reuses the garage rig's body rider and
fits the equipped body's geometry, including the authored GLB. A rival's quieter cue stays at the item.

| Tier | Motion | Rings | Shards | Length | What it does |
| --- | --- | ---: | ---: | ---: | --- |
| `cell` | `arcSnap` | 2 | 18 | 0.50 s | Cyan electrical pulse, inward needles, and a short jagged sweep from nose to tail |
| `can` | `afterburn` | 2 | 24 | 0.65 s | Two-lobed orange pressure pulse, a tail-only heat sweep, and two exhaust jets |
| `tank` | `surge` | 3 | 30 | 0.78 s | Gold hexagonal pulse, ascending scan rings, and two bands up the body |
| `overcharge` | `prismNova` | 3 | 42 | 0.90 s | Faceted rainbow pulse, crossing body bands, spinning rings, and a prismatic starburst |

Two slots per tier (eight at most). The contact pulse uses one depth-tested plane per active
player pickup, and one shared mesh sweeps the player's body using the latest pickup's palette.
Medium quality draws 65% of the shards and up to two rings, with a dimmer pulse. Low draws 26%
of the shards and one ring, omits the contact pulse and dims the body sweep. Reduced motion
uses a still ring and a faint glow. The effect remains local to the pickup and car, and the
flash is capped in size and opacity.

`effects.js` uses the pickup's `downUntil` as the take generation, so a respawned pickup gets a new
effect and one take never plays twice.

## Building a model

Each tier is one mesh (`pickup_<tier>`) with one material (`pickup_<tier>_pbr`) and a baked texture
set. `scripts/assets/pickup_kit.py` holds the shared helpers; `assets-src/pickup-<tier>/build.py`
is the reproducible build. Chain, from the repo root:

```sh
$BLENDER_BIN --background --factory-startup --python assets-src/pickup-<tier>/build.py
node scripts/assets/export-glb.mjs pickup-<tier>
node scripts/assets/optimize-glb.mjs pickup-<tier>
node scripts/assets/check-glb.mjs pickup-<tier> --promote
```

The AI sprite sheets in `docs/designs/road-pickups/ai-sprite-sources/` are the art reference.

## Guide sprites (fallback artwork)

Relative to `public/feature-assets/road-pickups/`:

| Tier | Animated art | Reduced-motion poster |
| --- | --- | --- |
| cell | `animated/cell.webp` | `animated/cell-poster.webp` |
| can | `animated/can.webp` | `animated/can-poster.webp` |
| tank | `animated/tank.webp` | `animated/tank-poster.webp` |
| overcharge | `animated/overcharge.webp` | `animated/overcharge-poster.webp` |

Each animation is a looping WebP of 16 frames at 85 ms (192 × 192 per frame), converted from a
1254 × 1254 4 × 4 sheet; each poster is a single frame with alpha. The sheets are archived for
editing only and are never loaded by the game.

## Verification

```sh
node --test tests/pickup-markers.test.js tests/pickup-collect-vfx.test.js tests/pickup-3d-flag.test.js \
  tests/pickup-3d-presentation.test.js tests/pickup-sprite-guide.test.js tests/effects.test.js tests/module-size.test.js
npm run typecheck && npm test && npm run build
npx playwright test tests/pickup-3d-browser.spec.js tests/pickup-3d-collection-browser.spec.js
make verify
```

CI runs the two browser specs on the default build and uploads their real WebGL frames as
`pickup-3d-visual-evidence`. Physical-phone art review and the exact-HEAD full CI are separate
gates; see `TODO.md` for what has been run.
