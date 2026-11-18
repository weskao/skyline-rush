---
paths:
  - "src/input.ts"
  - "src/ios-touch-guard.ts"
  - "tests/ios-touch-guard.test.js"
  - "tests/ios-touch-guard-browser.spec.js"
  - "src/slide-pad.ts"
  - "src/touch-controls-ui.ts"
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
  takes it over from any pointer still holding it (`bindSlidePad`, `bindButton` in `src/input.ts`;
  the pad feedback in `src/touch-controls-ui.ts` reads the same state).
- The slide pad keeps 20 px clear of the side edges (`.touch-pad` in `src/style.css`), so a steer
  cannot start inside the edge-swipe zone. Guards: `tests/input.test.js` (stuck-pointer takeover)
  and the pad geometry tests in `tests/browser.spec.js`.
- Never cure a stuck pointer with a timeout: a thumb held still is legitimate input.

## Driving thumbs

- Slide-pad braking checks total downward travel and direction against the original touch-down point.
  The floating steering center must only affect steer. After braking engages, keep it steady through
  sideways drift and small vertical tremors. The HUD reads the input state directly. Guards:
  `tests/slide-pad.test.js` and the slide-control cases in `tests/browser.spec.js`.
- Hit-test both steering buttons on movement because pointer capture keeps sending events to the
  first button. Release steer in the gap and outside both arrows. BRAKE belongs to the opposite
  thumb and requires its own touch. Guards: `tests/input.test.js` and `tests/browser.spec.js`.

## Trackpad gestures are timed on the input's own clock

A home-preview trackpad swipe (wheel handler in `src/main.js`) is one gesture until its events' own
`event.timeStamp` shows a `WHEEL_END_MS` pause. Never end or reset a gesture with a wall-clock timer, and
never widen the window to absorb lag: late delivery (a slow frame, a CI round trip) then splits one swipe
into two tracks, or resets a half-finished drag. A timer may only spring the preview back. Browser tests
send wheel input through `trackpadSwipe` (dispatched `WheelEvent`, pinned CSS-pixel delta, fixed 16 ms
`timeStamp`), never through `page.mouse.wheel` or CDP `mouseWheel`: those stamp on delivery and scale deltas
per runner (Linux CI made a 40 px nudge a full swipe). Guards: both trackpad tests in
`tests/track-swipe-browser.spec.js`.

## iOS long-press loupe without breaking the UI

The iOS magnifier loupe may appear even with `user-select: none`. Install the shared `installGameTouchGuard`
(`src/ios-touch-guard.ts`) from `src/input.ts` to cancel one-finger `touchstart` only
on **noninteractive, non-scrollable** game surfaces. Do not blanket-cancel document
touch events: native buttons, links, labels, forms, focusable widgets and scrollable
Settings/History/Garage/Guide content must retain synthesized clicks and scrolling.
Leave multi-touch/pinch and accessibility behavior intact. Driving buttons and the
slide pad keep their existing dedicated touch guard.

Any new mobile surface must be covered by `tests/ios-touch-guard.test.js` and
`tests/ios-touch-guard-browser.spec.js`; verify actual iPhone Safari/Chrome
long-press, taps, scroll, and controls in the ready, racing, paused and results
phases before claiming physical-device acceptance. CSS alone is not sufficient.

## Touch layout editor rotation

Bind each layout drag to its starting orientation. Commit on pointer-up in that orientation. Rotation, capture loss and pointer cancellation restore the last saved layout. The editor must continue displaying the current orientation and keep its peer layout intact. Guard: `tests/controls-preview-browser.spec.js`.

## Space on a focused button is the button's, not FLY

The keydown handler in `src/input.ts` leaves Space to a focused `button`/`summary` so keyboard users keep
native activation. A mouse click focuses the button too: AIRFLOW stayed focused after a click, so Space
toggled it instead of flying. Every always-visible HUD button container (`.toolbar`, `.aero-tools`) blurs a
pointer-clicked button (`event.detail > 0`, `src/main.js`); a new HUD button container joins that list.
Custom-select comboboxes are exempt: `src/custom-select.ts` closes its list on blur.
Dropdowns are hidden while racing; every return to racing (start, restart, resume) goes through `focusRace()`
(`src/race-navigation-ui.ts`), which blurs whatever the pause screen left focused. Guard:
`tests/hud-focus-browser.spec.js`.
