---
paths:
  - "src/dialog-navigation.ts"
  - "src/*Panel.vue"
  - "src/*Viewer.vue"
  - "src/*-dialog-ui.ts"
  - "src/*-ui.ts"
  - "tests/dialog-exit-hold-browser.spec.js"
  - "tests/dialog-exit-animation.test.js"
---

# A dialog's exit animation holds its last frame until the dialog closes

Closing an enlarged What's New picture or clip flashed: the view faded out, was painted again at
full opacity for at least one frame, then vanished, so the home screen and its track map blinked
through. History did the same. The gap is one frame on desktop Chromium and longer wherever
`history.back()` is slow (phones).

Cause: `dialogNavigation().close()` does not close the dialog. It calls `history.back()` and the
dialog closes on the later `popstate`. An `element.animate()` without `fill` drops its effect the
moment it finishes, so between `finished` and `popstate` the still-open dialog is painted with its
normal styles again.

- Fade a dialog out with `navigation.leave(keyframes, options, backdrop?)` from
  `src/dialog-navigation.ts`. It plays the animation with `fill: 'forwards'`, closes when it
  finishes, and cancels it on the dialog's `close` event so the next open starts clean. Pass
  `backdrop = true` to run the same keyframes on `::backdrop`.
- Never write `dialog.animate(...).finished.then(() => navigation.close())`, and never keep a
  per-dialog `closing` flag: `leave` ignores a second call while one is running.
- Reduced or calm motion skips the animation and calls `navigation.close()` directly.
- The same trap applies to any hide that is deferred past the animation's last frame (a timer, a
  route change, a network reply). A hide done in the `finished` microtask itself
  (`leaveIntro`, `#race-wipe` in `src/main.js`) paints nothing in between and needs no fill.
- A dialog that gains an exit animation gets a case in `tests/dialog-exit-hold-browser.spec.js`
  (opacity is still 0 when `close()` runs, no frame repaints it, it reopens at opacity 1).
  `tests/dialog-exit-animation.test.js` rejects `.finished` in any file that opens a dialog.
