---
paths:
  - "src/style.css"
  - "src/pickup-fuel-cue.ts"
  - "src/RaceOverlay.vue"
  - "tests/i18n-browser.spec.js"
---

# A child past its panel's edge widens the panel

A box can stay fully on screen and still overflow its panel. The i18n audit
(`tests/i18n-browser.spec.js`, `layoutProblems`) flags any HUD or overlay panel whose `scrollWidth` exceeds
its `clientWidth`. A viewport-only check ("in view") never catches this.

Trap (2026-11-18, phone 390×844):
- **`.telemetry 358>344`.** The pickup "+N" (`.fuel-gain`, from `src/pickup-fuel-cue.ts`) sat at
  `left: calc(100% + 3px)` of the fuel reading. That reading is flush with the telemetry's right edge, so
  the cue hung 20 px outside the HUD.
- **`.overlay-content 366>358`.** The phone-portrait results action dock (`.overlay-buttons`, sticky) used
  `margin: 8px -8px 0`. That bled 8 px past both sides of the results column.

- **Anchor decoration inside the panel.** Put a badge or cue beside an edge-flush element on the side that
  faces into the panel, or above or below it: `.fuel-gain` now uses `right: 0; bottom: calc(100% + 1px)`.
  Never use a negative inline margin to make a child full-bleed. Give the panel the padding instead, or
  let the child keep the panel's width.
- **Every panel the audit lists counts**, not just these two: `.telemetry`, `.overlay-content` and the
  rest of the `PANELS` selectors in the i18n spec. On a phone they have no slack: phone telemetry content
  measures exactly its 344 px box.
- **Guards** (RED on the old CSS):
  - `insideHud` in `tests/pickup-feedback-browser.spec.js`, on desktop, phone portrait, phone landscape
    and Reduced Motion.
  - `columnFits` in `tests/wave3-demo-results-layout-browser.spec.js`, at every results viewport.
  - A new cue or dock on a panel adds the same `scrollWidth <= clientWidth` check to its own spec.
    The i18n flow hits a pickup cue only by chance, so it is not a reliable guard.
