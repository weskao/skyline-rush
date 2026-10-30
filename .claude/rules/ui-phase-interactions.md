---
paths:
  - "src/main.js"
  - "src/App.vue"
  - "src/style.css"
  - "src/input.js"
  - "src/custom-select.ts"
  - "tests/result-actions-browser.spec.js"
  - "tests/tokyo-finish-controls-browser.spec.js"
  - "tests/*browser.spec.js"
---

# All phase-transition controls must remain operable

A race that finishes after steering, collisions, touch gestures, effects, retries or modal
interactions must still allow the user to operate **every visible enabled button**.
The finished screen, paused screen and ready screen are not exempt from input testing.

- Before changing overlay, backdrop, `z-index`, `inert`, `hidden`, `pointer-events`,
  focus handling, or pointer capture, inspect the *actual stacking order* and native
  modal top layer. CSS siblings with the same `z-index` are ordered by DOM position:
  an overlay rendered later can intercept clicks on an earlier language picker.
- Keep the global language/VFX tool row, topbar camera/restart and results controls
  above noninteractive decoration and below only intentionally blocking dialogs.
  An overlay must never intercept clicks intended for global controls.
- Stack order is results overlay 4 < `.aero-tools` 6 < `.topbar` 7 < `.perf-overlay` 8: the topbar's
  Controls/Audio dropdowns open over the tool row, so raising the tool row to or past the topbar
  covers "How to play" and the key bindings. Guards: `tests/guide-browser.spec.js`,
  `tests/device-quality-browser.spec.js` (real clicks fail on a wrong order).
- A restart/finish/pause must not leave a stale `<dialog open>`, inert ancestor,
  pointer capture, invisible full-screen clickable surface, or animation that traps
  interaction. Release active driving input and preserve keyboard, mouse, and touch.
- The frame loop requests its next frame **first** (`frame()` in `src/main.js`). A frame that
  throws after the finish once froze the picture and made every button look dead until a reload,
  because the next frame was only requested after the whole frame succeeded. Never move the
  request back to the end or swallow the error; guard: `tests/finish-frame-recovery-browser.spec.js`.
- Test a **real** browser sequence on every affected track: drive, deliberately collide
  more than once, finish, use the camera button, switch languages, select Next where
  unlocked, retry, and verify the next race starts. Repeat on desktop and phone
  portrait/landscape. Check actual clicks (not `.click()` dispatched from JS),
  `document.elementFromPoint` and `pageerror`.
- Verify via Playwright along with `npm test` and `npm run build`. For visible
  buttons, ensure user activation changes state, not merely that the element is present.
  Collect real screenshots of the finished UI and identify any browser/device not tested.

Scope: all routes, including Tokyo (東京夜行) and Sky Spiral. Do not fix a blocked
control by disabling the overlay entirely, suppressing errors, or bypassing
event propagation without proving the cause.
