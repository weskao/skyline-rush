# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + Vite + Three.js, native JS modules. Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve: existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints,
browser support. Prefer small changes with deterministic unit tests + browser regression.

Detailed, file-scoped rules live in `.claude/rules/` and load only when their files are touched:
`unlock-separation` · `world-tour` · `performance-review` · `device-quality` · `track-showcase` · `touch-input`.

## Home-screen landmark showcase

Selecting a map on the home screen must show that map's signature landmark in the live 3D
preview, and roadside props or terrain must not hide it there or while racing toward it —
without thinning the street: blocking props move or shrink, never disappear. Every new map
ships the same way; placement, occlusion and test rules are in
`.claude/rules/track-showcase.md` ("Signature landmark").

## Solid obstacles and AI avoidance

Anything drawn on or over the road is solid for every car: the player gets a barrier hit,
rivals and traffic change lane around it ahead of time and return to their lane after it, and
no car is drawn passing through it on any map. An obstacle never takes so much road that a
stretch is impassable — at least two lanes stay open.

Every vehicle obeys the same collision physics as the player car: rivals and traffic use the
player's hitbox, hit props, barriers, Tokyo trains, hazards and each other, and get the same
`knock()` response (speed loss, sideways shove, 1.5 s grace). A ram hurts both cars. AI steers
around slower cars and the player before impact; traffic then recovers to cruise speed. Never
give one class of car a special-case pass-through. Rules are in `.claude/rules/world-tour.md`
("Solid props", "Shared collision physics").

## No shader compiles or NaN pixels mid-race

Every material a race can show is attached to the scene (hidden is fine) before racing starts, and
the visible-light count never changes within a track; `src/shader-warmup.js` draws it all once on
the first frame. A first-draw shader build flashes black on iPhone. One NaN texel in the scene
becomes a screen-sized black rectangle through the bloom blur: clamp uv-derived scalars before
`exp()`/`pow()` in every shader (MSAA extrapolates them past their range) and keep the bloom
high-pass guard. Rules and guard tests are in `.claude/rules/performance-review.md` ("Shaders
compile at first draw", "One NaN pixel is a black frame").

## Commands

| Command | Purpose |
| --- | --- |
| `make` / `make dev` | Vite dev server, saved progression respected |
| `make dev-unlocked` (= `make test-unlocked`) | Local-only all-unlocked server (not a test runner) |
| `make dev-feature <name>` | Worktree of `origin/feature/<name>`, all-unlocked, HTTPS localhost |
| `npm test` | Node unit tests |
| `npm run build` | Production build + release-bundle lock assertion |
| `npm run test:browser` | Playwright suite (pretest builds production assets) |
| `npm run test:layout` | Home-screen layout browser tests (pre-push hook runs it on UI pushes) |
| `make run` | Unit + browser tests |
| `make deploy` | Trigger CI GitHub Pages deploy of remote `main` |

## UI/UX changes: audio and music assessment

Whenever adding, redesigning, or modifying a UI element, screen, interaction, game mode,
or player feedback, **explicitly evaluate whether sound effects or music would improve
clarity, responsiveness, immersion, excitement, or accessibility**. Treat audio as part
of the UI/UX design review rather than an optional afterthought.

- Consider feedback for meaningful actions and state changes: selection/confirmation,
  countdowns, pickups, NITRO/FLY/BOOST, checkpoints, collisions, combos, warnings,
  achievements, victory/defeat, and entering or leaving a game mode.
- Consider whether a new game mode, scene, or major UI transition warrants distinct
  background music, an adaptive musical cue, or a change in music intensity.
- **If audio adds useful feedback, implement the sound effect and/or music together
  with the UI change in the same feature scope**, including appropriate tests.
  If audio would be distracting, redundant, inaccessible, or irrelevant (such as
  purely decorative changes), do not add it merely for consistency.
- Reuse the existing Web Audio system in `src/audio.js` and one-shot event logic
  in `src/mode-audio.js` where applicable. Keep sounds cohesive with the game's
  arcade-racing identity; avoid unnecessary assets, dependencies, and duplicate mixers.
- Respect separate music/SFX enablement and volume settings, mute, browser
  user-gesture/autoplay restrictions, reduced-sensory-load preferences, and
  desktop/mobile input. Never make sound the only indicator of important feedback.
- Prevent repeated cues on every frame, overlapping voice spam, stale sounds after
  pause/restart, and unwanted playback when audio is disabled or the page is hidden (iOS keeps
  a `'playback'` audio session running in the background; `sound.setHidden` suspends it).
- For relevant changes, verify the UI **and** its audio behavior with deterministic
  event tests (`tests/audio.test.js` / `tests/mode-audio.test.js`), and browser
  regression tests when the controls or interaction flow change. State briefly in
  the implementation summary whether audio was added or intentionally unnecessary.

## Verification

- Gameplay / progression / build-config change → `npm test` + `npm run build`.
- Rendering / navigation / controls / unlock visibility change → also `npm run test:browser`,
  desktop and mobile.
- Home-screen change (`src/App.vue`, `src/main.js`, `src/style.css`, `src/locales/`, `index.html`)
  → `npm run test:layout` before pushing; the `.githooks/pre-push` hook runs it on such pushes and
  blocks a red result (never bypass it with `SKIP_LAYOUT_GATE=1` to get a fix out — CI on `main`
  gates every release). The intro must fit without scrolling at
  ≥ 900 px tall desktops in en and zh-TW, stay below the 112 px top bar and keep 44 px touch
  targets. The height budget is fixed — a new block pays for itself by compacting another,
  never by letting the intro scroll, moving into the top bar or shrinking a button.
- Never delete or weaken tests to pass CI. Report any test you could not run.
- `README.md` changed → sync `README.zh-TW.md` via `scripts/readme-zh.mjs` (hooks enforce it).
- A commit on `main` is not a deploy; publication rules are in `.github/workflows/ci.yml`.

## Release

`/release` runs `scripts/release.sh`: `scripts/release-gate.sh` refuses to tag unless `main` equals
`origin/main`, that exact commit has a successful CI run on `main` (a running one is waited for) and
`npm test` + `npm run build` pass; only then does the shared release script commit, tag and publish.
A red or missing run means fix the root cause, commit, push, wait for green and run `/release` again —
never tag around the gate. The tag's CI run re-checks unit tests, confirms through `release-verified`
that the code already passed the full suite on `main`, and deploys, so a release is live within minutes
and a CI timing flake cannot leave a tag unpublished.

## Branch workflow

Commit and push to the current development branch. No PR, no merge into `main`, no deploy
unless the user explicitly asks.

## Home showroom camera contract

All existing and future tracks share the same six ready-screen camera views: drive,
front, rear, left, right and orbit. The selected camera must work without enabling
AIRFLOW or visual effects. The curated home landmark shot is the *drive* default
only; it must never override another selected view. Keep the camera source of
truth in `vfxSettings().view`, the view ordering in `SHOWCASE_VIEWS`, and
the geometry-independent camera offsets in `showcaseCameraPose()`.
The ready-screen camera dock and VFX menu must stay synchronized and localized.
Use the local tangent frame for 3D roads, honor reduced motion, and test all
`RACE_TRACKS` IDs plus an unknown future ID. Do not fork UI by map ID.
