# UI change checklist: audio, quality tiers, touch and clickability

Read before adding, redesigning or modifying any UI element, screen, overlay, interaction or player feedback. Scoped rules: `.claude/rules/touch-input.md`, `.claude/rules/ui-phase-interactions.md`, `.claude/rules/device-quality.md`.

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
- Reuse the existing Web Audio system in `src/audio.js` (synthesis and mix), race event
  detection in `src/race-audio-events.ts`, songs in `src/music-tracks.ts` and one-shot mode
  events in `src/mode-audio.ts` where applicable. Keep sounds cohesive with the game's
  arcade-racing identity; avoid unnecessary assets, dependencies, and duplicate mixers.
- Respect separate music/SFX enablement and volume settings, mute, browser
  user-gesture/autoplay restrictions, reduced-sensory-load preferences, and
  desktop/mobile input. Never make sound the only indicator of important feedback.
- Prevent repeated cues on every frame, overlapping voice spam, stale sounds after
  pause/restart, and unwanted playback when audio is disabled or the page is hidden (iOS keeps
  a `'playback'` audio session running in the background; `sound.setHidden` suspends it).
- For relevant changes, verify the UI **and** its audio behavior with deterministic
  event tests (`tests/audio.test.js` / `tests/race-audio-events.test.js` /
  `tests/mode-audio.test.js`), and browser
  regression tests when the controls or interaction flow change. State briefly in
  the implementation summary whether audio was added or intentionally unnecessary.

## UI changes: Low / Medium / High quality presentation

For every UI change, decide whether its presentation must differ by the saved visual Quality
tier (Low / Medium / High) and say so in the implementation summary.

- **3D-rendered UI is where quality matters.** Anything drawn through the Three.js scene or
  post-processing — the home showcase preview, in-race HUD effects, camera transitions,
  particle/glow/bloom accents, animated backdrops behind panels — costs GPU per frame and must
  define a presentation per tier (e.g. fewer instances, simpler material, no bloom pass at Low).
  Perceived intent stays the same at every tier; only the cost changes.
- **Cheap DOM UI ignores quality tiers.** Dialogs, menus, settings panels, lists, text, static
  images and plain CSS transitions render the same at Low, Medium and High. Do not add quality
  branches, settings or tests for them.
- **Borderline cases are measured, not guessed**: a CSS `backdrop-filter`, large box-shadows,
  or a long-running CSS animation layered over the live canvas counts as 3D-adjacent when it
  measurably raises frame time on the Low tier; otherwise treat it as cheap DOM UI.
- Read the tier from the existing Quality setting (`src/vfx-settings.js`, `src/device-quality.js`);
  never add a second quality source or fork by device/OS. Changing tier at runtime must apply
  without a reload, following the cache-invalidation rules in `docs/rendering-performance.md`.

## iPhone long-press and game touch behavior

The iOS magnifier loupe may appear even with `user-select: none`. Install the shared
`src/ios-touch-guard.ts` from `src/input.ts` to cancel one-finger `touchstart` only
on **noninteractive, non-scrollable** game surfaces. Do not blanket-cancel document
touch events: native buttons, links, labels, forms, focusable widgets and scrollable
Settings/History/Garage/Guide content must retain synthesized clicks and scrolling.
Leave multi-touch/pinch and accessibility behavior intact. Driving buttons and the
slide pad keep their existing dedicated touch guard.

Any new mobile surface must be covered by `tests/ios-touch-guard.test.js` and
`tests/ios-touch-guard-browser.spec.js`; verify actual iPhone Safari/Chrome
long-press, taps, scroll, and controls in the ready, racing, paused and results
phases before claiming physical-device acceptance. CSS alone is not sufficient.

## Controls stay clickable after every race

Finish/pause/restart overlays must **never intercept** clicks on the global language
picker, topbar camera/restart or visible Next/Race Again buttons. A later DOM sibling
at the same z-index can cover earlier controls even when they still look enabled.
Check stacking contexts, native modal dialogs, stale inert/pointer capture and
animation state before touching handlers. Regression-test **real pointer clicks**
after steering and repeated impacts on Tokyo and the other routes, desktop and
mobile, and verify both Next and Race Again transition correctly. See
`.claude/rules/ui-phase-interactions.md`; report runtime errors and unrun tests.
