---
paths:
  - "src/audio.js"
  - "src/audio-ui.ts"
  - "src/audio-settings.ts"
  - "src/user-activation.ts"
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
- **One failed `resume()` was final.** `update()` retries at most once a second while sound or music
  is on, the page is visible, the context is not running and the page has had a gesture
  (`navigator.userActivation.hasBeenActive`, so no pre-gesture console warnings). Per-frame: no
  allocations, no promises awaited.
- **Auto-unlock wrote storage.** `unlockAudio` re-applied the saved choice with `setAudio(..., false)`;
  only a player's toggle or slider release saves. An engine that failed to start must never turn the
  saved setting off for later visits. Guard: `tests/audio-ui.test.js`.

## Rules

- The prelude only queues the shared intro (song `intro` or no race yet). A song change calls
  `cutMusic()` (stops notes queued after now, resets `nextStep`) so the race song starts at once and
  never overlaps the prelude. Muting cuts the bus to 0 and drops queued notes immediately.
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
