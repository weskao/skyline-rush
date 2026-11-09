---
paths:
  - "src/style.css"
  - "src/App.vue"
  - "tests/responsive-browser.spec.js"
  - "tests/*layout*"
---

# Portrait and landscape are two layouts; iOS WebKit paints them differently

On iPhone landscape (Chrome, 743×340, 2026-11-09) START RACE, Daily and the camera dock had
their place and took taps but were never painted. iOS WebKit clips a `position: fixed` box to
an overflow scroller when that scroller, or a `sticky` box inside it, is the box's nearest
stacking context; hit-testing ignores the clip. Desktop Chromium/WebKit and portrait on the
same phone looked fine, so neither proves anything about landscape (fix: `65b73d30`).

- **No stacking context between a fixed rail and the viewport inside a scroller.** Between
  `#start-button`, `#daily-card`, `#showcase-camera-dock` and their nearest `fixed` ancestor,
  no ancestor may be `sticky`, or positioned with a `z-index`, while it sits in an
  `overflow: auto|scroll` element. Landscape `.intro` scrolls, so it keeps `z-index: auto`; the
  pinned Garage/History/Practice row is `fixed`, not `sticky` (the panel keeps bottom padding so
  the Rules row scrolls clear).
- **No ancestor of the rail animates.** A running `opacity`/`transform` animation or transition
  makes the ancestor a stacking context for its duration, and the rail is painted into that
  clipped layer. Landscape has no arrival fade for this reason.
- **Both orientations, every time.** A change to a landscape media query
  (`(orientation: landscape)`, `max-height: 500px` / `380px`), to `.intro`, the pinned row, or
  anything `fixed`/`sticky` on the home is checked in portrait and landscape, and a new
  `fixed`/`sticky` home element is added to the paint guards in
  `tests/responsive-browser.spec.js` (743×340, 756×265, 844×390). Those guards are RED on the old
  CSS; keep them that way rather than relaxing them.
- **Reproduce on iOS before claiming fixed.** A paint bug that only WebKit on iOS shows needs an
  iOS simulator or a device in that orientation (`make phone-diag`), not a desktop viewport of
  the same size.
