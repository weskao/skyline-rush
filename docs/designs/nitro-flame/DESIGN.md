# NITRO trail: realistic burning jet

Status: approved direction (2026-11-20), built by three parallel sessions and integrated on
`feature/nitro-realistic-flame`.

## Why

The four Garage NITRO trail skins (`src/garage-nitro-trail.js`) read as smooth glowing cones. Three glare
fixes (2026-11-18 to 11-20) capped the light, and nothing replaced it: every shape comes from `sin` and a
hash, there is no texture and no particle, and the streak's brightest channel is normalised to 0.66. The
player finds the trail neither eye-catching nor fast.

Reference look: The Crew Motorfest, Need for Speed Hot Pursuit Remastered, Burnout Paradise. A small
white-hot point at each exhaust, a flame body with tongues and turbulence, long thin streaks, sparks. Those
games are not brighter overall; they put the brightness in a few pixels and the rest into shape and colour.

## Goals

1. The flame body shows turbulence and tongues that come from a baked texture.
2. A white-hot core sits at each nozzle. It is the only part that crosses the bloom threshold, it is small
   and it is steady.
3. Sparks fly back from the nozzles while NITRO burns.
4. Every skin (cyan laser, golden pulse, crimson dash, nebula ribbon) keeps its colour and signature motion.
5. Works on every selectable car, on Low, Medium and High, in portrait and landscape.

## Non-goals

- The default exhaust without a trail skin (`src/sprint-plume.ts`). Later, reusing the modules below.
- Screen-level speed cues: tail-light streaks, lens blur, FOV, speed lines.
- New skins, new Garage items, new settings.

## Anti-goals (a failure even if it looks good in a paused frame)

- Any glare or flicker regression. The limits in `.claude/rules/nitro-trail-vfx.md` and
  `.claude/rules/sprint-plume.md` hold; a guard is never widened to pass. One deliberate change is allowed and
  owned by the shader session: the nozzle core may exceed the bloom threshold, bounded by a stated maximum
  screen area and with no `time` term on its brightness.
- A normal-blended mesh in the plume, a new draw call that was not measured, a shader compiled mid-race.
- A frame-cost rise over the budget in `sprint-plume.md` (5% or 0.3 ms on a held NITRO).

## Approaches considered

| Approach | Trade-off | Verdict |
| --- | --- | --- |
| Mesh with panning baked textures (this design) | One small tileable texture; reads from any angle, including end-on from the chase camera; keeps the instanced tubes and uniforms | Chosen |
| Flipbook of a simulated flame on quads | Most realistic from the side, but the chase camera looks down the jet axis, where a card looks flat; a large atlas; frame changes at 24 fps over a large area | Rejected |
| Flame body made of GPU particles | Heavy additive overdraw centre-screen: the white-out the glare fixes removed | Rejected for the body; particles are used for sparks only |

## Shared contract

One home per piece. A session that needs something another session owns uses it through the contract and
never writes a second copy.

### Flame noise texture (owner: art session)

- Path: `public/feature-assets/nitro-flame/flame-noise.png`
- Outside `garage-vfx-skins/` on purpose (moved 2026-11-21, `docs/designs/sprint-tiers/DESIGN.md`): the locked
  production build removes that tree (`vite.config.js`, `scripts/assert-production-locked.mjs`), and the standard
  sprint exhaust (`src/sprint-plume.ts`), which ships in every release mode, samples the texture too. The locked
  bundle therefore ships it and requests it once, when the first exhaust is created (page load): 293,450 bytes,
  HTTP-cached, one mipmapped 512 x 512 upload. Until it arrives, and if it never does, the jets draw on the
  loader's neutral texel.
- 512 x 512, 8-bit RGB, linear data (not colour), no alpha, at most 300 KB.
- Tileable on both axes. V is the flow axis (the trail's length); U wraps around the tube.
- R: flame tongues. Large shapes stretched along V, full 0 to 1 range.
- G: fine turbulence for edge erosion and UV distortion, mean near 0.5.
- B: sparse hot filaments, mostly dark, for the streaks that race along the core.
- Built by a headless Blender script (`blender --background --python`), sources and script in
  `assets-src/nitro-flame/`, following the layout of the other `assets-src/` folders.

### Texture loader (owner: shader session)

- `src/nitro-flame-texture.ts` is the only code that names the texture path. Its importers are the NITRO trail
  (`src/garage-nitro-trail.js`) and the sprint exhaust (`src/sprint-plume.ts`); both hold the same uniform object.
- It returns a texture at once: a 1 x 1 neutral (128, 128, 128) `DataTexture` until the image arrives, then
  the image, with `RepeatWrapping`, mipmaps and no colour-space conversion. The shader must look acceptable on
  the neutral fallback, so a failed load is not a broken trail.
- The shader session never commits a file under `public/feature-assets/nitro-flame/`.

### Colour and power (existing homes)

- Skin colour: `src/garage-skin-palette.ts`. No second colour table.
- Light: `frame.lightPower`. Reach and travel speed: `frame.power` and the chain. Chained NITRO adds length
  and speed, never light.
- Calm (Reduced Motion or Comfortable) and VFX Off: no fast motion, no sparks.

### Sparks (owner: sparks session)

- Logic in a new `src/nitro-sparks.ts`; `src/effects.js` (389 of 400 lines) gets a call, not the logic.
- Drawn by the existing particle pool in `src/effects.js`: no new mesh, material or draw call.
- Emits from every rear port's world position, the same positions the existing nozzle gas uses.

### Files each session may edit

| Session | Branch | Files |
| --- | --- | --- |
| Art | `feature/nitro-flame-art` | `assets-src/nitro-flame/**`, `public/feature-assets/nitro-flame/**`, `tests/nitro-flame-asset.test.js` |
| Shader | `feature/nitro-flame-shader` | `src/garage-nitro-trail.js`, `src/nitro-flame-texture.ts`, `.claude/rules/nitro-trail-vfx.md`, `tests/nitro-trail-comfort.test.js`, `tests/garage-nitro-trail.test.js`, a new test for the loader |
| Sparks | `feature/nitro-flame-sparks` | `src/nitro-sparks.ts`, the call site in `src/effects.js`, `tests/nitro-sparks.test.js` |

Nobody edits `TODO.md`. Each session writes its evidence (commands run, observed numbers, anything not run)
to `docs/designs/nitro-flame/evidence-<art|shader|sparks>.md`; integration folds them into `TODO.md`.

## Acceptance (checked at integration, on the merged branch)

- `npm test`, `npm run typecheck`, `npm run build`, `node --test tests/module-size.test.js` pass.
- `tests/nitro-trail-comfort.test.js`, `tests/garage-nitro-trail.test.js`, `tests/shader-safety.test.js`,
  `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js` and
  `tests/sprint-plume-veil-browser.spec.js` (veil at most 80) pass.
- Frame cost of a held NITRO at 844 x 390 and 1440 x 900 on Low, Medium and High stays inside the budget
  (`tests/sprint-plume-cost-browser.spec.js`).
- Real WebGL captures of a live NITRO, each skin, both selectable cars, phone portrait and landscape, show
  tongues, the nozzle core and sparks, and no white wash over the car's rear.

## Left to the builders

Texture recipe, shader layering, how each skin maps onto the three channels, spark count, size and life per
quality tier, and the exact bound on the nozzle core's screen area.
