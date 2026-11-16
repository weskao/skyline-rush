---
paths:
  - "src/race-halfway.ts"
  - "src/RaceHalfway.vue"
  - "src/presentation.ts"
  - "src/race-audio-events.ts"
  - "src/feedback-sounds.ts"
  - "tests/race-halfway*.spec.js"
---

# Race halfway announcement

Keep the halfway milestone in the shared race presentation. The same transition drives the
center-screen card and the SFX cue. The peripheral reward queue may delay or drop its own
messages without delaying the halfway cue. New finite courses inherit this behavior through
the standard race loop.

CourseGraph shortcuts use their position projected onto the main route to decide when
halfway is crossed. The remaining distance uses the active edge and the shortest way to
FINISH. Circuits use the distance across all selected laps. Endless modes have no halfway.
Recovery, pausing and resuming must not announce the same race twice. Use elapsed frame time
for the cue duration so the physics step cap cannot leave a notice on screen during slow draws.

## Never cover the road ahead

The cue sits at the scene centre, right over the road the player is steering toward. The first
version was a boxed two-line card with a gradient fill and glow, 19.5% of the scene height on
desktop and 13% in portrait, and it hid the road for 2 s. Keep it one slim, see-through pill
strip: "50%" chip, title, short remaining distance (zh-TW `剩 {km} 公里`) on one line.

- Under 10% of the scene height and 4% of its area; background alpha at most .6; no box-shadow
  glow or fill animation; `pointer-events: none`. Comfort, VFX off and reduced motion drop the
  entrance animation.
- The chime is a short rising stinger of 0.4 s or less: it ducks the mix, so a longer cue mutes
  the engine and music for longer.
- Every map gets the same strip, Coming Soon courses included. A new course or track must
  pass the every-map sweep without spec edits (`CLASSIC_IDS` + `COURSE_TRACKS`).

Guards: `tests/presentation.test.js`, `tests/race-audio-events.test.js`, `tests/audio.test.js`
(chime length), `tests/race-halfway-browser.spec.js` (geometry, alpha, one chime; desktop,
portrait, landscape) and `tests/race-halfway-maps-browser.spec.js` (every map).
