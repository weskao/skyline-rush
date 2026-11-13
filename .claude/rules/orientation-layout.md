---
paths:
  - "src/style.css"
  - "src/wave3-demo-results.css"
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

- **Wave 3 results stay out of the landscape overlay flow.** The extra mission/result card must
  not push Race Again, Next, History or Cloud Sign in below the viewport. Keep the card
  independently bounded and preserve `tests/overlay-landscape-fit-browser.spec.js` at
  667×375, 740×360, 844×390, 932×430 and a foldable viewport; the RED regression was
  43–100px of unwanted `#race-overlay` scrolling in CI run 42811323467.

- **Wave 3 post-race rewards must not jump between coordinate systems.** `enter(.overlay-content)` animates `transform`, making `position: fixed` descendants resolve against the animated parent before snapping back to the viewport. Keep `.wave3-demo-results` in the normal `.overlay-summary` flow; short landscape uses an accessible compact summary rather than a floating toast. Protect the regression with `tests/wave3-demo-results.test.js`, `tests/wave3-demo-results-layout-browser.spec.js`, and `tests/overlay-landscape-fit-browser.spec.js`.

- **Wave 3 reward card shows every line; no height cap.** A `max-height` + `overflow` on
  `.wave3-demo-results` cut mission progress and fine print on desktop/tablet (2026-11-13). Short
  landscape has zero spare height, so the strip stays one line and a 詳情 tap raises the details as
  an absolute panel over the summary column (card is `position: relative`, never `fixed`). The tap
  listener sits on the card, not a stretched `::before` on the button: `button.is-pressed` applies
  `filter`, which makes the button the pseudo's containing block mid-tap and the click misses.
  Guard: `tests/wave3-demo-results-layout-browser.spec.js` (zh-TW, `clipped()` per viewport).
