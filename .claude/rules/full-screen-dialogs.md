---
paths:
  - "src/GaragePanel.vue"
  - "src/garage-ui.ts"
  - "src/App.vue"
  - "src/style.css"
  - "src/*Panel.vue"
  - "src/*-dialog-ui.ts"
  - "tests/garage-covers-home-browser.spec.js"
---

# A full-screen dialog stops rendering what it covers

On the iPhone Home Screen app, the home screen (START RACE, Garage button) flashed through the
full-screen Garage and Preview Studio every few seconds. The covered home kept rendering its
infinite CSS animations (`start-sheen`, `garage-highlight`, `garage-new-pop`, `.track-preview`,
speed streaks). WebKit could present those composited layers over the top-layer `<dialog>`.
Desktop Chromium/WebKit never showed it, so "it looks fine on desktop" proves nothing.

- A dialog that covers the whole viewport (`#garage-screen`; Home and Studio are one dialog)
  hides every non-dialog sibling under `#app` **and their descendants** with
  `visibility: hidden !important` while it is `[open]` (rule at the top of `GaragePanel.vue`'s
  `<style>`). Descendants count: `.brand` (short landscape) and airflow `#start-button` set their
  own `visibility: visible`, which beats inherited hiding.
- Use `visibility`, not `display: none`: layout, ResizeObservers, route maps and track-swipe
  canvases must not see a 0-size home, and `#garage-button` must regain focus on close.
- Never hide another `<dialog>`: one may stack over the full-screen one.
- A new full-screen dialog (or a new `visibility: visible` override inside the home) extends
  `tests/garage-covers-home-browser.spec.js`: no animation target outside the dialog stays visible
  while it is open, on Home and Studio, at 390×844, 844×390 and 1440×900. After a real close
  click, START RACE is visible and starts a race.
- Centered dialogs with a see-through backdrop (History, Guide, What's New) intentionally show the
  dimmed home; this rule applies only to full-viewport dialogs.
