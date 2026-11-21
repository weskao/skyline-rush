# Sprint tiers: BOOST, NITRO and both together, across UI, screen and exhaust

Status: approved direction (2026-11-21). Built by parallel sessions, integrated on
`feature/nitro-realistic-flame`. Companion to `docs/designs/nitro-flame/DESIGN.md`.

## Why

NITRO is the faster sprint (cap +30 m/s, +40 m/s² against BOOST's +14 m/s, +12 m/s²,
`src/drive-rules.ts`), but the game shows the two almost alike:

- Screen layer: `frame.power = max(nitro, boost * 0.8)` (`src/vfx-settings.ts`). FOV, radial blur and
  speed lines share one formula, so BOOST is NITRO at 80%.
- HUD: with both running, the speed caption still says BOOST ENGAGED while the flight state says NITRO
  ACTIVE; both touch buttons burn the same full-height flame on the same 0.7 s loop.
- Exhaust: the default jet (`src/sprint-plume.ts`) is pure `sin`/`cos` maths. The four thruster skins differ
  by one stripe formula each.
- Garage: the showroom preview always runs BOOST and NITRO together (`src/garage-stage.ts`), so a player
  cannot see what a thruster looks like on BOOST alone.

## Decisions (the user's, 2026-11-21)

1. **Tiers are layered.** BOOST < NITRO < NITRO + BOOST, then the existing NITRO chain (x2, x3) on top.
   Each step up must be visible in every layer that shows a sprint.
2. **Both together is its own combined look**, not two looks stacked and not NITRO hiding BOOST. It is
   honest: holding BOOST during NITRO adds 12 m/s² of acceleration, the top speed stays NITRO's.
3. **Scope:** Garage thruster UI, in-race HUD and touch buttons, camera and screen layer, and the 3D
   exhaust of all four thruster skins (Standard, Ion, Plasma helix, Void pulse).
4. **Future effects come for free.** A new thruster skin or a new tier is one row of data. No consumer
   grows a new branch for it.

## Shared contract

One home per piece. A session that needs something another session owns uses it through the contract and
never writes a second copy.

### The ladder: `src/sprint-tier.ts` (already on this branch, with `tests/sprint-tier.test.js`)

- `sprintTier(nitro, boost)` returns `'idle' | 'boost' | 'nitro' | 'nitro-boost'`.
- `SPRINT_TIERS[id]` holds `level` (0 to 3) and `share` (screen-layer strength, 0 to 1, before the chain
  lift). The values on this branch reproduce today's behaviour.
- Only the screen session changes numbers or adds fields in this file. Everyone else imports it and reads
  `id` and `level`. Nobody re-derives the tier from `nitroTime` and `boosting` in a second place.
- The NITRO chain stays where it is (`NITRO_CHAIN_LIFT`, `car.nitroBurst`): it scales reach and speed
  cues, never light.

### DOM state (owner: HUD session)

- `document.body.dataset.sprintTier` holds the tier id while racing and is removed otherwise. CSS reads
  `body[data-sprint-tier="…"]`.
- The classes `boosting`, `boost-draining` and `nitro-active` keep their meaning: tests and other CSS use
  them.
- The charge bar keeps draining in the BOOST colour during the combined tier: it is information.

### Colour (existing homes)

- `--nitro`, `--boost`, `--fly` and their `-text`, `-deep` variants on `:root` in `src/style.css`. The
  combined look is built from the two with `color-mix` or by layering (gold core, red-orange rim); it adds
  no token and no literal colour. Guard: `tests/sprint-color-tokens.test.js`.
- 3D skin colour: `src/garage-skin-palette.ts`. No second table.

### Flame texture and loader (from the NITRO flame work)

- `src/nitro-flame-texture.ts` is the only code that names the flame texture. The exhaust session reuses
  it and its channel layout (R tongues, G turbulence, B filaments); it does not bake or load a second one.
- The texture sits under `public/feature-assets/garage-vfx-skins/`, which the locked production build
  deletes. The Standard thruster is what every player has, so the exhaust session moves the texture to a
  path the locked build ships and updates the loader, the bake script, the asset test and
  `docs/designs/nitro-flame/DESIGN.md` together. Until the image arrives the loader's neutral 1 x 1
  fallback must still look acceptable.

### Limits that never move

`.claude/rules/sprint-plume.md`, `.claude/rules/nitro-trail-vfx.md`, `.claude/rules/race-camera.md`,
`.claude/rules/touch-sprint-buttons.md`, `.claude/rules/vehicle-lighting.md` and
`.claude/rules/performance-review.md` hold. A guard is never widened to pass. Reduced Motion,
Comfortable mode, VFX Off and forced colours keep their fallbacks. No shader compiles mid-race. No module
goes over its line ceiling.

## Files each session may edit

| Session | Branch | Files |
| --- | --- | --- |
| Screen | `feature/sprint-tier-screen` | `src/sprint-tier.ts`, `src/vfx-settings.ts`, `src/lens-pass.ts`, `src/race-camera.ts`, the sprint lines of `src/world.js`, the airflow `power` line of `src/aero-vfx.js`, `.claude/rules/race-camera.md`, their tests |
| HUD | `feature/sprint-tier-hud` | `src/race-hud.ts`, `src/sprint-ready-feedback.ts`, `src/nitro-readiness.ts`, `src/touch-sprint-buttons.css`, the sprint HUD rules of `src/style.css`, HUD keys in `src/locales/`, `.claude/rules/touch-sprint-buttons.md`, their tests |
| Exhaust | `feature/thruster-flame` | `src/sprint-plume.ts`, `src/board-effects.ts`, `src/thruster-glow.ts`, `src/nitro-flame-texture.ts`, the jet lines of `src/aero-vfx.js`, `assets-src/nitro-flame/**`, the texture's new home, `.claude/rules/sprint-plume.md`, their tests |
| Garage | `feature/garage-thruster-ui` | `src/GarageSkinCatalog.vue`, `src/GarageSkinComingSoon.vue`, `src/garage-skin-catalog.ts`, `src/garage-stage.ts`, `src/garage-*.css`, Garage keys in `src/locales/`, thruster card art, `docs/designs/garage-vfx-skins/GARAGE-COLLECTION-UX.md`, their tests |
| NITRO acceptance | `feature/nitro-flame-acceptance` | `src/garage-nitro-trail.js`, `.claude/rules/nitro-trail-vfx.md`, `TODO.md`, their tests |

`src/aero-vfx.js` (379 of 400 lines) has two editors on different lines: Screen may add at most 3 lines,
Exhaust at most 6. `src/locales/` has two editors on different keys. Only the acceptance session edits
`TODO.md`; every other session writes `docs/designs/sprint-tiers/evidence-<session>.md` (commands run,
observed numbers, capture paths outside the repo, every check not run).

## Acceptance (checked at integration, on the merged branch)

- `npm test`, `npm run typecheck`, `npm run build`, `node --test tests/module-size.test.js` pass.
- One held BOOST, one NITRO, NITRO with BOOST held and a x3 chain are told apart at a glance in real
  WebGL captures on a phone in portrait and landscape and on desktop: the exhaust, the screen layer, the
  HUD and the touch buttons each step up.
- The Garage shows each thruster on every selectable car and lets the player see BOOST, NITRO and both.
- Glare, flicker, veil, frame-cost, camera and shader warm-up guards pass unchanged.
- en and zh-TW, Reduced Motion and Comfortable mode checked.
