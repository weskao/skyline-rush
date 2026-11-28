---
paths:
  - "src/audio.js"
  - "src/audio-context-health.ts"
  - "src/audio-page-lifecycle.ts"
  - "src/audio-ui.ts"
  - "src/audio-settings.ts"
  - "src/startup-audio.ts"
  - "src/user-activation.ts"
  - "src/result-audio.ts"
  - "src/feedback-sounds.ts"
  - "src/mode-audio.ts"
  - "tests/audio*.test.js"
  - "tests/music-*-browser.spec.js"
  - "tests/helpers/music-probe.js"
---

# Music plays when the setting says it does

Trap (2026-11-14): with music on, players heard nothing until something unrelated happened. Four
separate causes, each now removed in `src/audio.js` / `src/audio-ui.ts`:

- **Music waited for the 3D world.** Notes were only scheduled from `update()`, called by the frame
  loop, so nothing sounded until `createWorld` and the shader warm-up frame finished (781 ms desktop,
  3.9 s at 6x CPU throttle). `prelude()` now queues 8 s of the intro (`PRELUDE`) as soon as music is
  on, before the world exists; `update()` continues from the same `nextStep`. Never move music
  scheduling back behind the frame loop. Guard: `tests/music-autoplay-browser.spec.js`.
- **`open()` trusted a cached `hidden` flag.** A page shown again without `visibilitychange` (bfcache,
  app switch, iOS home-screen apps) kept the flag `true`, so every tap rebuilt or re-suspended the
  context. Read live `document.hidden` (`pageHidden()`), and resync on `pageshow` and `focus`.
  Guards: `tests/audio.test.js` (live hidden), `tests/music-gesture-browser.spec.js` (B repro).
- **One failed `resume()` was final.** Retry at most once a second while sound or music is on, the
  page is visible, and the page has had a gesture (`navigator.userActivation.hasBeenActive`). If
  the browser exposes an interrupted `AudioSession`, automatic retries wait for the OS to release
  it. Read live visibility again before completing a delayed recovery. Per-frame: no allocations,
  no promises awaited on the healthy path.
- **A system interruption can leave a frozen clock with state `running`.** Sample
  `AudioContext.currentTime` during visible frames and check it on gestures. If it stops advancing,
  try a single suspend/resume cycle, then reuse the gesture-only rebuild if the same context stays
  stuck. Keep the current race song, mixer settings and 1 s rebuild guard. Guards:
  `tests/audio.test.js`, `tests/music-gesture-browser.spec.js`.
- **Returning to the page may omit a visibility event.** Startup and the game share handling for
  `visibilitychange`, `pagehide`/`pageshow`, `freeze`/`resume`, and `focus`.
- **Auto-unlock can fail temporarily.** The switches retain the player's preferences so later taps
  still retry; only a player's toggle or slider release writes to storage. Guard: `tests/audio-ui.test.js`.

## Rules

- The prelude only queues the shared intro (song `intro` or no race yet). A song change calls
  `cutMusic()` (stops notes queued after now, resets `nextStep`) so the race song starts at once and
  never overlaps the prelude. Muting cuts the bus to 0 and drops queued notes immediately.
- **A unit-test mock `AudioContext` freezes wall time with its clock.** Its `currentTime` never moves, so
  500 ms of real time (`CLOCK_STALL_MS`, `src/audio-context-health.ts`) reads as a stalled clock and every
  later cue is dropped. Trap (2026-11-28, pre-push): synthesizing the car-hero buffer took 521 ms under the
  full suite and `equip-confirmed` played nothing. `installAudio` (`tests/audio.test.js`) pins
  `performance.now` unless the test already mocks it; a new mock harness does the same. Guard: *the mock
  audio clock never reads as stalled on a slow runner*.
- Music-note tests count only notes that were not cancelled (`stopped !== undefined` in the mock):
  `cutMusic()` stops queued notes without a time.
- **Playwright counts as a user gesture.** `page.evaluate`, locator assertions and `locator.click()`'s
  actionability checks give the page sticky activation, so the resume retry can legitimately start
  audio before the "first tap". Specs about blocked autoplay read the page through a CDP
  `Runtime.evaluate` with `userGesture: false` and tap with `page.mouse` until the tap under test.
- The VITE_DIAG snapshot carries `sound.diagnostics()` (context state, hidden flag, `document.hidden`,
  musicOn, currentTime); keep it inside `if (import.meta.env.VITE_DIAG)`.
- Preserve: per-course race songs, the shared intro on home selection, suspend on page hidden, iOS
  silent-switch playback (`navigator.audioSession.type = 'playback'`), the 1 s iOS rebuild guard.

## Traps another game hit (Eclipse Survivors, 2026-11-28)

Audited against this engine on 2026-11-28. None reproduces here today; each says why, and what
change would bring it back.

- **Pending resume blocking recovery.** Touch/pen activation is granted on `pointerup`/`touchend`, not
  `pointerdown`. `onUserActivation` also fires on touch `pointerdown`, but that is harmless here: the
  engine never waits on a pending `resume()`, and the gesture-only rebuild happens on the `pointerup`
  that follows (guard: *a tap rebuilds a context iOS left suspended*). If a "resume pending" gate is
  ever added, do not start it on touch/pen `pointerdown`.
- **Restarting healthy media on a suspended context.** All music is Web Audio synthesis today. If an
  `HTMLMediaElement` or decoded sample is added for music, a suspended or newly created `AudioContext`
  alone must never pause, seek or restart it. Keep a live source through a suspend, because its clock
  freezes with the context. Stop it only on close, mute or a real song change.
- **An unlock prompt swallowing its own click.** `#startup-music` has no click action and the app is
  `inert` behind the startup screen, so hiding it on unlock retargets nothing. A future unlock button
  that triggers navigation and removes itself must recover from its completed `click` only.
- **Failure/result sound that phone speakers cannot play.** Eclipse's defeat music was a 27–196 Hz pure
  sine and sounded silent while victory was audible. Here both outcomes return to the shared `intro`
  song. `mode-failed` sits at 205–400 Hz, and `victory` at 392 Hz and up. Keep most energy of every
  result or failure cue and song above 200 Hz. Never move a failure cue into the bass to make it sound
  sadder.
