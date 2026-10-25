# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + Vite + Three.js, native JS modules. Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve: existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints,
browser support. Prefer small changes with deterministic unit tests + browser regression.

Detailed, file-scoped rules live in `.claude/rules/` and load only when their files are touched:
`unlock-separation` · `world-tour` · `performance-review` · `device-quality` · `track-showcase` · `touch-input` · `vehicle-road-stability` · `ui-phase-interactions` · `ui-architecture` · `release-notes`.

## UI architecture: Vue panels, plain-JS game core

Simulation and rendering (`game.js`, `world.js`, effects, scenes) stay plain JS and never import
Vue. New event-driven UI — dialogs, panels, menus, settings — is a Vue component, not more
imperative DOM code in `src/main.js`; existing panels move to Vue one per commit. The in-race HUD
stays out of Vue reactivity: cache element refs once, write only changed values, no DOM queries
in the frame loop. `src/main.js` does not grow — a new feature gets its own module. Type safety
comes from JSDoc on exported functions and shared shapes, not `.ts` rewrites. Migration steps are
tracked in `TODO.md`; rules in `.claude/rules/ui-architecture.md`.

## Mandatory regression-first workflow (every feature and bug fix)

**Always follow `docs/regression-first-workflow.md`** before calling work complete:
read the relevant rules and trace the shared root cause; reproduce with a failing
test and observe RED; implement the minimal fix and observe GREEN; regression-check
all affected tracks, vehicles, locales and inputs; run `make verify`; inspect
real-game/WebGL and touch screenshots where behavior or rendering changed; then
inspect the **full GitHub CI `quality-gate` for the exact HEAD commit**.
Use `TODO.md` to track evidence. CI, manual visual confirmation and historical
RED evidence are distinct gates — never claim one proves the others.

Only mark the branch **merge-ready** when the latest `main` has been integrated,
all required checks are green and the user-visible symptoms have been retested.
Do not merge into `main`, create a PR or deploy without explicit user approval.
Direct pushes cannot be prevented by Markdown; branch rulesets are required for
server-enforced status protection.

## Tutorial driving: player control authority

Tutorial steps must **observe and validate player actions, never take control of the car**.
The tutorial is a safe practice environment, not an autopilot.

- Never inject steering, lane-centering or lane-assist movement without the player's explicit intent. Neutral steering input must not cause lateral movement on its own.
- Initialize the car's position and steering only when a practice session begins (or when recovery from the end of the track requires it). Do **not** reset lateral position or steering when advancing to a new lesson.
- Preserve continuous movement and the normal steering ramp across lesson transitions and after releasing a direction. Do not teleport, snap to center or override opposite-direction input.
- Players may freely steer left or right, brake, accelerate, fly and use the available controls during any lesson. The current lesson determines **what counts as completion**, not which other controls are allowed.
- Keep tutorial-specific input overrides separate from normal-race assistance, and do not change ordinary race-control behavior to solve a tutorial-only bug.
- Follow RED → GREEN → REFACTOR for every tutorial/control change. Include regression tests for neutral input, opposite-direction steering, released steering, step-transition continuity and completing all lessons.
- Test real keyboard and mobile touch input in the browser, including pause/resume and lesson transitions, before claiming the change verified. Run the project's required unit, build, browser and CI gates; report any test that could not be run.

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

## Vehicle stability and road contact — every track

Always use the same road centreline and tangent/right/up frame for road geometry,
vehicle placement and orientation. On curved, banked or elevated tracks, compose steering
lean, drift, flight pitch and stunt rolls **relative to** the road-aligned quaternion
(`orientCarOnRoad` in `src/vehicle-pose.js`); never overwrite its Euler X/Z angles.
A vehicle must remain correctly aligned with the visible surface: verify the wheels and
body, not only the mesh origin, even when turning close to either road edge.

Continuous rail contact must not re-trigger a hard collision when the 1.5 s cooldown
expires; the next collision is armed only after separation. Do not mask broken geometry
or physics with arbitrary car-height offsets, smoothing, camera tricks or per-track patches.
Fix shared root causes, then regression-check **Sky Spiral, all four legacy tracks and all
five World Tour tracks**, including AI cars, ghost, ramps and airborne maneuvers.
Full scoped rules and exact TDD / WebGL verification requirements:
`.claude/rules/vehicle-road-stability.md`.

## Controls stay clickable after every race

Finish/pause/restart overlays must **never intercept** clicks on the global language
picker, topbar camera/restart or visible Next/Race Again buttons. A later DOM sibling
at the same z-index can cover earlier controls even when they still look enabled.
Check stacking contexts, native modal dialogs, stale inert/pointer capture and
animation state before touching handlers. Regression-test **real pointer clicks**
after steering and repeated impacts on Tokyo and the other routes, desktop and
mobile, and verify both Next and Race Again transition correctly. See
`.claude/rules/ui-phase-interactions.md`; report runtime errors and unrun tests.

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
| `make verify` | Full local regression gate: unit, build, browser, World Tour long-run |
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

## Player-facing release announcement writing

Every What's New announcement and release note shown **inside the game** must be written
from the player's point of view in **plain, inviting language**. Describe what players
can now do, see, discover or enjoy, and why the change matters to them. Do not expose
implementation details or developer jargon such as CI, TDD, Firestore, shader, refactor,
schema, internal file names or framework names. Replace technical labels with everyday
benefits (e.g. "Other cars react more naturally when bumped", not "Unified AI collision
physics"). Write and review **both English and Traditional Chinese (zh-TW)** copy together,
with native-sounding wording rather than word-for-word translation. Show only features
that genuinely shipped in the announced version; never present a mockup or roadmap item
as released. Images are optional and must match the shipped content; always provide
readable text when an image is missing. Follow `docs/release-announcements.md`.

**Every release ships its What's New notes.** Before publishing a version, add its entry at the top
of `RELEASE_NOTES` in `src/release-notes.js` (en + zh-TW, player-first). Add an image only when it
makes the change easier to grasp; store it under `public/whats-new/<version>/` and keep every older
release's entry and images in the repo — the dialog shows only the newest five versions, the rest
stay archived. Leave out what players never need: fine tuning details, code structure or refactors,
tests and tooling, back-office, admin or server setup, and anything sensitive (links, accounts, keys,
unannounced plans). Then run `/review-release-notes <version>`: an automatic copy check, a fresh-eyes
sub-agent review and your approval record the copy's fingerprint. `scripts/release-gate.sh` runs
`scripts/check-release-notes.mjs <version>` and refuses a release whose entry is incomplete, fails the
copy check, was never reviewed or changed after review; never bypass it.

## Verification

- Gameplay / progression / build-config change → `npm test` + `npm run build`.
- Rendering / navigation / controls / unlock visibility change → also `npm run test:browser`,
  desktop and mobile.
- Road, car pose, collision or steering change → follow `vehicle-road-stability.md`: TDD
  RED→GREEN, all-track coverage, frame-rate and road-clearance checks, plus real WebGL
  capture where clipping or jitter was reported. Record unrun checks as pending.
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

- All feature branches (except the explicitly disabled MODE-00 branch) run the same remote CI;
  the `quality-gate` job requires unit, browser, cloud-save and World Tour checks to
  succeed. A successful run on a previous commit does **not** validate the new HEAD.
- CI runs and optional screenshot artifacts are evidence for review, not substitutes
  for real vehicle/road contact or manual interaction testing on devices.

## Release

`/release` (project command `.claude/commands/release.md`) first checks the version's What's New notes
and, when they are new or changed, runs `/review-release-notes` and commits the approved review — before
any test run, intro or release write. It then runs `scripts/release.sh`: `scripts/release-gate.sh`
re-checks the notes, then refuses to tag unless `main` equals
`origin/main`, that exact commit has a successful CI run on `main` (a running one is waited for) and
`npm test` + `npm run build` pass; only then does the shared release script commit, tag and publish.
A red or missing run means fix the root cause, commit, push, wait for green and run `/release` again —
never tag around the gate. The tag's CI run re-checks unit tests, confirms through `release-verified`
that the code already passed the full suite on `main`, and deploys, so a release is live within minutes
and a CI timing flake cannot leave a tag unpublished.

## Branch workflow

Commit and push to the current development branch. No PR, no merge into `main`, no deploy
unless the user explicitly asks.

## Ready-screen floating controls: responsive spacing

The home showcase camera dock and the single Start button are one layout group
when AIRFLOW is active. Keep a visible vertical gap (at least 18 CSS px) in
desktop, phone portrait and short landscape viewports; do not use unrelated
fixed `bottom` offsets for these two controls. Share the Start baseline and
height budget through CSS variables, account for safe-area insets and alternate
mobile button heights, and allow short landscape to move the dock above the
bottom cluster. Do not block or move the showcased car to hide UI collisions.
Extend `tests/showcase-camera-browser.spec.js` with real bounding-box gap
assertions across viewport sizes and both locales, and use actual clicks on
camera controls and Start. Include the normal ready screen, AIRFLOW mode and
safe-area cases before considering future ready-screen overlays done.

## Home showroom camera contract

All existing and future tracks share the same six ready-screen camera views: drive,
front, rear, left, right and orbit. The selected camera must work without enabling
AIRFLOW or visual effects. The curated home landmark shot is the *drive* default
only; it must never override another selected view. Keep the camera source of
truth in `vfxSettings().view`, the view ordering in `SHOWCASE_VIEWS`, and
the geometry-independent camera offsets in `showcaseCameraPose()`.
The ready-screen camera dock and VFX menu must stay synchronized and localized.
On World Tour roads, an in-frame projected car may still be blocked by foreground
facades or mountains. Sample actual car body visibility against opaque scenery;
when blocked, gently dolly/shift the camera in the local road frame, preserving
the curated landmark target and keeping the live WebGL car fully visible. Keep
occlusion tests outside the frame loop; never hide scenery or weaken QA.
Use the local tangent frame for 3D roads, honor reduced motion, and test all
`RACE_TRACKS` IDs plus an unknown future ID. AIRFLOW on puts the preview player
at road altitude 0 with hover jets off on every existing or future track, even
when `HERO_PREVIEWS` supplies a landmark camera. AIRFLOW off keeps the original
airborne hero; all six camera views must work in both states. Do not fork UI or
vehicle pose by map ID.

### Complete car framing on home previews

Never treat a visible car center, projected body width or five unobstructed
sample points as proof that the entire vehicle is visible. Check the projected
full 3D model bounds **including wheels, nose, tail and wings** against the
actual canvas aspect ratio with safety margins on all home showcase tracks.
A high landmark-directed look target (notably on Alpine Rail Pass) can crop
the car at the bottom while older occlusion checks still pass. Keep
the landmark shot and road frame, apply the smallest shared camera
reframing necessary and never shrink or hide the car or remove scenery.
Test AIRFLOW on/off at desktop 1440×900, ultrawide 1777×863 and
portrait 390×844, across all existing tracks, as well as all six angles.
Extend the same regression whenever a new track is added; do not add
track-specific clipping workarounds.
