---
paths:
  - "src/race-halfway.ts"
  - "src/RaceHalfway.vue"
  - "src/presentation.ts"
  - "src/race-audio-events.ts"
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

Guards: `tests/presentation.test.js`, `tests/race-audio-events.test.js` and
`tests/race-halfway-browser.spec.js`.
