---
paths:
  - "src/input.js"
  - "src/slide-pad.js"
  - "src/style.css"
  - "tests/input.test.js"
  - "src/track-swipe.js"
  - "tests/track-swipe-browser.spec.js"
---

# Touch input survives a lost release

WebKit (iPhone Safari and Chrome) withholds `pointerup` / `pointercancel` for a touch that began as
the back/forward edge swipe (WebKit bugs 136531, 239014). A pointer that holds steering with no release
pins the car to one wall for the rest of the race.

- No touch pointer may hold a control forever: the newest finger on the slide pad or on a touch button
  takes it over from any pointer still holding it (`bindSlidePad`, `bindButton` in `src/input.js`;
  the `padTouch` mirror in `src/main.js` follows the same rule).
- The slide pad keeps 20 px clear of the side edges (`.touch-pad` in `src/style.css`), so a steer
  cannot start inside the edge-swipe zone. Guards: `tests/input.test.js` (stuck-pointer takeover)
  and the pad geometry tests in `tests/browser.spec.js`.
- Never cure a stuck pointer with a timeout: a thumb held still is legitimate input.

## Trackpad gestures are timed on the input's own clock

A home-preview trackpad swipe (wheel handler in `src/main.js`) is one gesture until its events' own
`event.timeStamp` shows a `WHEEL_END_MS` pause. Never end or reset a gesture with a wall-clock timer, and
never widen the window to absorb lag: late delivery (a slow frame, a CI round trip) then splits one swipe
into two tracks, or resets a half-finished drag. A timer may only spring the preview back. Browser tests
send wheel input through `trackpadSwipe` (dispatched `WheelEvent`, pinned CSS-pixel delta, fixed 16 ms
`timeStamp`), never through `page.mouse.wheel` or CDP `mouseWheel`: those stamp on delivery and scale deltas
per runner (Linux CI made a 40 px nudge a full swipe). Guards: both trackpad tests in
`tests/track-swipe-browser.spec.js`.
